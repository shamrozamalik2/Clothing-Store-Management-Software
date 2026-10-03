'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, makeCustomer, fakeReq } = require('./helpers');

const Product  = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const { create: createSale, voidSale } = require('../src/controllers/sales.controller');
const { create: createReturn } = require('../src/controllers/returns.controller');

describe('Phase 3 — void and return fixes compose correctly together', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('credit sale -> partial return -> void: stock and customer balance both end up correct, with no double-counting', async () => {
    const company  = await makeCompany();
    const customer = await makeCustomer(company._id);
    const product  = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    // Sell 4 on credit: stock 10 -> 6, customer owes 400
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

    let p = await Product.findById(product._id).lean();
    let c = await Customer.findById(customer._id).lean();
    assert.equal(p.stock_quantity, 6);
    assert.equal(c.current_balance, 400);

    // Return 2 of 4: stock 6 -> 8, due_amount 400 -> 200, customer balance 400 -> 200
    const saleItemId = sale.items[0]._id ?? sale.items[0].id;
    await createReturn(fakeReq({
      companyId: company._id,
      body: { sale_id: sale.id, type: 'return', return_items: [{ sale_item_id: String(saleItemId), quantity: 2 }] },
    }), mockRes(), mockNext());

    p = await Product.findById(product._id).lean();
    c = await Customer.findById(customer._id).lean();
    assert.equal(p.stock_quantity, 8, 'return should restore the 2 returned units');
    assert.equal(c.current_balance, 200, 'return should pay down half the credit debt');

    // Void the whole sale: must restore only the 2 unreturned units (8 -> 10, not 12),
    // and reverse only the remaining 200 due (200 -> 0, not -200).
    await voidSale(fakeReq({ companyId: company._id, params: { id: sale.id } }), mockRes(), mockNext());

    p = await Product.findById(product._id).lean();
    c = await Customer.findById(customer._id).lean();
    assert.equal(p.stock_quantity, 10, 'void must restore exactly the unreturned remainder, landing back at the original stock');
    assert.equal(c.current_balance, 0, 'void must reverse exactly the remaining due amount, not the original 400 again');
  });
});
