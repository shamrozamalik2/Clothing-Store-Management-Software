'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, makeCustomer, fakeReq } = require('./helpers');

const Sale     = require('../src/models/Sale');
const Customer = require('../src/models/Customer');
const { create: createSale } = require('../src/controllers/sales.controller');
const { create: createReturn } = require('../src/controllers/returns.controller');

describe('returns adjust customer balance / sale due_amount', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('partial return on a credit sale reduces due_amount and customer balance proportionally', async () => {
    const company  = await makeCompany();
    const customer = await makeCustomer(company._id);
    const product  = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        customer_id: customer._id.toString(), payment_method: 'credit', paid_amount: 0,
        items: [{ product_id: product._id.toString(), quantity: 4, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;
    assert.equal(sale.due_amount, 400);

    let cust = await Customer.findById(customer._id).lean();
    assert.equal(cust.current_balance, 400, 'sanity: credit sale added the full due amount to the customer balance');

    const saleItemId = sale.items[0]._id ?? sale.items[0].id;
    await createReturn(fakeReq({
      companyId: company._id,
      body: { sale_id: sale.id, type: 'return', return_items: [{ sale_item_id: String(saleItemId), quantity: 2 }] },
    }), mockRes(), mockNext());

    const updatedSale = await Sale.findById(sale.id).lean();
    assert.equal(updatedSale.due_amount, 200, 'due_amount should drop by the returned value (2 of 4 units = 200)');

    cust = await Customer.findById(customer._id).lean();
    assert.equal(cust.current_balance, 200, 'customer balance should drop by the same 200');
  });

  it('fully returning a credit sale zeroes out due_amount and customer balance', async () => {
    const company  = await makeCompany();
    const customer = await makeCustomer(company._id);
    const product  = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        customer_id: customer._id.toString(), payment_method: 'credit', paid_amount: 0,
        items: [{ product_id: product._id.toString(), quantity: 4, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;
    const saleItemId = sale.items[0]._id ?? sale.items[0].id;

    await createReturn(fakeReq({
      companyId: company._id,
      body: { sale_id: sale.id, type: 'return', return_items: [{ sale_item_id: String(saleItemId), quantity: 4 }] },
    }), mockRes(), mockNext());

    const updatedSale = await Sale.findById(sale.id).lean();
    assert.equal(updatedSale.due_amount, 0);
    assert.equal(updatedSale.status, 'refunded');

    const cust = await Customer.findById(customer._id).lean();
    assert.equal(cust.current_balance, 0, 'fully returning a fully-unpaid sale should zero the customer balance');
  });

  it('returning a fully-paid cash sale does not touch customer balance', async () => {
    const company  = await makeCompany();
    const customer = await makeCustomer(company._id);
    const product  = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        customer_id: customer._id.toString(), payment_method: 'cash', paid_amount: 200,
        items: [{ product_id: product._id.toString(), quantity: 2, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;
    assert.equal(sale.due_amount, 0, 'sanity: fully paid at sale time');

    const saleItemId = sale.items[0]._id ?? sale.items[0].id;
    await createReturn(fakeReq({
      companyId: company._id,
      body: { sale_id: sale.id, type: 'return', return_items: [{ sale_item_id: String(saleItemId), quantity: 1 }] },
    }), mockRes(), mockNext());

    const updatedSale = await Sale.findById(sale.id).lean();
    assert.equal(updatedSale.due_amount, 0, 'no outstanding due_amount existed, so none should appear');

    const cust = await Customer.findById(customer._id).lean();
    assert.equal(cust.current_balance, 0, 'a cash refund on an already-fully-paid sale must not touch the balance');
  });

  it('an exchange where the customer takes more value than they returned increases what they owe', async () => {
    const company   = await makeCompany();
    const customer  = await makeCustomer(company._id);
    const productA  = await makeProduct(company._id, { name: 'A', sku: 'A-1', stock_quantity: 10, sale_price: 100 });
    const productB  = await makeProduct(company._id, { name: 'B', sku: 'B-1', stock_quantity: 10, sale_price: 150 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        customer_id: customer._id.toString(), payment_method: 'cash', paid_amount: 100,
        items: [{ product_id: productA._id.toString(), quantity: 1, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;
    assert.equal(sale.due_amount, 0);

    const saleItemId = sale.items[0]._id ?? sale.items[0].id;
    await createReturn(fakeReq({
      companyId: company._id,
      body: {
        sale_id: sale.id,
        type: 'exchange',
        return_items:   [{ sale_item_id: String(saleItemId), quantity: 1 }],
        exchange_items: [{ product_id: productB._id.toString(), quantity: 1, unit_price: 150 }],
      },
    }), mockRes(), mockNext());

    const updatedSale = await Sale.findById(sale.id).lean();
    assert.equal(updatedSale.due_amount, 50, 'customer now owes the 50 difference (150 exchange - 100 returned)');

    const cust = await Customer.findById(customer._id).lean();
    assert.equal(cust.current_balance, 50, 'the shortfall should be added to the customer balance, same as an underpaid sale');
  });
});
