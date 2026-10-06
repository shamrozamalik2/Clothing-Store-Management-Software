'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { makeCompany, makeProduct } = require('./helpers');

const Product = require('../src/models/Product');
const Company = require('../src/models/Company');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const { setupBarcodes } = require('../src/database/barcode-setup');
const featureSvc = require('../src/services/features.service');
const barcodes = require('../src/services/barcode.service');

const VALID_GTIN = '5449000000996';

const companyToken = (companyId) =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), companyId: companyId.toString(), role: 'admin' }, process.env.JWT_SECRET);

describe('barcodes', () => {
  let server, base;

  before(async () => {
    await startDb();
    await Product.init();
    const app = require('../src/app');
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
    await setupBusinessCategories();
    featureSvc.invalidateAll();
  });

  const call = (method, path, token, body) => fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Clothing has EXTERNAL_BARCODE off by default; these companies turn it on explicitly.
  const externalOn = (slug) => makeCompany({ slug, features: { EXTERNAL_BARCODE: true } });

  describe('format and check digit', () => {
    it('accepts a valid GS1 code and rejects a bad check digit', async () => {
      const co = await externalOn('gtin-co');
      assert.equal(await barcodes.prepareExternalBarcode(co._id, VALID_GTIN), VALID_GTIN);
      await assert.rejects(
        () => barcodes.prepareExternalBarcode(co._id, '5449000000997'),
        e => e.status === 422 && /check digit/.test(e.message)
      );
    });

    it('trims input, and treats blank input as clearing the barcode', async () => {
      const co = await externalOn('trim-co');
      assert.equal(await barcodes.prepareExternalBarcode(co._id, `  ${VALID_GTIN}  `), VALID_GTIN);
      assert.equal(await barcodes.prepareExternalBarcode(co._id, '5 449000 000996'), VALID_GTIN, 'spaces inside a typed code are dropped');
      assert.equal(await barcodes.prepareExternalBarcode(co._id, '   '), null);
      assert.equal(await barcodes.prepareExternalBarcode(co._id, undefined), null);
    });

    it('refuses malformed codes and PBC- codes typed by hand', async () => {
      const co = await externalOn('format-co');
      await assert.rejects(() => barcodes.prepareExternalBarcode(co._id, 'ab'), e => e.status === 422);
      await assert.rejects(() => barcodes.prepareExternalBarcode(co._id, 'AB CD-12'), e => e.status === 422);
      await assert.rejects(
        () => barcodes.prepareExternalBarcode(co._id, 'PBC-000001'),
        e => e.status === 422 && /Use Generate/.test(e.message)
      );
    });

    it('refuses an external barcode when the company has EXTERNAL_BARCODE off', async () => {
      const clothing = await makeCompany({ slug: 'no-external' });
      await assert.rejects(
        () => barcodes.prepareExternalBarcode(clothing._id, VALID_GTIN),
        e => e.status === 403 && e.code === 'FEATURE_DISABLED' && e.feature === 'EXTERNAL_BARCODE'
      );
    });
  });

  describe('internal PBC codes', () => {
    it('issues PBC-000001, PBC-000002 in order, with a separate sequence per company', async () => {
      const a = await makeCompany({ slug: 'seq-a' });
      const b = await makeCompany({ slug: 'seq-b' });
      const p1 = await makeProduct(a._id);
      const p2 = await makeProduct(a._id);
      const q1 = await makeProduct(b._id);
      assert.equal(await barcodes.assignInternalBarcode(a._id, { productId: p1._id }), 'PBC-000001');
      assert.equal(await barcodes.assignInternalBarcode(a._id, { productId: p2._id }), 'PBC-000002');
      assert.equal(await barcodes.assignInternalBarcode(b._id, { productId: q1._id }), 'PBC-000001');
    });

    it('gives every simultaneous request a different code', async () => {
      const co = await makeCompany({ slug: 'race-co' });
      const products = await Promise.all(Array.from({ length: 10 }, () => makeProduct(co._id)));
      const codes = await Promise.all(products.map(p => barcodes.assignInternalBarcode(co._id, { productId: p._id })));
      assert.equal(new Set(codes).size, 10);
    });

    it('skips a number already in use', async () => {
      const co = await makeCompany({ slug: 'skip-co' });
      await makeProduct(co._id, { barcode: 'PBC-000001', barcode_type: 'internal' });
      const fresh = await makeProduct(co._id);
      assert.equal(await barcodes.assignInternalBarcode(co._id, { productId: fresh._id }), 'PBC-000002');
    });

    it('never replaces an existing barcode', async () => {
      const co = await makeCompany({ slug: 'keep-co' });
      const p = await makeProduct(co._id, { barcode: VALID_GTIN, barcode_type: 'external' });
      await assert.rejects(
        () => barcodes.assignInternalBarcode(co._id, { productId: p._id }),
        e => e.status === 409
      );
      assert.equal((await Product.findById(p._id).lean()).barcode, VALID_GTIN);
    });
  });

  describe('uniqueness across products and variants', () => {
    it('blocks a barcode already used by another product in the same company', async () => {
      const co = await externalOn('dup-co');
      const p1 = await makeProduct(co._id, { barcode: VALID_GTIN, barcode_type: 'external' });
      const p2 = await makeProduct(co._id);
      await assert.rejects(
        () => barcodes.prepareExternalBarcode(co._id, VALID_GTIN, { excludeProductId: p2._id }),
        e => e.status === 409
      );
      assert.equal(await barcodes.prepareExternalBarcode(co._id, VALID_GTIN, { excludeProductId: p1._id }), VALID_GTIN);
    });

    it('allows the same barcode in a different company', async () => {
      const a = await externalOn('tenant-a');
      const b = await externalOn('tenant-b');
      await makeProduct(a._id, { barcode: VALID_GTIN, barcode_type: 'external' });
      assert.equal(await barcodes.prepareExternalBarcode(b._id, VALID_GTIN), VALID_GTIN);
    });

    it('blocks a variant barcode that matches a product barcode, in either direction', async () => {
      const co = await externalOn('cross-co');
      await makeProduct(co._id, { barcode: VALID_GTIN, barcode_type: 'external' });
      await makeProduct(co._id, {
        variants: [{ company_id: co._id, sku: 'V-1', barcode: 'VAR-0001' }],
      });
      await assert.rejects(() => barcodes.prepareExternalBarcode(co._id, VALID_GTIN), e => e.status === 409);
      await assert.rejects(() => barcodes.prepareExternalBarcode(co._id, 'VAR-0001'), e => e.status === 409);
    });

    it('database rejects a duplicate product barcode even if the check is bypassed', async () => {
      const co = await makeCompany({ slug: 'index-co' });
      await makeProduct(co._id, { barcode: 'DUP-1234' });
      await assert.rejects(() => makeProduct(co._id, { barcode: 'DUP-1234' }), e => e.code === 11000);
    });
  });

  describe('HTTP: feature rules and tenant isolation', () => {
    it('a clothing company can generate an internal barcode', async () => {
      const co = await makeCompany({ slug: 'http-internal' });
      const p = await makeProduct(co._id);
      const r = await call('POST', `/products/${p._id}/barcode/internal`, companyToken(co._id));
      assert.equal(r.status, 200);
      const body = await r.json();
      assert.equal(body.data.barcode, 'PBC-000001');
      assert.equal(body.data.barcode_type, 'internal');
    });

    it('a clothing company cannot save a manufacturer barcode', async () => {
      const co = await makeCompany({ slug: 'http-external-off' });
      const p = await makeProduct(co._id);
      const r = await call('PATCH', `/products/${p._id}/barcode`, companyToken(co._id), { barcode: VALID_GTIN });
      assert.equal(r.status, 403);
      const body = await r.json();
      assert.equal(body.code, 'FEATURE_DISABLED');
      assert.equal(body.feature, 'EXTERNAL_BARCODE');
      assert.equal((await Product.findById(p._id).lean()).barcode, undefined);
    });

    it('clearing an existing barcode works even when EXTERNAL_BARCODE is off', async () => {
      const co = await makeCompany({ slug: 'http-clear' });
      const p = await makeProduct(co._id, { barcode: VALID_GTIN, barcode_type: 'external' });
      const r = await call('PATCH', `/products/${p._id}/barcode`, companyToken(co._id), { barcode: '' });
      assert.equal(r.status, 200);
      assert.equal((await Product.findById(p._id).lean()).barcode, null);
    });

    it('refuses generation when INTERNAL_BARCODE is off for the company', async () => {
      const co = await makeCompany({ slug: 'http-internal-off', features: { INTERNAL_BARCODE: false } });
      const p = await makeProduct(co._id);
      const r = await call('POST', `/products/${p._id}/barcode/internal`, companyToken(co._id));
      assert.equal(r.status, 403);
      assert.equal((await r.json()).code, 'FEATURE_DISABLED');
    });

    it('refuses barcode lookup when BARCODE is off for the company', async () => {
      const co = await makeCompany({ slug: 'http-barcode-off', features: { BARCODE: false } });
      const r = await call('GET', '/products/barcode/PBC-000001', companyToken(co._id));
      assert.equal(r.status, 403);
      assert.equal((await r.json()).code, 'FEATURE_DISABLED');
    });

    it('barcode lookup never returns another company’s product', async () => {
      const a = await makeCompany({ slug: 'iso-lookup-a' });
      const b = await makeCompany({ slug: 'iso-lookup-b' });
      const p = await makeProduct(a._id);
      await call('POST', `/products/${p._id}/barcode/internal`, companyToken(a._id));
      const own = await call('GET', '/products/barcode/PBC-000001', companyToken(a._id));
      assert.equal(own.status, 200);
      const other = await call('GET', '/products/barcode/PBC-000001', companyToken(b._id));
      assert.equal(other.status, 404);
    });

    it('generating for another company’s product is refused', async () => {
      const a = await makeCompany({ slug: 'iso-gen-a' });
      const b = await makeCompany({ slug: 'iso-gen-b' });
      const p = await makeProduct(a._id);
      const r = await call('POST', `/products/${p._id}/barcode/internal`, companyToken(b._id));
      assert.equal(r.status, 404);
      assert.equal((await Product.findById(p._id).lean()).barcode, undefined);
    });
  });

  describe('HTTP: variants', () => {
    it('generates an internal code for a variant and leaves the product barcode alone', async () => {
      const co = await makeCompany({ slug: 'var-internal' });
      const p = await makeProduct(co._id, {
        variants: [{ company_id: co._id, sku: 'TS-BLK-M', size: 'M', color: 'Black' }],
      });
      const variantId = String(p.variants[0]._id);
      const r = await call('POST', `/products/${p._id}/variants/${variantId}/barcode/internal`, companyToken(co._id));
      assert.equal(r.status, 200);
      assert.equal((await r.json()).data.barcode, 'PBC-000001');

      const stored = await Product.findById(p._id).lean();
      assert.equal(stored.variants[0].barcode, 'PBC-000001');
      assert.equal(stored.variants[0].barcode_type, 'internal');
      assert.equal(stored.barcode, undefined);
    });

    it('PUT on a variant updates it instead of adding a new one', async () => {
      const co = await makeCompany({ slug: 'var-put' });
      const p = await makeProduct(co._id, {
        variants: [{ company_id: co._id, sku: 'TS-WHT-L', size: 'L', color: 'White', sale_price: 1000 }],
      });
      const variantId = String(p.variants[0]._id);
      const r = await call('PUT', `/products/${p._id}/variants/${variantId}`, companyToken(co._id), { sale_price: 2500 });
      assert.equal(r.status, 200);
      const stored = await Product.findById(p._id).lean();
      assert.equal(stored.variants.length, 1);
      assert.equal(stored.variants[0].sale_price, 2500);
    });
  });

  describe('setup script for existing data', () => {
    after(async () => {
      try { await Product.createIndexes(); } catch { /* indexes already in place */ }
    });

    it('stops without writing when a barcode is used twice in one company', async () => {
      await Product.collection.dropIndex('uniq_company_product_barcode');
      const co = await makeCompany({ slug: 'setup-dup' });
      await makeProduct(co._id, { barcode: 'DUP-9999' });
      await makeProduct(co._id, { barcode: 'DUP-9999' });

      const dry = await setupBarcodes({ dryRun: true });
      assert.equal(dry.blocked, true);
      assert.equal(dry.duplicates, 1);

      const real = await setupBarcodes();
      assert.equal(real.blocked, true);
      const indexes = (await Product.collection.indexes()).map(i => i.name);
      assert.ok(!indexes.includes('uniq_company_product_barcode'), 'no index built while blocked');
      assert.equal((await Product.countDocuments({ barcode_type: 'external' })), 0);
    });

    it('types existing barcodes, grandfathers EXTERNAL for a company that uses them, and is safe to re-run', async () => {
      // Recreate the old state: the legacy non-unique index and untyped barcodes.
      await Product.collection.dropIndex('uniq_company_product_barcode').catch(() => {});
      await Product.collection.dropIndex('uniq_company_variant_barcode').catch(() => {});
      await Product.collection.createIndex({ company_id: 1, barcode: 1 }, { sparse: true, name: 'company_id_1_barcode_1' });

      const used = await makeCompany({ slug: 'setup-used' });
      const unused = await makeCompany({ slug: 'setup-unused' });
      await makeProduct(used._id, { barcode: VALID_GTIN });
      await makeProduct(unused._id);
      featureSvc.invalidateAll();

      const first = await setupBarcodes();
      assert.equal(first.blocked, false);
      assert.equal(first.legacyIndexDropped, true);
      assert.equal(first.productBarcodesTyped, 1);
      assert.equal(first.companiesGrandfathered, 1);

      const indexes = (await Product.collection.indexes()).map(i => i.name);
      assert.ok(indexes.includes('uniq_company_product_barcode'));
      assert.ok(indexes.includes('uniq_company_variant_barcode'));
      assert.ok(!indexes.includes('company_id_1_barcode_1'));

      const stored = await Product.findOne({ barcode: VALID_GTIN }).lean();
      assert.equal(stored.barcode_type, 'external');
      assert.equal(stored.barcode, VALID_GTIN, 'existing barcode value is never changed');

      featureSvc.invalidateAll();
      assert.equal(await featureSvc.isFeatureEnabled(used._id, 'EXTERNAL_BARCODE'), true);
      assert.equal(await featureSvc.isFeatureEnabled(unused._id, 'EXTERNAL_BARCODE'), false);

      const second = await setupBarcodes();
      assert.equal(second.productBarcodesTyped, 0);
      assert.equal(second.companiesGrandfathered, 0);
    });
  });
});
