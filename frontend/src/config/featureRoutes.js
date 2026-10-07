// Single source of truth for "which module does this page belong to". The sidebar uses it to
// hide a nav item, and the router uses it to show a clear message if the page is opened anyway
// (direct link, bookmark, or a nav item that hasn't caught up yet). A path left out here is
// never module-gated (Dashboard, Settings, Users, Roles and so on stay available to everyone).
export const FEATURE_BY_PATH = {
  '/products': 'PRODUCTS', '/categories': 'PRODUCTS', '/brands': 'PRODUCTS',
  '/inventory/adjust': 'INVENTORY', '/barcodes': 'BARCODE',
  '/pos': 'POS', '/sales': 'SALES', '/returns': 'RETURNS', '/purchases': 'PURCHASES',
  '/expenses': 'EXPENSES', '/customers': 'CUSTOMERS', '/suppliers': 'SUPPLIERS',
  '/reports': 'REPORTS', '/manufacturing': 'MANUFACTURING', '/hr': 'HR',
  '/ledger': 'LEDGER', '/audit': 'AUDIT',
};

// Friendly names for the "not enabled" message. Falls back to the feature key itself.
export const FEATURE_LABELS = {
  PRODUCTS: 'Products', INVENTORY: 'Stock Adjustments', BARCODE: 'Product Barcode',
  POS: 'POS / Billing', SALES: 'Sales', RETURNS: 'Returns & Exchanges', PURCHASES: 'Purchases',
  EXPENSES: 'Expenses', CUSTOMERS: 'Customers', SUPPLIERS: 'Suppliers', REPORTS: 'Reports',
  MANUFACTURING: 'Manufacturing', HR: 'HR & Payroll', LEDGER: 'Ledger', AUDIT: 'Audit Trail',
};
