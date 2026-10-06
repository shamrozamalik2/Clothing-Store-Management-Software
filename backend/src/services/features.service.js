'use strict';

const Company          = require('../models/Company');
const BusinessCategory = require('../models/BusinessCategory');
const { FEATURES, FEATURE_KEYS, LEGACY_TO_KEY } = require('../config/features');

// Resolution order for each feature: the company's own setting, then its business
// category, then on. "Missing means on" keeps existing companies working.
const TTL_MS = 60 * 1000;
const cache = new Map();

function companyOverrides(features) {
  const out = {};
  for (const [name, value] of Object.entries(features || {})) {
    if (typeof value !== 'boolean') continue;
    const key = LEGACY_TO_KEY[name] || name;
    if (FEATURE_KEYS.has(key)) out[key] = value;
  }
  return out;
}

async function computeEffective(companyId) {
  const company = await Company.findById(companyId, { business_category: 1, features: 1 }).lean();
  if (!company) return null;

  const category = await BusinessCategory.findOne({ key: company.business_category }).lean();
  const categoryMap = category?.features || {};
  const overrides = companyOverrides(company.features);

  const features = {};
  for (const f of FEATURES) {
    if (typeof overrides[f.key] === 'boolean') features[f.key] = overrides[f.key];
    else if (typeof categoryMap[f.key] === 'boolean') features[f.key] = categoryMap[f.key];
    else features[f.key] = true;
  }
  return { business_category: company.business_category, features };
}

async function getEffectiveFeatures(companyId) {
  const id = String(companyId);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await computeEffective(id);
  cache.set(id, { at: Date.now(), value });
  return value;
}

async function isFeatureEnabled(companyId, key) {
  if (!FEATURE_KEYS.has(key)) throw new Error(`Unknown feature "${key}".`);
  const effective = await getEffectiveFeatures(companyId);
  return effective?.features[key] === true;
}

function invalidateCompany(companyId) { cache.delete(String(companyId)); }
function invalidateAll() { cache.clear(); }

module.exports = { getEffectiveFeatures, isFeatureEnabled, invalidateCompany, invalidateAll, computeEffective };
