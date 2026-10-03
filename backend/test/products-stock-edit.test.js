'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, fakeReq } = require('./helpers');

const StockAdjustment = require('../src/models/StockAdjustment');
const { update: updateProduct, upsertVariant: addVariant, updateVariant } = require('../src/controllers/products.controller');

describe('direct stock edits go through the audit trail', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('editing a product\'s stock_quantity directly creates a StockAdjustment record', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10, cost_price: 50 });

    const res = mockRes();
    await updateProduct(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString() },
      body: { stock_quantity: '25' },
    }), res, mockNext());
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.stock_quantity, 25);

    const adjustments = await StockAdjustment.find({ company_id: company._id }).lean();
    assert.equal(adjustments.length, 1, 'a direct stock edit must leave an audit record');
    assert.equal(adjustments[0].items[0].quantity_before, 10);
    assert.equal(adjustments[0].items[0].quantity_adjusted, 15);
    assert.equal(adjustments[0].items[0].quantity_after, 25);
    assert.equal(adjustments[0].reason, 'Direct product edit');
  });

  it('a negative stock_quantity is clamped to 0, same as every other stock-adjusting path', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 5 });

    const res = mockRes();
    await updateProduct(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString() },
      body: { stock_quantity: '-10' },
    }), res, mockNext());
    assert.equal(res.body.data.stock_quantity, 0, 'stock must clamp at 0, not go negative');

    const adj = await StockAdjustment.findOne({ company_id: company._id }).lean();
    assert.equal(adj.items[0].quantity_after, 0);
  });

  it('updating unrelated fields without changing stock_quantity does not create an adjustment record', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10, name: 'Old Name' });

    await updateProduct(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString() },
      body: { name: 'New Name' },
    }), mockRes(), mockNext());

    const count = await StockAdjustment.countDocuments({ company_id: company._id });
    assert.equal(count, 0, 'no stock change means no adjustment record should be created');
  });

  it('sending the same stock_quantity value again does not create a no-op adjustment record', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10 });

    await updateProduct(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString() },
      body: { stock_quantity: '10' },
    }), mockRes(), mockNext());

    const count = await StockAdjustment.countDocuments({ company_id: company._id });
    assert.equal(count, 0, 'resending the same value must not create a spurious adjustment');
  });

  it('editing a variant\'s stock_quantity directly also creates a StockAdjustment record', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 0 });

    const addRes = mockRes();
    await addVariant(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString() },
      body: { sku: 'VAR-1', size: 'M', stock_quantity: '8' },
    }), addRes, mockNext());
    const variantId = addRes.body.data.id;

    const res = mockRes();
    await updateVariant(fakeReq({
      companyId: company._id,
      params: { id: product._id.toString(), variantId },
      body: { stock_quantity: '20' },
    }), res, mockNext());
    assert.equal(res.body.data.stock_quantity, 20);

    const adjustments = await StockAdjustment.find({ company_id: company._id }).lean();
    assert.equal(adjustments.length, 1, 'a direct variant stock edit must also leave an audit record');
    assert.equal(adjustments[0].items[0].quantity_before, 8);
    assert.equal(adjustments[0].items[0].quantity_after, 20);
    assert.equal(String(adjustments[0].items[0].variant_id), variantId);
  });
});
