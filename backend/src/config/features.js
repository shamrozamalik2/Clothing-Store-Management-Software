'use strict';

// Central feature registry. Business-category presets and company overrides may only
// reference keys listed here. `legacyKey` maps the flags already stored in
// Company.features so existing data keeps its meaning.
const FEATURES = [
  { key: 'PRODUCTS',         group: 'core',          label: 'Products' },
  { key: 'INVENTORY',        group: 'core',          label: 'Inventory' },
  { key: 'POS',              group: 'core',          label: 'POS / Billing' },
  { key: 'SALES',            group: 'core',          label: 'Sales' },
  { key: 'RETURNS',          group: 'core',          label: 'Returns & exchanges' },
  { key: 'PURCHASES',        group: 'core',          label: 'Purchases' },
  { key: 'CUSTOMERS',        group: 'core',          label: 'Customers' },
  { key: 'SUPPLIERS',        group: 'core',          label: 'Suppliers' },
  { key: 'STOCK_ALERTS',     group: 'core',          label: 'Low stock alerts' },
  { key: 'REPORTS',          group: 'core',          label: 'Reports' },
  { key: 'EXPENSES',         group: 'core',          label: 'Expenses' },
  { key: 'HR',               group: 'core',          label: 'HR & Payroll',        legacyKey: 'hr' },
  { key: 'LEDGER',           group: 'core',          label: 'Ledger / AR-AP',      legacyKey: 'ledger' },
  { key: 'AUDIT',            group: 'core',          label: 'Audit trail',         legacyKey: 'audit' },
  { key: 'MOBILE_APP',       group: 'core',          label: 'Mobile app access',   legacyKey: 'mobile_app' },
  { key: 'MULTI_BRANCH',     group: 'core',          label: 'Multi-branch',        legacyKey: 'multi_branch' },
  { key: 'REPORTS_ADVANCED', group: 'core',          label: 'Advanced reports',    legacyKey: 'reports_advanced' },
  { key: 'BARCODE',          group: 'barcode',       label: 'Barcode scanning' },
  { key: 'INTERNAL_BARCODE', group: 'barcode',       label: 'Internal PBC barcode' },
  { key: 'EXTERNAL_BARCODE', group: 'barcode',       label: 'External / manufacturer barcode' },
  { key: 'VARIANTS',         group: 'clothing',      label: 'Product variants' },
  { key: 'SIZE',             group: 'clothing',      label: 'Size' },
  { key: 'COLOR',            group: 'clothing',      label: 'Color' },
  { key: 'FABRIC',           group: 'clothing',      label: 'Fabric' },
  { key: 'EXPIRY',           group: 'expiry',        label: 'Expiry dates' },
  { key: 'BATCH_TRACKING',   group: 'expiry',        label: 'Batch / lot tracking' },
  { key: 'MEDICINE',         group: 'pharmacy',      label: 'Medicine information' },
  { key: 'PRESCRIPTION',     group: 'pharmacy',      label: 'Prescriptions' },
  { key: 'MANUFACTURING',    group: 'manufacturing', label: 'Manufacturing / BOM', legacyKey: 'manufacturing' },
  { key: 'RAW_MATERIALS',    group: 'manufacturing', label: 'Raw materials' },
  { key: 'PRODUCTION',       group: 'manufacturing', label: 'Production batches' },
];

const FEATURE_KEYS = new Set(FEATURES.map(f => f.key));
const LEGACY_TO_KEY = Object.fromEntries(FEATURES.filter(f => f.legacyKey).map(f => [f.legacyKey, f.key]));

module.exports = { FEATURES, FEATURE_KEYS, LEGACY_TO_KEY };
