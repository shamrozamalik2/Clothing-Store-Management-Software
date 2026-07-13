'use strict';

const bcrypt = require('bcryptjs');
const { env } = require('../../config/env');

// ─────────────────────────────────────────────────────────────────────────────
// Set these in .env before first deploy to configure each client's company.
// ─────────────────────────────────────────────────────────────────────────────
const COMPANY_NAME     = process.env.COMPANY_NAME     || 'SAS Garments';
const COMPANY_SLUG     = process.env.COMPANY_SLUG     || 'sas-garments';
const COMPANY_EMAIL    = process.env.COMPANY_EMAIL    || '';
const COMPANY_PHONE    = process.env.COMPANY_PHONE    || '';

const ADMIN_NAME       = process.env.ADMIN_NAME       || 'Admin';
const ADMIN_EMAIL      = process.env.ADMIN_EMAIL      || 'admin@sasgarments.com';
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD   || 'admin@098';

const adminPermissions = {
  dashboard:  true,
  products:   { view: true, create: true, update: true, delete: true },
  categories: { view: true, create: true, update: true, delete: true },
  brands:     { view: true, create: true, update: true, delete: true },
  suppliers:  { view: true, create: true, update: true, delete: true },
  customers:  { view: true, create: true, update: true, delete: true },
  purchases:  { view: true, create: true, update: true, delete: true },
  sales:      { view: true, create: true, update: true, delete: true },
  pos:        true,
  expenses:   { view: true, create: true, update: true, delete: true },
  reports:    true,
  inventory:  { view: true, adjust: true },
  users:      { view: true, create: true, update: true, delete: true },
  settings:   true,
  backup:     true,
  audit_logs: true,
};

const managerPermissions = {
  dashboard:  true,
  products:   { view: true, create: true, update: true, delete: false },
  categories: { view: true, create: true, update: true, delete: false },
  brands:     { view: true, create: true, update: true, delete: false },
  suppliers:  { view: true, create: true, update: true, delete: false },
  customers:  { view: true, create: true, update: true, delete: false },
  purchases:  { view: true, create: true, update: true, delete: false },
  sales:      { view: true, create: true, update: true, delete: false },
  pos:        true,
  expenses:   { view: true, create: true, update: true, delete: false },
  reports:    true,
  inventory:  { view: true, adjust: true },
  users:      { view: true, create: false, update: false, delete: false },
  settings:   false,
  backup:     true,
  audit_logs: false,
};

const cashierPermissions = {
  dashboard:  true,
  products:   { view: true,  create: false, update: false, delete: false },
  categories: { view: true,  create: false, update: false, delete: false },
  brands:     { view: true,  create: false, update: false, delete: false },
  suppliers:  { view: false, create: false, update: false, delete: false },
  customers:  { view: true,  create: true,  update: true,  delete: false },
  purchases:  { view: false, create: false, update: false, delete: false },
  sales:      { view: true,  create: true,  update: false, delete: false },
  pos:        true,
  expenses:   { view: false, create: false, update: false, delete: false },
  reports:    false,
  inventory:  { view: true, adjust: false },
  users:      { view: false, create: false, update: false, delete: false },
  settings:   false,
  backup:     false,
  audit_logs: false,
};

const migration = {
  version: 2,
  name: '002_seed_data',

  async up(client) {
    // ── Company ──────────────────────────────────────────────────────────────
    const companyRes = await client.query(
      `INSERT INTO companies (name, slug, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [COMPANY_NAME, COMPANY_SLUG, COMPANY_EMAIL || null, COMPANY_PHONE || null]
    );
    const companyId = companyRes.rows[0].id;

    // ── Default branch ───────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO branches (company_id, name, is_default)
       VALUES ($1, 'Main Branch', TRUE)
       ON CONFLICT DO NOTHING`,
      [companyId]
    );

    // ── Roles ────────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO roles (company_id, name, label, permissions, is_system)
       VALUES
         ($1, 'admin',   'Administrator', $2::jsonb, TRUE),
         ($1, 'manager', 'Manager',       $3::jsonb, TRUE),
         ($1, 'cashier', 'Cashier',       $4::jsonb, TRUE)
       ON CONFLICT (company_id, name) DO NOTHING`,
      [companyId,
       JSON.stringify(adminPermissions),
       JSON.stringify(managerPermissions),
       JSON.stringify(cashierPermissions)]
    );

    // ── Admin user ───────────────────────────────────────────────────────────
    const { rows: [adminRole] } = await client.query(
      'SELECT id FROM roles WHERE company_id = $1 AND name = $2',
      [companyId, 'admin']
    );

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
    await client.query(
      `INSERT INTO users (company_id, role_id, name, email, password, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (company_id, email) DO NOTHING`,
      [companyId, adminRole.id, ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hashed]
    );

    // ── Walk-in customer ─────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO customers (company_id, name, phone, customer_group)
       VALUES ($1, 'Walk-in Customer', '0000000000', 'general')
       ON CONFLICT DO NOTHING`,
      [companyId]
    );

    // ── Expense categories ───────────────────────────────────────────────────
    const expCats = [
      'Rent', 'Utilities', 'Salaries', 'Transport',
      'Marketing', 'Maintenance', 'Office Supplies', 'Miscellaneous',
    ];
    for (const name of expCats) {
      await client.query(
        `INSERT INTO expense_categories (company_id, name)
         VALUES ($1, $2)
         ON CONFLICT (company_id, name) DO NOTHING`,
        [companyId, name]
      );
    }

    // ── Default settings ─────────────────────────────────────────────────────
    const settings = [
      ['app_name',           COMPANY_NAME,              'string',  'general',   'Application Name'],
      ['app_currency',       'PKR',                     'string',  'general',   'Currency Code'],
      ['currency_symbol',    '₨',                       'string',  'general',   'Currency Symbol'],
      ['currency_position',  'before',                  'string',  'general',   'Currency Position'],
      ['decimal_places',     '2',                       'number',  'general',   'Decimal Places'],
      ['date_format',        'DD/MM/YYYY',              'string',  'general',   'Date Format'],
      ['time_format',        '12h',                     'string',  'general',   'Time Format'],
      ['language',           'en',                      'string',  'general',   'Language'],
      ['theme',              'dark',                    'string',  'general',   'UI Theme'],
      ['business_name',      COMPANY_NAME,              'string',  'business',  'Business Name'],
      ['business_phone',     COMPANY_PHONE,             'string',  'business',  'Business Phone'],
      ['business_email',     COMPANY_EMAIL,             'string',  'business',  'Business Email'],
      ['business_address',   '',                        'string',  'business',  'Business Address'],
      ['business_city',      '',                        'string',  'business',  'City'],
      ['business_logo',      '',                        'string',  'business',  'Logo Path'],
      ['tax_number',         '',                        'string',  'business',  'Tax/NTN Number'],
      ['pos_tax_enabled',    '0',                       'boolean', 'pos',       'Enable Tax in POS'],
      ['pos_tax_rate',       '0',                       'number',  'pos',       'Default Tax Rate (%)'],
      ['pos_discount_max',   '100',                     'number',  'pos',       'Max Discount (%)'],
      ['pos_receipt_auto',   '1',                       'boolean', 'pos',       'Auto-print Receipt'],
      ['pos_loyalty',        '0',                       'boolean', 'pos',       'Enable Loyalty Points'],
      ['low_stock_threshold','5',                       'number',  'inventory', 'Default Low Stock Alert'],
      ['allow_negative_stock','0',                      'boolean', 'inventory', 'Allow Negative Stock'],
      ['receipt_header',     'Thank you for shopping!', 'string',  'receipt',   'Receipt Header'],
      ['receipt_footer',     'Visit us again.',         'string',  'receipt',   'Receipt Footer'],
      ['receipt_show_tax',   '1',                       'boolean', 'receipt',   'Show Tax on Receipt'],
    ];

    for (const [key, value, type, group_name, label] of settings) {
      await client.query(
        `INSERT INTO settings (company_id, key, value, type, group_name, label)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, key) DO NOTHING`,
        [companyId, key, value, type, group_name, label]
      );
    }
  },

  async down(client) {
    await client.query(`DELETE FROM settings`);
    await client.query(`DELETE FROM expense_categories`);
    await client.query(`DELETE FROM customers WHERE phone = '0000000000'`);
    await client.query(`DELETE FROM users WHERE email = $1`, [ADMIN_EMAIL.toLowerCase()]);
    await client.query(`DELETE FROM roles`);
    await client.query(`DELETE FROM branches`);
    await client.query(`DELETE FROM companies WHERE slug = $1`, [COMPANY_SLUG]);
  },
};

module.exports = migration;
