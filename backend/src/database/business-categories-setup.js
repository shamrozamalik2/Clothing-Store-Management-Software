'use strict';

// Seeds the default business categories and assigns CLOTHING to any company that
// has none. Idempotent: existing categories are never overwritten, and companies that
// already have a category are left alone. Run with --dry-run first.

const BusinessCategory = require('../models/BusinessCategory');
const Company          = require('../models/Company');
const { DEFAULT_CATEGORIES } = require('../config/business-category-presets');

const COMPANY_WITHOUT_CATEGORY = {
  $or: [
    { business_category: { $exists: false } },
    { business_category: null },
    { business_category: '' },
  ],
};

// Features turned on for existing categories exactly once, so companies that
// already use them keep access. Recorded in `grandfathered`, so a later
// Super Admin change is never reverted.
const GRANDFATHERED = { CLOTHING: ['MANUFACTURING'] };

async function setupBusinessCategories({ dryRun = false } = {}) {
  let categoriesCreated = 0;
  for (const preset of DEFAULT_CATEGORIES) {
    if (await BusinessCategory.exists({ key: preset.key })) continue;
    categoriesCreated++;
    if (!dryRun) await BusinessCategory.create(preset);
  }

  let grandfathered = 0;
  for (const [key, features] of Object.entries(GRANDFATHERED)) {
    for (const feature of features) {
      const pending = { key, grandfathered: { $ne: feature } };
      if (dryRun) { grandfathered += await BusinessCategory.countDocuments(pending); continue; }
      const res = await BusinessCategory.updateOne(pending, {
        $set: { [`features.${feature}`]: true },
        $push: { grandfathered: feature },
      });
      grandfathered += res.modifiedCount;
    }
  }

  const companiesBackfilled = dryRun
    ? await Company.countDocuments(COMPANY_WITHOUT_CATEGORY)
    : (await Company.updateMany(COMPANY_WITHOUT_CATEGORY, { $set: { business_category: 'CLOTHING' } })).modifiedCount;

  return { dryRun, categoriesCreated, grandfathered, companiesBackfilled };
}

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
  const mongoose = require('mongoose');
  const dryRun = process.argv.includes('--dry-run');

  (async () => {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    const result = await setupBusinessCategories({ dryRun });
    console.log(JSON.stringify(result));
    await mongoose.disconnect();
  })().catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { setupBusinessCategories };
