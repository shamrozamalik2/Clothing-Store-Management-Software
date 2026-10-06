'use strict';

// Prepares existing data for the barcode system. Idempotent. Run with --dry-run first.
//
// 1. Stops without writing if any barcode is used twice inside one company, since the
//    new unique indexes would fail to build. Resolve those first, then run again.
// 2. Drops the old non-unique company+barcode index and builds the unique indexes.
// 3. Marks existing barcodes as external. Their values are never changed.
// 4. Grandfathers EXTERNAL_BARCODE on for companies that already use manufacturer
//    barcodes but whose category has it off. It is set as a company override, so a
//    later Super Admin change is never reverted.

const Product          = require('../models/Product');
const Company          = require('../models/Company');
const BusinessCategory = require('../models/BusinessCategory');

const LEGACY_INDEX = 'company_id_1_barcode_1';
const isSet = (v) => typeof v === 'string' && v !== '';

function scan(products) {
  const seen = new Map();
  const companiesWithExternal = new Set();
  let productsToType = 0;
  let variantsToType = 0;

  const add = (companyId, code) => {
    const key = `${companyId}|${code}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  };

  for (const p of products) {
    const cid = String(p.company_id);
    if (isSet(p.barcode)) {
      add(cid, p.barcode);
      if (!p.barcode_type) productsToType++;
      if (p.barcode_type !== 'internal') companiesWithExternal.add(cid);
    }
    for (const v of p.variants || []) {
      if (!isSet(v.barcode)) continue;
      add(cid, v.barcode);
      if (!v.barcode_type) variantsToType++;
      if (v.barcode_type !== 'internal') companiesWithExternal.add(cid);
    }
  }

  const duplicates = [...seen.values()].filter(n => n > 1).length;
  return { duplicates, companiesWithExternal, productsToType, variantsToType };
}

async function setupBarcodes({ dryRun = false } = {}) {
  const products = await Product.find(
    {},
    { company_id: 1, barcode: 1, barcode_type: 1, 'variants.barcode': 1, 'variants.barcode_type': 1 }
  ).lean();

  const { duplicates, companiesWithExternal, productsToType, variantsToType } = scan(products);
  const result = {
    dryRun,
    duplicates,
    blocked: duplicates > 0,
    legacyIndexDropped: false,
    productBarcodesTyped: productsToType,
    variantBarcodesTyped: variantsToType,
    companiesGrandfathered: 0,
  };
  if (result.blocked) return result;

  const existing = await Product.collection.indexes().catch(() => []);
  result.legacyIndexDropped = existing.some(i => i.name === LEGACY_INDEX && !i.unique);

  for (const cid of companiesWithExternal) {
    const company = await Company.findById(cid, { business_category: 1, features: 1 }).lean();
    if (!company || company.features?.EXTERNAL_BARCODE !== undefined) continue;
    const category = await BusinessCategory.findOne({ key: company.business_category }, { features: 1 }).lean();
    if (category?.features?.EXTERNAL_BARCODE !== false) continue;
    result.companiesGrandfathered++;
    if (!dryRun) {
      await Company.updateOne({ _id: company._id }, { $set: { 'features.EXTERNAL_BARCODE': true } });
    }
  }

  if (dryRun) return result;

  if (result.legacyIndexDropped) await Product.collection.dropIndex(LEGACY_INDEX);

  const now = new Date();
  if (productsToType) {
    await Product.updateMany(
      { barcode: { $nin: [null, ''] }, barcode_type: null },
      { $set: { barcode_type: 'external', updated_at: now } }
    );
  }
  if (variantsToType) {
    await Product.updateMany(
      { 'variants.barcode': { $type: 'string' } },
      { $set: { 'variants.$[v].barcode_type': 'external' } },
      { arrayFilters: [{ 'v.barcode': { $nin: [null, ''] }, 'v.barcode_type': null }] }
    );
  }

  await Product.createIndexes();
  return result;
}

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
  const mongoose = require('mongoose');
  const dryRun = process.argv.includes('--dry-run');

  (async () => {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const result = await setupBarcodes({ dryRun });
    console.log(JSON.stringify(result));
    await mongoose.disconnect();
  })().catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { setupBarcodes };
