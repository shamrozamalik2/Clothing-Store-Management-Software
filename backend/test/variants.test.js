'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { makeCompany, makeProduct } = require('./helpers');

const Product = require('../src/models/Product');
const Sale    = require('../src/models/Sale');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const featureSvc = require('../src/services/features.service');

const companyToken = (companyId) =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), companyId: companyId.toString(), role: 'admin' }, process.env.JWT_SECRET);

describe('clothing variants', () => {
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

  const call = async (method, path, token, body) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  };

  // Clothing is the default category: VARIANTS, INTERNAL_BARCODE on; EXTERNAL_BARCODE off.
  const clothing = (slug, extra = {}) => makeCompany({ slug, ...extra });

  const shirt = (variants, extra = {}) => ({
    name: 'Men T-Shirt', sku: 'TSH', sale_price: 1000, cost_price: 600,
    variants, ...extra,
  });

  it('saves size and colour variants with their own SKUs, prices and stock', async () => {
    const co = await clothing('var-create');
    const r = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', sale_price: 1200, cost_price: 700, stock_quantity: 5 },
      { size: 'L', color: 'Black', sale_price: 1250, cost_price: 700, stock_quantity: 7 },
    ]));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const stored = await Product.findById(r.body.data.id || r.body.data._id).lean();
    assert.deepEqual(stored.variants.map(v => v.sku), ['TSH-BLACK-M', 'TSH-BLACK-L']);
    assert.deepEqual(stored.variants.map(v => v.sale_price), [1200, 1250]);
    assert.deepEqual(stored.variants.map(v => v.stock_quantity), [5, 7]);
  });

  it('gives each new variant an internal PBC barcode when the company uses them', async () => {
    const co = await clothing('var-internal');
    const r = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', stock_quantity: 1 },
      { size: 'L', color: 'Black', stock_quantity: 1 },
    ]));
    const stored = await Product.findById(r.body.data.id || r.body.data._id).lean();
    assert.deepEqual(stored.variants.map(v => v.barcode), ['PBC-000001', 'PBC-000002']);
    assert.ok(stored.variants.every(v => v.barcode_type === 'internal'));
  });

  it('a product with variants shows the total of its variants as stock', async () => {
    const co = await clothing('var-total');
    const r = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', stock_quantity: 5 },
      { size: 'L', color: 'White', stock_quantity: 7 },
    ]));
    const id = r.body.data.id || r.body.data._id;
    const one = await call('GET', `/products/${id}`, companyToken(co._id));
    assert.equal(one.body.data.stock_quantity, 12);
    assert.equal(one.body.data.stock_status, 'in_stock');

    const list = await call('GET', '/products?search=Men', companyToken(co._id));
    assert.equal(list.body.data.find(p => p.id === id).stock_quantity, 12);
  });

  it('refuses the same size and colour twice in one product', async () => {
    const co = await clothing('var-dup-combo');
    const r = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', stock_quantity: 1 },
      { size: 'm', color: 'black', stock_quantity: 1 },
    ]));
    assert.equal(r.status, 422);
    assert.match(r.body.message, /listed more than once/);
    assert.equal(await Product.countDocuments({ company_id: co._id }), 0);
  });

  it('refuses a variant without a size or a colour', async () => {
    const co = await clothing('var-blank');
    const r = await call('POST', '/products', companyToken(co._id), shirt([{ stock_quantity: 1 }]));
    assert.equal(r.status, 422);
    assert.match(r.body.message, /size or a colour/);
  });

  it('refuses a variant SKU that another product already uses', async () => {
    const co = await clothing('var-dup-sku');
    await call('POST', '/products', companyToken(co._id), {
      name: 'Other Shirt', sku: 'OTH', sale_price: 900,
      variants: [{ size: 'M', color: 'Black', sku: 'SHARED-SKU', stock_quantity: 1 }],
    });
    const r = await call('POST', '/products', companyToken(co._id), {
      name: 'Another Shirt', sku: 'ANO', sale_price: 900,
      variants: [{ size: 'M', color: 'Red', sku: 'SHARED-SKU', stock_quantity: 1 }],
    });
    assert.equal(r.status, 422);
    assert.match(r.body.message, /already used/);
  });

  it('a company without the VARIANTS module cannot add variants', async () => {
    const co = await makeCompany({ slug: 'no-variants-co', features: { VARIANTS: false } });
    const r = await call('POST', '/products', companyToken(co._id), shirt([{ size: 'M', stock_quantity: 1 }]));
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'FEATURE_DISABLED');
    assert.equal(r.body.feature, 'VARIANTS');
  });

  it('an update keeps existing stock, changes prices, and adds a new variant with a barcode', async () => {
    const co = await clothing('var-update');
    const created = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', sale_price: 1200, stock_quantity: 5 },
    ]));
    const id = created.body.data.id || created.body.data._id;
    const existing = (await Product.findById(id).lean()).variants[0];

    const r = await call('PUT', `/products/${id}`, companyToken(co._id), {
      variants: [
        { _id: String(existing._id), size: 'M', color: 'Black', sale_price: 1400, stock_quantity: 999 },
        { size: 'XL', color: 'Navy', sale_price: 1450, stock_quantity: 3 },
      ],
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const stored = await Product.findById(id).lean();
    assert.equal(stored.variants.length, 2);
    const kept = stored.variants.find(v => String(v._id) === String(existing._id));
    assert.equal(kept.sale_price, 1400);
    assert.equal(kept.stock_quantity, 5, 'stock on an existing variant only changes through stock adjustments');
    const added = stored.variants.find(v => v.size === 'XL');
    assert.equal(added.stock_quantity, 3);
    // The company's counter continues from the product created above, so the next code is 000002.
    assert.equal(added.barcode, 'PBC-000002');
  });

  it('an update that leaves a variant out removes it when it has no history', async () => {
    const co = await clothing('var-remove');
    const created = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', stock_quantity: 1 },
      { size: 'L', color: 'Black', stock_quantity: 1 },
    ]));
    const id = created.body.data.id || created.body.data._id;
    const keep = (await Product.findById(id).lean()).variants[0];

    const r = await call('PUT', `/products/${id}`, companyToken(co._id), {
      variants: [{ _id: String(keep._id), size: 'M', color: 'Black' }],
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await Product.findById(id).lean()).variants.length, 1);
  });

  it('a variant that has been sold cannot be removed', async () => {
    const co = await clothing('var-sold');
    const created = await call('POST', '/products', companyToken(co._id), shirt([
      { size: 'M', color: 'Black', stock_quantity: 4 },
      { size: 'L', color: 'Black', stock_quantity: 4 },
    ]));
    const id = created.body.data.id || created.body.data._id;
    const [mVariant, lVariant] = (await Product.findById(id).lean()).variants;

    const sale = await call('POST', '/sales', companyToken(co._id), {
      items: [{ product_id: id, variant_id: String(mVariant._id), quantity: 1, unit_price: 1200 }],
      payment_method: 'cash', paid_amount: 1200,
    });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    const r = await call('PUT', `/products/${id}`, companyToken(co._id), {
      variants: [{ _id: String(lVariant._id), size: 'L', color: 'Black' }],
    });
    assert.equal(r.status, 422);
    assert.match(r.body.message, /history/);
    assert.equal((await Product.findById(id).lean()).variants.length, 2, 'nothing changed');
  });

  it('a product saved before this change still loads and can be saved unchanged', async () => {
    const co = await clothing('var-legacy');
    const legacy = await makeProduct(co._id, {
      sku: 'LEG-1', stock_quantity: 100,
      variants: [{ company_id: co._id, sku: 'LEG-1-BLACK-M', size: 'M', color: 'Black', cost_price: 600, sale_price: 1000, stock_quantity: 40, is_active: true }],
    });
    const id = String(legacy._id);
    const got = await call('GET', `/products/${id}`, companyToken(co._id));
    assert.equal(got.status, 200);
    assert.equal(got.body.data.stock_quantity, 40, 'stock comes from the variants');

    const saved = await call('PUT', `/products/${id}`, companyToken(co._id), {
      variants: got.body.data.variants.map(v => ({ _id: String(v._id), size: v.size, color: v.color, sale_price: v.sale_price })),
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal((await Product.findById(id).lean()).variants[0].stock_quantity, 40);
  });
});
