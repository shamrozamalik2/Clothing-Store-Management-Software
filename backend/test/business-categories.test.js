'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, fakeReq } = require('./helpers');

const BusinessCategory = require('../src/models/BusinessCategory');
const Company          = require('../src/models/Company');
const { FEATURES, FEATURE_KEYS } = require('../src/config/features');
const { DEFAULT_CATEGORIES } = require('../src/config/business-category-presets');
const svc = require('../src/services/businessCategory.service');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const ctrl = require('../src/controllers/business-categories.controller');

describe('feature registry and presets', () => {
  it('every preset feature key exists in the registry, and every registry key is present in each preset', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      const keys = Object.keys(cat.features);
      assert.equal(keys.length, FEATURES.length, `${cat.key} must list every registry feature`);
      for (const k of keys) assert.ok(FEATURE_KEYS.has(k), `${cat.key} references unknown feature ${k}`);
    }
  });

  it('sanitizeFeatures rejects unknown keys and non-boolean values', () => {
    assert.throws(() => svc.sanitizeFeatures({ NOT_A_FEATURE: true }), /Unknown feature/);
    assert.throws(() => svc.sanitizeFeatures({ POS: 'yes' }), /must be true or false/);
    assert.throws(() => svc.sanitizeFeatures(['POS']), /must be an object/);
  });

  it('sanitizeFeatures accepts a partial map', () => {
    assert.deepEqual(svc.sanitizeFeatures({ POS: true }), { POS: true });
  });

  it('normalizeCategoryKey upper-cases valid keys and rejects invalid ones', () => {
    assert.equal(svc.normalizeCategoryKey('general_store'), 'GENERAL_STORE');
    assert.throws(() => svc.normalizeCategoryKey('bad key!'), /must be 2-40 characters/);
    assert.throws(() => svc.normalizeCategoryKey('1STARTS_WITH_DIGIT'), /must be 2-40 characters/);
  });
});

describe('business categories — data, setup and backfill', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('setup creates the five default categories, and a second run creates none', async () => {
    const first = await setupBusinessCategories();
    assert.equal(first.categoriesCreated, 5);
    const second = await setupBusinessCategories();
    assert.equal(second.categoriesCreated, 0);
    assert.equal(await BusinessCategory.countDocuments({}), 5);
  });

  it('setup never overwrites a category that Super Admin has edited', async () => {
    await setupBusinessCategories();
    await BusinessCategory.updateOne({ key: 'PHARMACY' }, { name: 'Pharmacy (edited)' });
    await setupBusinessCategories();
    const pharmacy = await BusinessCategory.findOne({ key: 'PHARMACY' }).lean();
    assert.equal(pharmacy.name, 'Pharmacy (edited)');
  });

  it('companies with no category are backfilled to CLOTHING; companies that already have one are untouched', async () => {
    await setupBusinessCategories();
    const legacy = await makeCompany({ slug: 'legacy-co' });
    await Company.collection.updateOne({ _id: legacy._id }, { $unset: { business_category: '' } });
    const pharmacyCo = await makeCompany({ slug: 'pharmacy-co', business_category: 'PHARMACY' });

    const result = await setupBusinessCategories();
    assert.equal(result.companiesBackfilled, 1);

    assert.equal((await Company.findById(legacy._id).lean()).business_category, 'CLOTHING');
    assert.equal((await Company.findById(pharmacyCo._id).lean()).business_category, 'PHARMACY');
  });

  it('dry run reports what would change and writes nothing', async () => {
    const legacy = await makeCompany({ slug: 'dry-run-co' });
    await Company.collection.updateOne({ _id: legacy._id }, { $unset: { business_category: '' } });
    const result = await setupBusinessCategories({ dryRun: true });
    assert.equal(result.dryRun, true);
    assert.equal(result.categoriesCreated, 5);
    assert.equal(result.companiesBackfilled, 1);
    assert.equal(await BusinessCategory.countDocuments({}), 0);
    assert.equal((await Company.findById(legacy._id).lean()).business_category, undefined);
  });
});

describe('super admin category controller', () => {
  before(startDb);
  after(stopDb);
  beforeEach(async () => { await clearDb(); await setupBusinessCategories(); });

  it('creates a category with a complete feature map (unlisted features are off)', async () => {
    const res = mockRes();
    await ctrl.createBusinessCategory(fakeReq({ body: { key: 'electronics', name: 'Electronics', features: { POS: true } } }), res, mockNext());
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.key, 'ELECTRONICS');
    assert.equal(res.body.data.features.POS, true);
    assert.equal(res.body.data.features.EXPIRY, false);
  });

  it('rejects a duplicate key with 409 and an unknown feature with 422', async () => {
    const dup = mockRes();
    await ctrl.createBusinessCategory(fakeReq({ body: { key: 'CLOTHING', name: 'Again' } }), dup, mockNext());
    assert.equal(dup.statusCode, 409);

    const bad = mockRes();
    await ctrl.createBusinessCategory(fakeReq({ body: { key: 'NEWONE', name: 'New', features: { FAKE: true } } }), bad, mockNext());
    assert.equal(bad.statusCode, 422);
  });

  it('updating features merges onto the existing map, so omitted features are not switched off', async () => {
    await ctrl.updateBusinessCategory(fakeReq({ params: { key: 'GENERAL_STORE' }, body: { features: { POS: false } } }), mockRes(), mockNext());
    const res = mockRes();
    await ctrl.updateBusinessCategory(fakeReq({ params: { key: 'GENERAL_STORE' }, body: { features: { SALES: false } } }), res, mockNext());
    assert.equal(res.body.data.features.POS, false, 'the earlier change must persist');
    assert.equal(res.body.data.features.EXPIRY, true, 'an untouched feature must keep its value');
  });

  it('a deactivated category cannot be assigned, and can be assigned again once reactivated', async () => {
    const company = await makeCompany({ slug: 'assign-co' });
    await ctrl.setBusinessCategoryStatus(fakeReq({ params: { key: 'OTHER' }, body: { is_active: false } }), mockRes(), mockNext());

    const blocked = mockRes();
    await ctrl.assignCompanyBusinessCategory(fakeReq({ params: { id: company._id.toString() }, body: { business_category: 'OTHER' } }), blocked, mockNext());
    assert.equal(blocked.statusCode, 422);

    await ctrl.setBusinessCategoryStatus(fakeReq({ params: { key: 'OTHER' }, body: { is_active: true } }), mockRes(), mockNext());
    const ok = mockRes();
    await ctrl.assignCompanyBusinessCategory(fakeReq({ params: { id: company._id.toString() }, body: { business_category: 'OTHER' } }), ok, mockNext());
    assert.equal(ok.statusCode, 200);
    assert.equal((await Company.findById(company._id).lean()).business_category, 'OTHER');
  });

  it('assigning a category to an unknown company returns 404', async () => {
    const res = mockRes();
    await ctrl.assignCompanyBusinessCategory(fakeReq({ params: { id: '000000000000000000000000' }, body: { business_category: 'PHARMACY' } }), res, mockNext());
    assert.equal(res.statusCode, 404);
  });
});

describe('business categories — HTTP authorization', () => {
  let server, base;
  before(async () => {
    await startDb();
    await setupBusinessCategories();
    const app = require('../src/app');
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}/api/admin`;
  });
  after(async () => {
    if (server) await new Promise(r => server.close(r));
    await stopDb();
  });

  it('rejects requests with no token', async () => {
    const r = await fetch(`${base}/business-categories`);
    assert.equal(r.status, 401);
  });

  it('rejects a company user token, which is signed with the tenant secret', async () => {
    const company = await makeCompany({ slug: 'http-co' });
    const token = jwt.sign({ id: 'u1', companyId: company._id.toString(), role: 'admin' }, process.env.JWT_SECRET);
    const list = await fetch(`${base}/business-categories`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(list.status, 401);

    const assign = await fetch(`${base}/companies/${company._id}/business-category`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_category: 'PHARMACY' }),
    });
    assert.equal(assign.status, 401);
    assert.equal((await Company.findById(company._id).lean()).business_category, 'CLOTHING');
  });

  it('accepts a super admin token and returns the categories and feature registry', async () => {
    const token = jwt.sign({ id: 'sa1', email: 'sa@example.com', name: 'SA', role: 'super_admin' }, process.env.SUPER_ADMIN_JWT_SECRET);
    const r = await fetch(`${base}/business-categories`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.data.categories.length, 5);
    assert.equal(body.data.registry.length, FEATURES.length);
  });
});
