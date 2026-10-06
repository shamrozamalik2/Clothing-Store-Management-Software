'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { makeCompany, makeProduct } = require('./helpers');

const Product    = require('../src/models/Product');
const StockBatch = require('../src/models/StockBatch');
const Setting    = require('../src/models/Setting');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const featureSvc = require('../src/services/features.service');
const stockBatch = require('../src/services/stockBatch.service');

const DAY = 86400000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY).toISOString();
const companyToken = (companyId) =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), companyId: companyId.toString(), role: 'admin' }, process.env.JWT_SECRET);

describe('batches and expiry', () => {
  let server, base;

  before(async () => {
    await startDb();
    await Product.init();
    await StockBatch.init();
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

  // Batch-enabled company: BATCH_TRACKING and EXPIRY on.
  const batchCompany = (slug, extra = {}) =>
    makeCompany({ slug, features: { BATCH_TRACKING: true, EXPIRY: true, ...extra } });

  const flaggedProduct = (co, extra = {}) =>
    makeProduct(co._id, { track_batches: true, track_inventory: true, allow_negative: false, stock_quantity: 0, ...extra });

  // Receives stock through a received purchase, one line per lot.
  async function receive(co, product, lots) {
    const r = await call('POST', '/purchases', companyToken(co._id), {
      status: 'received',
      paid_amount: 0,
      items: lots.map(l => ({
        product_id: String(product._id),
        quantity: l.quantity,
        unit_cost: 10,
        batch_no: l.batch_no ?? null,
        expiry_date: l.expiry_days === undefined ? undefined : daysFromNow(l.expiry_days),
      })),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.data;
  }

  async function sell(co, product, qty, price = 100) {
    const r = await call('POST', '/sales', companyToken(co._id), {
      items: [{ product_id: String(product._id), quantity: qty, unit_price: price }],
      payment_method: 'cash',
      paid_amount: qty * price,
    });
    return r;
  }

  const lotsOf = async (productId) => {
    const rows = await StockBatch.find({ product_id: productId }).lean();
    return Object.fromEntries(rows.map(r => [r.batch_no ?? 'unlabelled', r.quantity]));
  };

  const stockOf = async (productId) => (await Product.findById(productId).lean()).stock_quantity;

  // The invariant the whole design relies on: lots add up to the product's stock.
  const assertInStep = async (productId) => {
    const rows = await StockBatch.find({ product_id: productId }).lean();
    const total = rows.reduce((s, r) => s + r.quantity, 0);
    assert.equal(total, await stockOf(productId), 'lots must add up to the product stock');
  };

  describe('FEFO and sales', () => {
    it('sells the earliest-expiring lot first and records which lots it took from', async () => {
      const co = await batchCompany('fefo-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 40, batch_no: 'B', expiry_days: 90 },
        { quantity: 20, batch_no: 'A', expiry_days: 20 },
      ]);

      const r = await sell(co, p, 15);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.deepEqual(await lotsOf(p._id), { A: 5, B: 40 });

      const line = r.body.data.items[0];
      assert.equal(line.batch_allocations.length, 1);
      assert.equal(line.batch_allocations[0].batch_no, 'A');
      assert.equal(line.batch_allocations[0].quantity, 15);
      await assertInStep(p._id);
    });

    it('spills into the next lot when the first runs out', async () => {
      const co = await batchCompany('spill-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 40, batch_no: 'B', expiry_days: 90 },
        { quantity: 20, batch_no: 'A', expiry_days: 20 },
      ]);

      const r = await sell(co, p, 25);
      assert.equal(r.status, 201);
      assert.deepEqual(await lotsOf(p._id), { A: 0, B: 35 });
      assert.deepEqual(r.body.data.items[0].batch_allocations.map(a => [a.batch_no, a.quantity]), [['A', 20], ['B', 5]]);
      await assertInStep(p._id);
    });

    it('never sells expired stock, and refuses when only expired stock is left', async () => {
      const co = await batchCompany('expired-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 10, batch_no: 'OLD', expiry_days: -2 },
        { quantity: 5,  batch_no: 'NEW', expiry_days: 30 },
      ]);

      const refused = await sell(co, p, 8);
      assert.equal(refused.status, 422);
      assert.match(refused.body.message, /Expired stock cannot be sold/);
      assert.equal(await stockOf(p._id), 15, 'a refused sale changes nothing');
      assert.deepEqual(await lotsOf(p._id), { OLD: 10, NEW: 5 });

      const ok = await sell(co, p, 5);
      assert.equal(ok.status, 201);
      assert.deepEqual(await lotsOf(p._id), { OLD: 10, NEW: 0 });
      await assertInStep(p._id);
    });

    it('refuses a sale larger than the unexpired batches, with nothing deducted', async () => {
      const co = await batchCompany('short-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [{ quantity: 10, batch_no: 'A', expiry_days: 30 }]);

      const r = await sell(co, p, 11);
      assert.equal(r.status, 422);
      assert.deepEqual(await lotsOf(p._id), { A: 10 });
      assert.equal(await stockOf(p._id), 10);
    });

    it('a non-batch product sells as before and records no allocations', async () => {
      const co = await batchCompany('plain-co');
      const p  = await makeProduct(co._id, { stock_quantity: 10 });
      const r  = await sell(co, p, 3);
      assert.equal(r.status, 201);
      assert.deepEqual(r.body.data.items[0].batch_allocations, []);
      assert.equal(await StockBatch.countDocuments({ product_id: p._id }), 0);
      assert.equal(await stockOf(p._id), 7);
    });
  });

  describe('voids and returns put units back into their own lots', () => {
    it('a void restores each lot exactly what the sale took from it', async () => {
      const co = await batchCompany('void-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 40, batch_no: 'B', expiry_days: 90 },
        { quantity: 20, batch_no: 'A', expiry_days: 20 },
      ]);
      const sale = await sell(co, p, 25);
      assert.deepEqual(await lotsOf(p._id), { A: 0, B: 35 });

      const v = await call('PATCH', `/sales/${sale.body.data.id}/void`, companyToken(co._id));
      assert.equal(v.status, 200, JSON.stringify(v.body));
      assert.deepEqual(await lotsOf(p._id), { A: 20, B: 40 });
      assert.equal(await stockOf(p._id), 60);
      await assertInStep(p._id);
    });

    it('a return then a void never restores the same units twice', async () => {
      const co = await batchCompany('return-void-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 40, batch_no: 'B', expiry_days: 90 },
        { quantity: 20, batch_no: 'A', expiry_days: 20 },
      ]);
      const sale = await sell(co, p, 25);
      const lineId = sale.body.data.items[0]._id;

      const ret = await call('POST', '/returns', companyToken(co._id), {
        sale_id: sale.body.data.id,
        type: 'return',
        refund_method: 'cash',
        return_items: [{ sale_item_id: lineId, quantity: 5 }],
      });
      assert.equal(ret.status, 201, JSON.stringify(ret.body));
      assert.deepEqual(await lotsOf(p._id), { A: 5, B: 35 }, 'return goes back to the first lot the line took from');
      await assertInStep(p._id);

      const v = await call('PATCH', `/sales/${sale.body.data.id}/void`, companyToken(co._id));
      assert.equal(v.status, 200, JSON.stringify(v.body));
      assert.deepEqual(await lotsOf(p._id), { A: 20, B: 40 });
      assert.equal(await stockOf(p._id), 60);
      await assertInStep(p._id);
    });
  });

  describe('purchases and un-receiving', () => {
    it('refuses to un-receive units that have already been sold, and changes nothing', async () => {
      const co = await batchCompany('unrecv-co');
      const p  = await flaggedProduct(co);
      const purchase = await receive(co, p, [{ quantity: 40, batch_no: 'A', expiry_days: 60 }]);
      await sell(co, p, 10);

      const r = await call('PATCH', `/purchases/${purchase.id}/status`, companyToken(co._id), { status: 'ordered' });
      assert.equal(r.status, 422);
      assert.match(r.body.message, /already been sold/);
      assert.deepEqual(await lotsOf(p._id), { A: 30 });
      assert.equal(await stockOf(p._id), 30);
    });

    it('un-receiving unsold units takes them back out of the lot', async () => {
      const co = await batchCompany('unrecv-ok-co');
      const p  = await flaggedProduct(co);
      const purchase = await receive(co, p, [{ quantity: 40, batch_no: 'A', expiry_days: 60 }]);

      const r = await call('PATCH', `/purchases/${purchase.id}/status`, companyToken(co._id), { status: 'ordered' });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(await lotsOf(p._id), { A: 0 });
      assert.equal(await stockOf(p._id), 0);
    });

    it('refuses an expiry date when the EXPIRY module is off', async () => {
      const co = await makeCompany({ slug: 'no-expiry-co', features: { BATCH_TRACKING: true, EXPIRY: false } });
      const p  = await flaggedProduct(co);
      const r = await call('POST', '/purchases', companyToken(co._id), {
        status: 'received', paid_amount: 0,
        items: [{ product_id: String(p._id), quantity: 5, unit_cost: 10, batch_no: 'X', expiry_date: daysFromNow(30) }],
      });
      assert.equal(r.status, 403);
      assert.equal(await stockOf(p._id), 0);
    });

    it('requires an expiry date on batch lines when EXPIRY is on', async () => {
      const co = await batchCompany('need-expiry-co');
      const p  = await flaggedProduct(co);
      const r = await call('POST', '/purchases', companyToken(co._id), {
        status: 'received', paid_amount: 0,
        items: [{ product_id: String(p._id), quantity: 5, unit_cost: 10, batch_no: 'X' }],
      });
      assert.equal(r.status, 422);
      assert.match(r.body.message, /Expiry date is required/);
    });
  });

  describe('stock adjustments and direct edits', () => {
    it('a write-off takes expired stock first and keeps the lots in step', async () => {
      const co = await batchCompany('writeoff-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 5,  batch_no: 'OLD', expiry_days: -5 },
        { quantity: 10, batch_no: 'NEW', expiry_days: 30 },
      ]);

      const r = await call('POST', '/stock-adjustments', companyToken(co._id), {
        type: 'damage', reason: 'breakage', items: [{ product_id: String(p._id), quantity: -5 }],
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.deepEqual(await lotsOf(p._id), { OLD: 0, NEW: 10 });
      assert.equal(await stockOf(p._id), 10);
      await assertInStep(p._id);
    });

    it('turning batch tracking on creates one lot for the existing stock', async () => {
      const co = await batchCompany('flagon-co');
      const p  = await makeProduct(co._id, { track_inventory: true, allow_negative: false, stock_quantity: 12 });

      const r = await call('PUT', `/products/${p._id}`, companyToken(co._id), { track_batches: true });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(await lotsOf(p._id), { unlabelled: 12 });
      await assertInStep(p._id);
    });

    it('turning batch tracking off is refused while lots hold stock', async () => {
      const co = await batchCompany('flagoff-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [{ quantity: 4, batch_no: 'A', expiry_days: 10 }]);

      const r = await call('PUT', `/products/${p._id}`, companyToken(co._id), { track_batches: false });
      assert.equal(r.status, 422);
      assert.equal((await Product.findById(p._id).lean()).track_batches, true);
    });

    it('turning batch tracking on needs the BATCH_TRACKING module', async () => {
      const co = await makeCompany({ slug: 'no-batch-co', features: { BATCH_TRACKING: false } });
      const p  = await makeProduct(co._id, { track_inventory: true, allow_negative: false, stock_quantity: 3 });
      const r  = await call('PUT', `/products/${p._id}`, companyToken(co._id), { track_batches: true });
      assert.equal(r.status, 403);
      assert.equal((await Product.findById(p._id).lean()).track_batches, false);
    });

    it('a direct stock edit on a batch product moves the lots by the same amount', async () => {
      const co = await batchCompany('edit-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [{ quantity: 10, batch_no: 'A', expiry_days: 30 }]);

      const r = await call('PUT', `/products/${p._id}`, companyToken(co._id), { stock_quantity: 14 });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(await stockOf(p._id), 14);
      await assertInStep(p._id);
    });
  });

  describe('expiry alerts', () => {
    it('groups lots into expired, expires today, and expires soon, inside the warning window only', async () => {
      const co = await batchCompany('alerts-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [
        { quantity: 3, batch_no: 'EXP',   expiry_days: -2 },
        { quantity: 4, batch_no: 'TODAY', expiry_days: 0 },
        { quantity: 5, batch_no: 'SOON',  expiry_days: 10 },
        { quantity: 6, batch_no: 'LATER', expiry_days: 45 },
      ]);

      const r = await call('GET', '/products/expiry-alerts', companyToken(co._id));
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.data.warning_days, 30);
      assert.deepEqual(r.body.data.expired.map(x => x.batch_no), ['EXP']);
      assert.deepEqual(r.body.data.expires_today.map(x => x.batch_no), ['TODAY']);
      assert.deepEqual(r.body.data.expires_soon.map(x => x.batch_no), ['SOON']);
    });

    it('the warning window comes from the company setting', async () => {
      const co = await batchCompany('window-co');
      const p  = await flaggedProduct(co);
      await receive(co, p, [{ quantity: 6, batch_no: 'LATER', expiry_days: 45 }]);
      await Setting.create({ company_id: co._id, key: 'expiry_warning_days', value: '60' });

      const r = await call('GET', '/products/expiry-alerts', companyToken(co._id));
      assert.equal(r.body.data.warning_days, 60);
      assert.deepEqual(r.body.data.expires_soon.map(x => x.batch_no), ['LATER']);
    });

    it('is refused when the EXPIRY module is off', async () => {
      const co = await makeCompany({ slug: 'alerts-off-co', features: { EXPIRY: false } });
      const r  = await call('GET', '/products/expiry-alerts', companyToken(co._id));
      assert.equal(r.status, 403);
      assert.equal(r.body.code, 'FEATURE_DISABLED');
    });
  });

  describe('guards on batch products', () => {
    it('refuses negative stock or switching inventory tracking off', async () => {
      const co = await batchCompany('guard-co');
      const p  = await flaggedProduct(co);
      const neg = await call('PUT', `/products/${p._id}`, companyToken(co._id), { allow_negative: true });
      assert.equal(neg.status, 422);
      const noTrack = await call('PUT', `/products/${p._id}`, companyToken(co._id), { track_inventory: false });
      assert.equal(noTrack.status, 422);
      const after = await Product.findById(p._id).lean();
      assert.equal(after.allow_negative, false);
      assert.equal(after.track_inventory, true);
    });

    it('refuses to add variants to a batch-tracked product', async () => {
      const co = await batchCompany('variant-guard-co');
      const p  = await flaggedProduct(co);
      const r = await call('POST', `/products/${p._id}/variants`, companyToken(co._id), { sku: 'V-X', size: 'M' });
      assert.equal(r.status, 422);
      assert.equal((await Product.findById(p._id).lean()).variants.length, 0);
    });

    it('deleting a product removes its lots', async () => {
      const co    = await batchCompany('delete-lots-co');
      const fresh = await flaggedProduct(co);
      await StockBatch.create({ company_id: co._id, product_id: fresh._id, batch_no: 'Z', quantity: 0 });
      const r = await call('DELETE', `/products/${fresh._id}`, companyToken(co._id));
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(await StockBatch.countDocuments({ product_id: fresh._id }), 0);
    });
  });

  describe('window arithmetic', () => {
    it('a lot expiring on the last day of the window is inside it, the day after is not', () => {
      const now = new Date('2030-01-10T12:00:00Z');
      const inside  = { _id: 'in',  expiry_date: new Date('2030-02-09T00:00:00Z'), quantity: 1 };
      const outside = { _id: 'out', expiry_date: new Date('2030-02-10T00:00:00Z'), quantity: 1 };
      const out = stockBatch.classifyLots([inside, outside], 30, now);
      assert.deepEqual(out.expires_soon.map(r => r._id), ['in']);
    });

    it('expires today is separate from expired, and lots with no quantity are ignored', () => {
      const now = new Date('2030-01-10T12:00:00Z');
      const rows = [
        { _id: 'yesterday', expiry_date: new Date('2030-01-09T00:00:00Z'), quantity: 1 },
        { _id: 'today',     expiry_date: new Date('2030-01-10T00:00:00Z'), quantity: 1 },
        { _id: 'empty',     expiry_date: new Date('2030-01-10T00:00:00Z'), quantity: 0 },
      ];
      const out = stockBatch.classifyLots(rows, 30, now);
      assert.deepEqual(out.expired.map(r => r._id), ['yesterday']);
      assert.deepEqual(out.expires_today.map(r => r._id), ['today']);
    });
  });
});
