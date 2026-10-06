'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { startDb, stopDb, clearDb } = require('./setup');
const { makeCompany } = require('./helpers');
const Company = require('../src/models/Company');
const { setupBusinessCategories } = require('../src/database/business-categories-setup');
const featureSvc = require('../src/services/features.service');

const superToken = () =>
  jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'super_admin' }, process.env.SUPER_ADMIN_JWT_SECRET);

describe('super admin feature control', () => {
  let server, base;

  before(async () => {
    await startDb();
    const app = require('../src/app');
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
    await setupBusinessCategories();
    featureSvc.invalidateAll();
  });

  const call = async (method, path, body) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${superToken()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  };

  it('lists every feature with its category default, override and the result that applies', async () => {
    const co = await makeCompany({ slug: 'sa-list', business_category: 'GENERAL_STORE', features: { hr: true } });
    const r = await call('GET', `/admin/companies/${co._id}/features`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const rows = Object.fromEntries(r.body.data.rows.map(x => [x.key, x]));

    assert.equal(r.body.data.rows.length, 31);
    assert.equal(rows.BATCH_TRACKING.category, true, 'general store has batch tracking by default');
    assert.equal(rows.VARIANTS.category, false, 'general store has no variants');
    assert.equal(rows.VARIANTS.override, null);
    assert.equal(rows.VARIANTS.effective, false);
    assert.equal(rows.HR.override, true, 'a legacy override name is shown under its registry key');
    assert.equal(rows.HR.effective, true);
  });

  it('a category change shows up in the list when the company has no override', async () => {
    const co = await makeCompany({ slug: 'sa-cat' });
    const before = await call('GET', `/admin/companies/${co._id}/features`);
    assert.equal(Object.fromEntries(before.body.data.rows.map(x => [x.key, x])).VARIANTS.effective, true);

    const change = await call('PUT', `/admin/companies/${co._id}/business-category`, { business_category: 'GENERAL_STORE' });
    assert.equal(change.status, 200, JSON.stringify(change.body));
    const after = await call('GET', `/admin/companies/${co._id}/features`);
    assert.equal(Object.fromEntries(after.body.data.rows.map(x => [x.key, x])).VARIANTS.effective, false);
  });

  it('saves only the overrides it is given, under registry keys, and replaces the old ones', async () => {
    const co = await makeCompany({ slug: 'sa-save', features: { hr: false, PRODUCTS: false } });
    const r = await call('PUT', `/admin/companies/${co._id}/features`, { features: { BATCH_TRACKING: true, hr: true } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual((await Company.findById(co._id).lean()).features, { BATCH_TRACKING: true, HR: true });
    assert.equal(await featureSvc.isFeatureEnabled(co._id, 'PRODUCTS'), true, 'an old override is gone');
  });

  it('refuses an unknown feature and a value that is not on or off, and changes nothing', async () => {
    const co = await makeCompany({ slug: 'sa-bad', features: { HR: false } });
    const unknown = await call('PUT', `/admin/companies/${co._id}/features`, { features: { NOT_A_FEATURE: true } });
    assert.equal(unknown.status, 422);
    assert.match(unknown.body.message, /Unknown feature/);

    const notBool = await call('PUT', `/admin/companies/${co._id}/features`, { features: { BATCH_TRACKING: 'yes' } });
    assert.equal(notBool.status, 422);
    assert.deepEqual((await Company.findById(co._id).lean()).features, { HR: false });
  });

  it('an unknown company is reported as not found', async () => {
    const r = await call('GET', `/admin/companies/${new mongoose.Types.ObjectId()}/features`);
    assert.equal(r.status, 404);
  });
});
