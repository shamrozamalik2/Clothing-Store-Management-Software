'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { mockRes, mockNext, makeCompany, fakeReq } = require('./helpers');

const Company          = require('../src/models/Company');
const BusinessCategory = require('../src/models/BusinessCategory');
const { FEATURES } = require('../src/config/features');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const featureSvc = require('../src/services/features.service');
const { requireFeature } = require('../src/middleware/feature.middleware');

const companyToken = (companyId) =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), companyId: companyId.toString(), role: 'admin' }, process.env.JWT_SECRET);
const superToken = () =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'super_admin' }, process.env.SUPER_ADMIN_JWT_SECRET);

describe('feature resolution', () => {
  before(startDb);
  after(stopDb);
  beforeEach(async () => { await clearDb(); await setupBusinessCategories(); featureSvc.invalidateAll(); });

  it('a company with no overrides gets its category features, and every registry key is present', async () => {
    const company = await makeCompany({ slug: 'plain-co' });
    const eff = await featureSvc.getEffectiveFeatures(company._id);
    assert.equal(eff.business_category, 'CLOTHING');
    assert.equal(Object.keys(eff.features).length, FEATURES.length);
    assert.equal(eff.features.MANUFACTURING, true, 'clothing keeps manufacturing');
    assert.equal(eff.features.EXPIRY, false, 'clothing does not have expiry');
  });

  it('a company override wins over its category, including legacy flag names', async () => {
    const company = await makeCompany({ slug: 'override-co', features: { manufacturing: false } });
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'MANUFACTURING'), false);
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'HR'), true);
  });

  it('a feature missing from both the company and the category is on', async () => {
    const company = await makeCompany({ slug: 'orphan-co', business_category: 'NOT_A_CATEGORY' });
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'EXPENSES'), true);
  });

  it('an unknown company is denied', async () => {
    assert.equal(await featureSvc.isFeatureEnabled(new mongoose.Types.ObjectId(), 'POS'), false);
  });

  it('unknown feature keys are rejected by the check', async () => {
    const company = await makeCompany({ slug: 'bad-key-co' });
    await assert.rejects(() => featureSvc.isFeatureEnabled(company._id, 'NOT_A_FEATURE'), /Unknown feature/);
  });

  it('a cached value is served until the company is invalidated', async () => {
    const company = await makeCompany({ slug: 'cache-co' });
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'HR'), true);
    await Company.updateOne({ _id: company._id }, { features: { hr: false } });
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'HR'), true, 'still cached');
    featureSvc.invalidateCompany(company._id);
    assert.equal(await featureSvc.isFeatureEnabled(company._id, 'HR'), false, 'fresh after invalidation');
  });
});

describe('grandfathering', () => {
  before(startDb);
  after(stopDb);
  beforeEach(clearDb);

  it('an existing clothing category without manufacturing gets it once, and the record is kept', async () => {
    await setupBusinessCategories();
    await BusinessCategory.updateOne({ key: 'CLOTHING' }, { $set: { 'features.MANUFACTURING': false } });
    await BusinessCategory.collection.updateOne({ key: 'CLOTHING' }, { $set: { grandfathered: [] } });
    const first = await setupBusinessCategories();
    assert.equal(first.grandfathered, 1);
    const cat = await BusinessCategory.findOne({ key: 'CLOTHING' }).lean();
    assert.equal(cat.features.MANUFACTURING, true);
    assert.deepEqual(cat.grandfathered, ['MANUFACTURING']);
  });

  it('a later Super Admin turn-off is never reverted by the setup script', async () => {
    await setupBusinessCategories();
    await BusinessCategory.updateOne({ key: 'CLOTHING' }, { $set: { 'features.MANUFACTURING': false } });
    const again = await setupBusinessCategories();
    assert.equal(again.grandfathered, 0);
    assert.equal((await BusinessCategory.findOne({ key: 'CLOTHING' }).lean()).features.MANUFACTURING, false);
  });
});

describe('requireFeature middleware', () => {
  before(startDb);
  after(stopDb);
  beforeEach(async () => { await clearDb(); await setupBusinessCategories(); featureSvc.invalidateAll(); });

  it('refuses with FEATURE_DISABLED when the feature is off', async () => {
    const company = await makeCompany({ slug: 'mw-off', features: { manufacturing: false } });
    const res = mockRes(); const next = mockNext();
    await requireFeature('MANUFACTURING')(fakeReq({ companyId: company._id }), res, next);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'FEATURE_DISABLED');
    assert.equal(res.body.feature, 'MANUFACTURING');
    assert.equal(next.calls.length, 0);
  });

  it('passes through when the feature is on', async () => {
    const company = await makeCompany({ slug: 'mw-on' });
    const res = mockRes(); const next = mockNext();
    await requireFeature('MANUFACTURING')(fakeReq({ companyId: company._id }), res, next);
    assert.equal(next.calls.length, 1);
    assert.equal(res.statusCode, 200);
  });

  it('refuses a request with no company', async () => {
    const res = mockRes();
    await requireFeature('POS')(fakeReq({ companyId: null }), res, mockNext());
    assert.equal(res.statusCode, 403);
  });

  it('building a guard for an unknown feature fails at startup, not at request time', () => {
    assert.throws(() => requireFeature('NOT_A_FEATURE'), /unknown feature/);
  });
});

describe('feature enforcement over HTTP', () => {
  let server, base;
  before(async () => {
    await startDb();
    await setupBusinessCategories();
    const app = require('../src/app');
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(async () => {
    if (server) await new Promise(r => server.close(r));
    await stopDb();
  });
  beforeEach(async () => { featureSvc.invalidateAll(); });

  const get = (path, token) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  it('GET /features returns the effective map for the caller\'s company', async () => {
    const company = await makeCompany({ slug: 'http-features' });
    const r = await get('/features', companyToken(company._id));
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.data.business_category, 'CLOTHING');
    assert.equal(Object.keys(body.data.features).length, FEATURES.length);
  });

  it('a disabled module is refused on the API, even with a valid company token', async () => {
    const company = await makeCompany({ slug: 'http-mfg-off', features: { manufacturing: false } });
    const r = await get('/manufacturing/bom', companyToken(company._id));
    assert.equal(r.status, 403);
    assert.equal((await r.json()).code, 'FEATURE_DISABLED');
  });

  it('a module on for the company is not refused for the feature', async () => {
    const company = await makeCompany({ slug: 'http-mfg-on' });
    const r = await get('/manufacturing/bom', companyToken(company._id));
    const body = await r.json().catch(() => ({}));
    assert.notEqual(body.code, 'FEATURE_DISABLED');
  });

  it('a category without expenses refuses expenses, while a clothing company keeps them', async () => {
    const other = await makeCompany({ slug: 'http-other', business_category: 'OTHER' });
    const clothing = await makeCompany({ slug: 'http-clothing' });
    const blocked = await get('/expenses', companyToken(other._id));
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).code, 'FEATURE_DISABLED');
    const allowed = await get('/expenses', companyToken(clothing._id));
    assert.notEqual((await allowed.json()).code, 'FEATURE_DISABLED');
  });

  it('tenant isolation: switching one company off does not affect another', async () => {
    const a = await makeCompany({ slug: 'iso-a', features: { hr: false } });
    const b = await makeCompany({ slug: 'iso-b' });
    const ra = await get('/employees', companyToken(a._id));
    assert.equal((await ra.json()).code, 'FEATURE_DISABLED');
    const rb = await get('/employees', companyToken(b._id));
    assert.notEqual((await rb.json()).code, 'FEATURE_DISABLED');
  });

  it('a Super Admin feature change takes effect on the next request', async () => {
    const company = await makeCompany({ slug: 'live-change' });
    const before = await get('/manufacturing/bom', companyToken(company._id));
    assert.notEqual((await before.json()).code, 'FEATURE_DISABLED');

    const change = await fetch(`${base}/admin/companies/${company._id}/features`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { manufacturing: false } }),
    });
    assert.equal(change.status, 200);

    const after = await get('/manufacturing/bom', companyToken(company._id));
    assert.equal(after.status, 403);
    assert.equal((await after.json()).code, 'FEATURE_DISABLED');
  });
});
