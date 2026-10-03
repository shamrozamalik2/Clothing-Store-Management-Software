'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, makeSupplier, fakeReq } = require('./helpers');

const Supplier = require('../src/models/Supplier');
const { create: createPurchase, recordPayment } = require('../src/controllers/purchases.controller');

describe('supplier balance stays in sync with purchases and payments', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('a credit purchase increases the supplier balance by the due amount', async () => {
    const company  = await makeCompany();
    const supplier = await makeSupplier(company._id, { opening_balance: 0, current_balance: 0 });
    const product  = await makeProduct(company._id);

    const res = mockRes();
    await createPurchase(fakeReq({
      companyId: company._id,
      body: {
        supplier_id: supplier._id.toString(), paid_amount: 0,
        items: [{ product_id: product._id.toString(), quantity: 10, unit_cost: 50 }],
      },
    }), res, mockNext());
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.due_amount, 500);

    const updatedSupplier = await Supplier.findById(supplier._id).lean();
    assert.equal(updatedSupplier.current_balance, 500, 'an unpaid credit purchase should add the full due amount to the supplier balance');
  });

  it('a fully-paid purchase does not change the supplier balance', async () => {
    const company  = await makeCompany();
    const supplier = await makeSupplier(company._id, { opening_balance: 100, current_balance: 100 });
    const product  = await makeProduct(company._id);

    await createPurchase(fakeReq({
      companyId: company._id,
      body: {
        supplier_id: supplier._id.toString(), paid_amount: 500,
        items: [{ product_id: product._id.toString(), quantity: 10, unit_cost: 50 }],
      },
    }), mockRes(), mockNext());

    const updatedSupplier = await Supplier.findById(supplier._id).lean();
    assert.equal(updatedSupplier.current_balance, 100, 'a fully-paid purchase must not touch the supplier balance');
  });

  it('recording a payment reduces the supplier balance by the amount paid', async () => {
    const company  = await makeCompany();
    const supplier = await makeSupplier(company._id, { opening_balance: 0, current_balance: 0 });
    const product  = await makeProduct(company._id);

    const purRes = mockRes();
    await createPurchase(fakeReq({
      companyId: company._id,
      body: {
        supplier_id: supplier._id.toString(), paid_amount: 0,
        items: [{ product_id: product._id.toString(), quantity: 10, unit_cost: 50 }],
      },
    }), purRes, mockNext());
    const purchase = purRes.body.data;

    let s = await Supplier.findById(supplier._id).lean();
    assert.equal(s.current_balance, 500);

    await recordPayment(fakeReq({
      companyId: company._id,
      params: { id: purchase.id },
      body: { amount: 200 },
    }), mockRes(), mockNext());

    s = await Supplier.findById(supplier._id).lean();
    assert.equal(s.current_balance, 300, 'balance should drop by exactly the payment amount');
  });

  it('balance keeps accumulating correctly across multiple purchases, not just the first', async () => {
    const company  = await makeCompany();
    const supplier = await makeSupplier(company._id, { opening_balance: 0, current_balance: 0 });
    const product  = await makeProduct(company._id);

    for (const qty of [5, 3, 2]) {
      await createPurchase(fakeReq({
        companyId: company._id,
        body: {
          supplier_id: supplier._id.toString(), paid_amount: 0,
          items: [{ product_id: product._id.toString(), quantity: qty, unit_cost: 50 }],
        },
      }), mockRes(), mockNext());
    }

    const s = await Supplier.findById(supplier._id).lean();
    assert.equal(s.current_balance, 500, 'three purchases of 250+150+100 should sum to 500, not freeze after the first');
  });
});
