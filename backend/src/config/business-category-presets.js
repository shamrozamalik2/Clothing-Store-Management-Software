'use strict';

const { FEATURES } = require('./features');

// Starting configuration for each category. Super Admin can change any of these
// after they are seeded; the seed never overwrites an existing category.
const ENABLED = {
  CLOTHING: [
    'PRODUCTS', 'INVENTORY', 'POS', 'SALES', 'RETURNS', 'PURCHASES', 'CUSTOMERS', 'SUPPLIERS',
    'STOCK_ALERTS', 'REPORTS', 'EXPENSES', 'AUDIT', 'MOBILE_APP', 'HR', 'LEDGER', 'REPORTS_ADVANCED',
    'BARCODE', 'INTERNAL_BARCODE', 'VARIANTS', 'SIZE', 'COLOR', 'MANUFACTURING',
  ],
  GENERAL_STORE: [
    'PRODUCTS', 'INVENTORY', 'POS', 'SALES', 'RETURNS', 'PURCHASES', 'CUSTOMERS', 'SUPPLIERS',
    'STOCK_ALERTS', 'REPORTS', 'MOBILE_APP', 'BARCODE', 'INTERNAL_BARCODE', 'EXTERNAL_BARCODE',
    'EXPIRY', 'BATCH_TRACKING',
  ],
  PHARMACY: [
    'PRODUCTS', 'INVENTORY', 'POS', 'SALES', 'RETURNS', 'PURCHASES', 'CUSTOMERS', 'SUPPLIERS',
    'STOCK_ALERTS', 'REPORTS', 'MOBILE_APP', 'BARCODE', 'INTERNAL_BARCODE', 'EXTERNAL_BARCODE',
    'EXPIRY', 'BATCH_TRACKING', 'MEDICINE', 'PRESCRIPTION',
  ],
  BOBBIN_FACTORY: [
    'PRODUCTS', 'INVENTORY', 'PURCHASES', 'SUPPLIERS', 'STOCK_ALERTS', 'REPORTS', 'EXPENSES',
    'HR', 'MANUFACTURING', 'RAW_MATERIALS', 'PRODUCTION', 'BARCODE', 'INTERNAL_BARCODE',
  ],
  OTHER: [
    'PRODUCTS', 'INVENTORY', 'POS', 'SALES', 'RETURNS', 'PURCHASES', 'CUSTOMERS', 'SUPPLIERS',
    'STOCK_ALERTS', 'REPORTS', 'BARCODE', 'INTERNAL_BARCODE', 'EXTERNAL_BARCODE',
  ],
};

const DEFAULT_CATEGORIES = [
  { key: 'CLOTHING',       name: 'Clothing Store',         description: 'Apparel with sizes, colors and variants.', sort_order: 1 },
  { key: 'GENERAL_STORE',  name: 'General Store / Grocery', description: 'Fast barcode workflows, expiry and batches.', sort_order: 2 },
  { key: 'PHARMACY',       name: 'Pharmacy',                description: 'Medicines with batches, expiry and prescriptions.', sort_order: 3 },
  { key: 'BOBBIN_FACTORY', name: 'Bobbin Factory / Manufacturing', description: 'Raw materials, bills of materials and production.', sort_order: 4 },
  { key: 'OTHER',          name: 'Other',                   description: 'Generic baseline for new business types.', sort_order: 99 },
].map(c => ({ ...c, is_active: true, features: buildFeatureMap(ENABLED[c.key]) }));

function buildFeatureMap(enabledKeys) {
  const enabled = new Set(enabledKeys);
  return Object.fromEntries(FEATURES.map(f => [f.key, enabled.has(f.key)]));
}

module.exports = { DEFAULT_CATEGORIES, buildFeatureMap };
