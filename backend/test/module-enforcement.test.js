'use strict';

// Covers the core modules that only used to be hidden in the sidebar: PRODUCTS, INVENTORY,
// POS, SALES, RETURNS, PURCHASES, CUSTOMERS, SUPPLIERS, REPORTS. A disabled module must now
// refuse the API directly, not just hide the nav link.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { makeCompany, makeProduct } = require('./helpers');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const featureSvc = require('../src/services/features.service');

const companyToken = (companyId) =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), companyId: companyId.toString(), role: 'admin' }, process.env.JWT_SECRET);

describe('core modules refuse the API when a category leaves them out', () => {
  let server, base;

  before(async () => {
    await startDb();
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

  it('Bobbin Factory (no POS, SALES, RETURNS or CUSTOMERS) is refused on each, but keeps purchases, inventory and products', async () => {
    const co = await makeCompany({ slug: 'bobbin-co', business_category: 'BOBBIN_FACTORY' });
    const token = companyToken(co._id);

    const sale = await call('POST', '/sales', token, { items: [], payment_method: 'cash' });
    assert.equal(sale.status, 403);
    assert.equal(sale.body.code, 'FEATURE_DISABLED');
    assert.equal(sale.body.feature, 'POS');

    const salesList = await call('GET', '/sales', token);
    assert.equal(salesList.body.feature, 'SALES');

    const returns = await call('GET', '/returns', token);
    assert.equal(returns.body.feature, 'RETURNS');

    const customers = await call('GET', '/customers', token);
    assert.equal(customers.body.feature, 'CUSTOMERS');

    const purchases = await call('GET', '/purchases', token);
    assert.notEqual(purchases.status, 403);

    const products = await call('GET', '/products', token);
    assert.notEqual(products.status, 403);

    const adjustments = await call('POST', '/stock-adjustments', token, { type: 'adjustment', reason: 'count', items: [] });
    assert.notEqual(adjustments.body.code, 'FEATURE_DISABLED');
  });

  it('checkout and viewing sales are gated separately: POS off still allows viewing under SALES', async () => {
    const co = await makeCompany({ slug: 'pos-off-co', features: { POS: false } });
    const token = companyToken(co._id);

    const sale = await call('POST', '/sales', token, { items: [], payment_method: 'cash' });
    assert.equal(sale.body.feature, 'POS');

    const list = await call('GET', '/sales', token);
    assert.notEqual(list.body.code, 'FEATURE_DISABLED');
  });

  it('SALES off still allows checkout under POS, but refuses viewing', async () => {
    const co = await makeCompany({ slug: 'sales-off-co', features: { SALES: false } });
    const p  = await makeProduct(co._id, { sale_price: 500, stock_quantity: 10 });
    const token = companyToken(co._id);

    const sale = await call('POST', '/sales', token, {
      items: [{ product_id: String(p._id), quantity: 1, unit_price: 500 }],
      payment_method: 'cash', paid_amount: 500,
    });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    const list = await call('GET', '/sales', token);
    assert.equal(list.body.feature, 'SALES');
  });

  it('the dashboard stays available even when Reports is off, but the report pages are refused', async () => {
    const co = await makeCompany({ slug: 'no-reports-co', features: { REPORTS: false } });
    const token = companyToken(co._id);

    const dash = await call('GET', '/reports/dashboard', token);
    assert.notEqual(dash.body.code, 'FEATURE_DISABLED');

    const overview = await call('GET', '/reports/overview', token);
    assert.equal(overview.body.feature, 'REPORTS');
  });

  it('a default (clothing) company is refused nothing on these routes', async () => {
    const co = await makeCompany({ slug: 'clothing-ok-co' });
    const token = companyToken(co._id);
    for (const path of ['/sales', '/returns', '/purchases', '/customers', '/suppliers', '/products', '/stock-adjustments', '/reports/overview']) {
      const r = await call('GET', path, token);
      assert.notEqual(r.body.code, 'FEATURE_DISABLED', `${path} should not be feature-disabled for clothing`);
    }
  });
});
