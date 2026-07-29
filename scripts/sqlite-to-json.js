/**
 * SQLite → Backup JSON converter
 *
 * Usage:
 *   node scripts/sqlite-to-json.js <path-to-your.db> [output.json]
 *
 * Example:
 *   node scripts/sqlite-to-json.js "C:\Users\you\sas-garments.db"
 *   node scripts/sqlite-to-json.js mydata.db backup-export.json
 *
 * The output .json file can be uploaded via Settings → Backup & Restore → Restore Backup
 */

'use strict';

const Database = require('better-sqlite3');
const fs       = require('fs');
const path     = require('path');

const dbPath  = process.argv[2];
const outPath = process.argv[3] || `backup-from-sqlite-${new Date().toISOString().slice(0,10)}.json`;

if (!dbPath) {
  console.error('Usage: node scripts/sqlite-to-json.js <path-to.db> [output.json]');
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error(`File not found: ${dbPath}`);
  process.exit(1);
}

console.log(`Reading: ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

function readTable(name) {
  try {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    console.log(`  ${name}: ${rows.length} rows`);
    return rows;
  } catch {
    console.log(`  ${name}: (table not found, skipped)`);
    return [];
  }
}

// Read all tables
const categories    = readTable('categories');
const brands        = readTable('brands');
const suppliers     = readTable('suppliers');
const products      = readTable('products');
const customers     = readTable('customers');
const sales         = readTable('sales');
const sale_items    = readTable('sale_items');
const purchases     = readTable('purchases');
const purchase_items = readTable('purchase_items');
const expenses      = readTable('expenses');
const users         = readTable('users');
const settings      = readTable('settings');

// Try to read company info from settings or a companies table
const companyRows = readTable('companies');
const company = companyRows[0] || {};

// Strip password hashes from users for safety
const safeUsers = users.map(({ password, password_hash, ...rest }) => rest);

const backup = {
  version:     '1.0',
  exported_at: new Date().toISOString(),
  source:      'sqlite-migration',
  company,
  data: {
    settings,
    categories,
    brands,
    suppliers,
    products,
    customers,
    sales,
    sale_items,
    purchases,
    purchase_items,
    expenses,
    users: safeUsers,
  },
};

fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');
console.log(`\nDone! Backup saved to: ${path.resolve(outPath)}`);
console.log(`\nNext step: Go to Settings → Backup & Restore → click "Restore Backup…" and upload this file.`);

db.close();
