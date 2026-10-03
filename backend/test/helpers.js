'use strict';

const { Types } = require('mongoose');
const Company  = require('../src/models/Company');
const Product  = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const Supplier = require('../src/models/Supplier');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json   = (payload) => { res.body = payload; return res; };
  return res;
}

function mockNext() {
  const calls = [];
  const next = (err) => { calls.push(err); if (err) throw err; };
  next.calls = calls;
  return next;
}

async function makeCompany(overrides = {}) {
  return Company.create({ name: 'Test Co', slug: `test-${new Types.ObjectId()}`, ...overrides });
}

async function makeProduct(companyId, overrides = {}) {
  return Product.create({
    company_id:      companyId,
    name:            'Test Shirt',
    sku:             `SKU-${new Types.ObjectId()}`,
    sale_price:      1000,
    cost_price:      600,
    stock_quantity:  50,
    track_inventory: true,
    ...overrides,
  });
}

async function makeCustomer(companyId, overrides = {}) {
  return Customer.create({
    company_id:      companyId,
    name:            'Test Customer',
    current_balance: 0,
    credit_limit:    0,
    ...overrides,
  });
}

async function makeSupplier(companyId, overrides = {}) {
  return Supplier.create({
    company_id:      companyId,
    name:            'Test Supplier',
    current_balance: 0,
    ...overrides,
  });
}

function fakeReq({ companyId, userId, body = {}, params = {}, query = {} }) {
  return {
    companyId,
    user: { id: (userId || new Types.ObjectId()).toString() },
    body,
    params,
    query,
  };
}

module.exports = { mockRes, mockNext, makeCompany, makeProduct, makeCustomer, makeSupplier, fakeReq };
