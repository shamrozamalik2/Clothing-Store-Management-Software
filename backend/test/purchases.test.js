'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, fakeReq } = require('./helpers');

const Product = require('../src/models/Product');
const { create: createPurchase, updateStatus } = require('../src/controllers/purchases.controller');

describe('purchase receive / un-receive stock', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('receiving adds stock, and un-receiving reverses exactly that addition', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10 });

    const purRes = mockRes();
    await createPurchase(fakeReq({
      companyId: company._id,
      body: { status: 'ordered', items: [{ product_id: product._id.toString(), quantity: 5, unit_cost: 50 }] },
    }), purRes, mockNext());
    assert.equal(purRes.statusCode, 201);
    const purchase = purRes.body.data;

    let p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'sanity: an "ordered" purchase must not touch stock yet');

    // Mark received: stock 10 -> 15
    await updateStatus(fakeReq({ companyId: company._id, params: { id: purchase.id }, body: { status: 'received' } }), mockRes(), mockNext());
    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 15, 'receiving should add the purchased quantity');

    // Un-receive (back to cancelled): stock 15 -> 10
    await updateStatus(fakeReq({ companyId: company._id, params: { id: purchase.id }, body: { status: 'cancelled' } }), mockRes(), mockNext());
    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'un-receiving must reverse the earlier addition, back to the original stock');
  });

  it('receiving then receiving again (no-op transition) does not double-add stock', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10 });

    const purRes = mockRes();
    await createPurchase(fakeReq({
      companyId: company._id,
      body: { status: 'received', items: [{ product_id: product._id.toString(), quantity: 3, unit_cost: 50 }] },
    }), purRes, mockNext());
    const purchase = purRes.body.data;

    let p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 13, 'sanity: creating directly as received adds stock once');

    // Re-sending the same status must not add stock again
    await updateStatus(fakeReq({ companyId: company._id, params: { id: purchase.id }, body: { status: 'received' } }), mockRes(), mockNext());
    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 13, 'setting the same status again must be a no-op for stock');
  });

  it('a purchase that was never received can be cancelled without affecting stock', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10 });

    const purRes = mockRes();
    await createPurchase(fakeReq({
      companyId: company._id,
      body: { status: 'ordered', items: [{ product_id: product._id.toString(), quantity: 5, unit_cost: 50 }] },
    }), purRes, mockNext());
    const purchase = purRes.body.data;

    await updateStatus(fakeReq({ companyId: company._id, params: { id: purchase.id }, body: { status: 'cancelled' } }), mockRes(), mockNext());
    const p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'cancelling a purchase that was never received must not touch stock');
  });
});
