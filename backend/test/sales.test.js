'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, makeCustomer, fakeReq } = require('./helpers');

const Sale    = require('../src/models/Sale');
const Product = require('../src/models/Product');
const { create } = require('../src/controllers/sales.controller');

describe('sales.controller', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  describe('create — duplicate / idempotency', () => {
    it('a second request with the same idempotency_key does not create a second sale', async () => {
      const company = await makeCompany();
      const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 500 });
      const key = 'checkout-attempt-1';
      const body = {
        payment_method: 'cash',
        paid_amount:    500,
        idempotency_key: key,
        items: [{ product_id: product._id.toString(), quantity: 1, unit_price: 500 }],
      };

      const res1 = mockRes();
      await create(fakeReq({ companyId: company._id, body }), res1, mockNext());
      assert.equal(res1.statusCode, 201);
      assert.equal(res1.body.success, true);

      const res2 = mockRes();
      await create(fakeReq({ companyId: company._id, body }), res2, mockNext());
      assert.equal(res2.statusCode, 201);
      assert.equal(res2.body.data.id, res1.body.data.id, 'replay must return the original sale, not a new one');

      const count = await Sale.countDocuments({ company_id: company._id });
      assert.equal(count, 1, 'only one Sale document should exist');

      const refreshed = await Product.findById(product._id).lean();
      assert.equal(refreshed.stock_quantity, 9, 'stock must only be decremented once, not twice');
    });

    it('concurrent requests with the same idempotency_key still only create one sale', async () => {
      const company = await makeCompany();
      const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 500 });
      const key = 'checkout-race';
      const body = {
        payment_method: 'cash',
        paid_amount:    500,
        idempotency_key: key,
        items: [{ product_id: product._id.toString(), quantity: 1, unit_price: 500 }],
      };

      await Promise.all([
        create(fakeReq({ companyId: company._id, body }), mockRes(), mockNext()),
        create(fakeReq({ companyId: company._id, body }), mockRes(), mockNext()),
      ]);

      const count = await Sale.countDocuments({ company_id: company._id });
      assert.equal(count, 1, 'a race between duplicate requests must still only leave one Sale document');

      const refreshed = await Product.findById(product._id).lean();
      assert.equal(refreshed.stock_quantity, 9, 'stock must only be decremented once across the whole race');
    });

    it('two requests with different idempotency_keys create two separate sales (normal behavior unaffected)', async () => {
      const company = await makeCompany();
      const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 500 });
      const itemBody = { items: [{ product_id: product._id.toString(), quantity: 1, unit_price: 500 }], payment_method: 'cash', paid_amount: 500 };

      await create(fakeReq({ companyId: company._id, body: { ...itemBody, idempotency_key: 'key-a' } }), mockRes(), mockNext());
      await create(fakeReq({ companyId: company._id, body: { ...itemBody, idempotency_key: 'key-b' } }), mockRes(), mockNext());

      const count = await Sale.countDocuments({ company_id: company._id });
      assert.equal(count, 2, 'different keys must create independent sales');
    });

    it('requests with no idempotency_key at all still work (optional field)', async () => {
      const company = await makeCompany();
      const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 500 });
      const body = { items: [{ product_id: product._id.toString(), quantity: 1, unit_price: 500 }], payment_method: 'cash', paid_amount: 500 };

      const res = mockRes();
      await create(fakeReq({ companyId: company._id, body }), res, mockNext());
      assert.equal(res.statusCode, 201);

      const count = await Sale.countDocuments({ company_id: company._id });
      assert.equal(count, 1);
    });
  });
});
