'use strict';

const Company          = require('../models/Company');
const BusinessCategory = require('../models/BusinessCategory');
const { FEATURES, FEATURE_KEYS } = require('../config/features');

const KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;

function normalizeCategoryKey(key) {
  const k = String(key || '').trim().toUpperCase();
  if (!KEY_PATTERN.test(k)) throw new Error('Category key must be 2-40 characters: letters, digits and underscores, starting with a letter.');
  return k;
}

// Accepts a partial or full map of registry keys to booleans. Rejects anything else,
// so a typo or an unknown feature can never be stored.
function sanitizeFeatures(input) {
  if (input == null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('features must be an object of feature keys to true/false.');
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!FEATURE_KEYS.has(key)) throw new Error(`Unknown feature "${key}".`);
    if (typeof value !== 'boolean') throw new Error(`Feature "${key}" must be true or false.`);
    out[key] = value;
  }
  return out;
}

// Returns a complete map where every registry key is present; missing keys are off.
function completeFeatureMap(partial = {}) {
  return Object.fromEntries(FEATURES.map(f => [f.key, Boolean(partial[f.key])]));
}

async function findCategory(key) {
  return BusinessCategory.findOne({ key: normalizeCategoryKey(key) }).lean();
}

// Used when assigning a category to a company: it must exist and be active.
async function assertAssignable(key) {
  const category = await findCategory(key);
  if (!category) throw new Error(`Business category "${key}" does not exist.`);
  if (!category.is_active) throw new Error(`Business category "${key}" is inactive and cannot be assigned.`);
  return category;
}

async function getCategoryForCompany(companyId) {
  const company = await Company.findById(companyId, { business_category: 1 }).lean();
  if (!company) return null;
  return BusinessCategory.findOne({ key: company.business_category }).lean();
}

module.exports = {
  KEY_PATTERN,
  normalizeCategoryKey,
  sanitizeFeatures,
  completeFeatureMap,
  findCategory,
  assertAssignable,
  getCategoryForCompany,
};
