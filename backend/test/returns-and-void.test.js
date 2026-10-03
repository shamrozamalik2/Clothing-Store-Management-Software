'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, makeProduct, fakeReq } = require('./helpers');

const Sale    = require('../src/models/Sale');
const Product = require('../src/models/Product');
const { create: createSale, voidSale } = require('../src/controllers/sales.controller');
const { create: createReturn } = require('../src/controllers/returns.controller');

describe('sale void after a return', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('void only restores the unreturned remainder, not the full original quantity', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    // Sell 4 units: stock 10 -> 6
    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        payment_method: 'cash', paid_amount: 400,
        items: [{ product_id: product._id.toString(), quantity: 4, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    assert.equal(saleRes.statusCode, 201);
    const sale = saleRes.body.data;
    const saleItemId = sale.items[0].id ?? sale.items[0]._id;

    let p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 6, 'sanity: stock decremented by the sale');

    // Return 2 of the 4 units: stock 6 -> 8
    const retRes = mockRes();
    await createReturn(fakeReq({
      companyId: company._id,
      body: {
        sale_id: sale.id,
        type: 'return',
        return_items: [{ sale_item_id: String(saleItemId), quantity: 2 }],
      },
    }), retRes, mockNext());
    assert.equal(retRes.statusCode, 201);

    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 8, 'sanity: return restored the 2 returned units');

    // Void the sale: must restore only the remaining 2 (4 sold - 2 already returned),
    // landing back at the original 10 — not 12, which would mean the already-returned
    // units got restored a second time.
    const voidRes = mockRes();
    await voidSale(fakeReq({ companyId: company._id, params: { id: sale.id } }), voidRes, mockNext());
    assert.equal(voidRes.statusCode, 200);

    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'void must only restore the unreturned remainder (2), not the full original 4');

    const updatedSale = await Sale.findById(sale.id).lean();
    assert.equal(updatedSale.status, 'cancelled');
  });

  it('void with no prior return still restores the full original quantity (regression check)', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        payment_method: 'cash', paid_amount: 300,
        items: [{ product_id: product._id.toString(), quantity: 3, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;

    let p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 7);

    await voidSale(fakeReq({ companyId: company._id, params: { id: sale.id } }), mockRes(), mockNext());

    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'void with no prior return must restore the full original quantity');
  });

  it('voiding an already-fully-returned sale is a safe no-op for stock', async () => {
    const company = await makeCompany();
    const product = await makeProduct(company._id, { stock_quantity: 10, sale_price: 100 });

    const saleRes = mockRes();
    await createSale(fakeReq({
      companyId: company._id,
      body: {
        payment_method: 'cash', paid_amount: 200,
        items: [{ product_id: product._id.toString(), quantity: 2, unit_price: 100 }],
      },
    }), saleRes, mockNext());
    const sale = saleRes.body.data;
    const saleItemId = sale.items[0].id ?? sale.items[0]._id;

    // Fully return both units: stock 8 -> 10
    await createReturn(fakeReq({
      companyId: company._id,
      body: { sale_id: sale.id, type: 'return', return_items: [{ sale_item_id: String(saleItemId), quantity: 2 }] },
    }), mockRes(), mockNext());

    let p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10);

    await voidSale(fakeReq({ companyId: company._id, params: { id: sale.id } }), mockRes(), mockNext());

    p = await Product.findById(product._id).lean();
    assert.equal(p.stock_quantity, 10, 'voiding a fully-returned sale must not add stock again');
  });
});
