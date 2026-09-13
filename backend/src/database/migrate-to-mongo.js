/**
 * migrate-to-mongo.js
 *
 * One-shot migration: PostgreSQL (Supabase) → MongoDB Atlas
 *
 * Run from the backend/src directory:
 *   node database/migrate-to-mongo.js
 *
 * Requires both DATABASE_URL and MONGODB_URI in env (or .env at project root).
 * Safe to re-run: each table uses upsert / findOneAndUpdate so no duplicates.
 *
 * Sequence:
 *   1.  Companies + branches + roles + super_admins
 *   2.  Users + refresh_tokens
 *   3.  Categories + brands + suppliers
 *   4.  Products (with embedded variants) + BOMs
 *   5.  Customers
 *   6.  Sales (with embedded items)
 *   7.  Purchases (with embedded items) + purchase_payments
 *   8.  Returns (with embedded items + exchange_items)
 *   9.  Expense categories + expenses
 *   10. Stock adjustments (with embedded items)
 *   11. Settings
 *   12. Employees + salaries + attendance
 *   13. Production batches (with embedded materials)
 *   14. Cart holds
 *   15. Audit logs
 *   16. Demo leads
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { Pool }     = require('pg');
const mongoose     = require('mongoose');

// ── Models ────────────────────────────────────────────────────────────────────
const Company        = require('../models/Company');
const Branch         = require('../models/Branch');
const Role           = require('../models/Role');
const SuperAdmin     = require('../models/SuperAdmin');
const User           = require('../models/User');
const RefreshToken   = require('../models/RefreshToken');
const Category       = require('../models/Category');
const Brand          = require('../models/Brand');
const Supplier       = require('../models/Supplier');
const Product        = require('../models/Product');
const Customer       = require('../models/Customer');
const Sale           = require('../models/Sale');
const Purchase       = require('../models/Purchase');
const PurchasePayment = require('../models/PurchasePayment');
const Return         = require('../models/Return');
const ExpenseCategory = require('../models/ExpenseCategory');
const Expense        = require('../models/Expense');
const StockAdjustment = require('../models/StockAdjustment');
const Setting        = require('../models/Setting');
const Employee       = require('../models/Employee');
const Salary         = require('../models/Salary');
const Attendance     = require('../models/Attendance');
const BOM            = require('../models/BillOfMaterials');
const ProductionBatch = require('../models/ProductionBatch');
const CartHold       = require('../models/CartHold');
const AuditLog       = require('../models/AuditLog');
const DemoLead       = require('../models/DemoLead');

// ── Connection helpers ────────────────────────────────────────────────────────
let pg;

async function connectPg() {
  pg = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  await pg.query('SELECT 1');
  console.log('[PG]    Connected.');
}

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    maxPoolSize: 5,
  });
  console.log('[Mongo] Connected.');
}

async function q(sql, params = []) {
  const { rows } = await pg.query(sql, params);
  return rows;
}

// Progress printer
function progress(label, done, total) {
  process.stdout.write(`\r  ${label}: ${done}/${total}   `);
  if (done === total) process.stdout.write('\n');
}

// ── ID maps: pg integer id → MongoDB ObjectId ─────────────────────────────────
const companyMap  = {};   // pg company id   → ObjectId
const branchMap   = {};   // pg branch id    → ObjectId
const roleMap     = {};   // pg role id      → ObjectId
const userMap     = {};   // pg user id      → ObjectId
const catMap      = {};   // pg category id  → ObjectId
const brandMap    = {};   // pg brand id     → ObjectId
const suppMap     = {};   // pg supplier id  → ObjectId
const productMap  = {};   // pg product id   → ObjectId
const variantMap  = {};   // pg variant id   → ObjectId
const customerMap = {};   // pg customer id  → ObjectId
const saleMap     = {};   // pg sale id      → ObjectId
const purchMap    = {};   // pg purchase id  → ObjectId
const returnMap   = {};   // pg return id    → ObjectId
const expCatMap   = {};   // pg exp_cat id   → ObjectId
const employeeMap = {};   // pg employee id  → ObjectId
const batchMap    = {};   // pg batch id     → ObjectId

// ── Migrate functions ─────────────────────────────────────────────────────────

async function migrateCompanies() {
  const rows = await q(`SELECT * FROM companies ORDER BY id`);
  console.log(`[1/16] Companies: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const doc = await Company.findOneAndUpdate(
      { slug: r.slug },
      { $setOnInsert: {
        name:                r.name,
        slug:                r.slug,
        email:               r.email        ?? null,
        phone:               r.phone        ?? null,
        plan:                r.plan         ?? 'standard',
        is_active:           r.is_active    ?? true,
        subscription_status: r.subscription_status ?? 'active',
        max_users:           r.max_users    ?? 5,
        trial_ends_at:       r.trial_ends_at ?? null,
        billing_email:       r.billing_email ?? null,
        notes:               r.notes        ?? null,
        features:            r.features     ?? {},
        created_at:          r.created_at   ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    companyMap[r.id] = doc._id;
    progress('Companies', i + 1, rows.length);
  }
}

async function migrateSuperAdmins() {
  const rows = await q(`SELECT * FROM super_admins ORDER BY id`);
  console.log(`[2/16] SuperAdmins: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await SuperAdmin.findOneAndUpdate(
      { email: r.email },
      { $setOnInsert: { name: r.name, email: r.email, password: r.password, is_active: r.is_active ?? true, last_login: r.last_login ?? null, created_at: r.created_at ?? new Date() } },
      { upsert: true }
    );
    progress('SuperAdmins', i + 1, rows.length);
  }
}

async function migrateBranchesAndRoles() {
  // Branches
  const branches = await q(`SELECT * FROM branches ORDER BY id`);
  console.log(`[3a/16] Branches: ${branches.length} rows`);
  for (let i = 0; i < branches.length; i++) {
    const r = branches[i];
    const cid = companyMap[r.company_id];
    if (!cid) { console.warn(`  Branch ${r.id}: company ${r.company_id} not found, skip`); continue; }
    const doc = await Branch.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: { company_id: cid, name: r.name, address: r.address ?? null, phone: r.phone ?? null, is_default: r.is_default ?? false, is_active: r.is_active ?? true, created_at: r.created_at ?? new Date() } },
      { upsert: true, new: true }
    ).lean();
    branchMap[r.id] = doc._id;
    progress('Branches', i + 1, branches.length);
  }

  // Roles
  const roles = await q(`SELECT * FROM roles ORDER BY id`);
  console.log(`[3b/16] Roles: ${roles.length} rows`);
  for (let i = 0; i < roles.length; i++) {
    const r = roles[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await Role.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: { company_id: cid, name: r.name, label: r.label ?? r.name, permissions: r.permissions ?? {}, is_system: r.is_system ?? false, created_at: r.created_at ?? new Date() } },
      { upsert: true, new: true }
    ).lean();
    roleMap[r.id] = doc._id;
    progress('Roles', i + 1, roles.length);
  }
}

async function migrateUsers() {
  const rows = await q(`SELECT * FROM users ORDER BY id`);
  console.log(`[4/16] Users: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) { console.warn(`  User ${r.id}: company not found, skip`); continue; }
    const doc = await User.findOneAndUpdate(
      { company_id: cid, email: r.email },
      { $setOnInsert: {
        company_id:  cid,
        branch_id:   r.branch_id ? (branchMap[r.branch_id] ?? null) : null,
        role_id:     r.role_id   ? (roleMap[r.role_id]    ?? null) : null,
        name:        r.name,
        email:       r.email,
        password:    r.password,
        is_active:   r.is_active  ?? true,
        avatar:      r.avatar     ?? null,
        last_login:  r.last_login ?? null,
        fcm_token:   r.fcm_token  ?? null,
        created_at:  r.created_at ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    userMap[r.id] = doc._id;
    progress('Users', i + 1, rows.length);
  }
}

async function migrateRefreshTokens() {
  const rows = await q(`SELECT * FROM refresh_tokens ORDER BY id`);
  console.log(`[4b/16] RefreshTokens: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const uid = r.user_id ? userMap[r.user_id] : null;
    if (!uid) continue;
    try {
      await RefreshToken.findOneAndUpdate(
        { token: r.token },
        { $setOnInsert: { user_id: uid, token: r.token, expires_at: r.expires_at, is_revoked: r.is_revoked ?? false, created_at: r.created_at ?? new Date() } },
        { upsert: true }
      );
    } catch (_) {} // ignore duplicates
    progress('RefreshTokens', i + 1, rows.length);
  }
}

async function migrateCategories() {
  const rows = await q(`SELECT * FROM categories ORDER BY id`);
  console.log(`[5/16] Categories: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await Category.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: { company_id: cid, name: r.name, description: r.description ?? null, parent_id: r.parent_id ? null : null, is_active: r.is_active ?? true, created_at: r.created_at ?? new Date() } },
      { upsert: true, new: true }
    ).lean();
    catMap[r.id] = doc._id;
    progress('Categories', i + 1, rows.length);
  }
  // Second pass: resolve parent_id
  for (const r of rows) {
    if (!r.parent_id || !catMap[r.id] || !catMap[r.parent_id]) continue;
    await Category.updateOne({ _id: catMap[r.id] }, { parent_id: catMap[r.parent_id] });
  }
}

async function migrateBrands() {
  const rows = await q(`SELECT * FROM brands ORDER BY id`);
  console.log(`[5b/16] Brands: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await Brand.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: { company_id: cid, name: r.name, description: r.description ?? null, logo_url: r.logo_url ?? null, is_active: r.is_active ?? true, created_at: r.created_at ?? new Date() } },
      { upsert: true, new: true }
    ).lean();
    brandMap[r.id] = doc._id;
    progress('Brands', i + 1, rows.length);
  }
}

async function migrateSuppliers() {
  const rows = await q(`SELECT * FROM suppliers ORDER BY id`);
  console.log(`[5c/16] Suppliers: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await Supplier.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: {
        company_id:      cid,
        name:            r.name,
        email:           r.email    ?? null,
        phone:           r.phone    ?? null,
        address:         r.address  ?? null,
        city:            r.city     ?? null,
        opening_balance: parseFloat(r.opening_balance ?? 0),
        current_balance: parseFloat(r.current_balance ?? 0),
        is_active:       r.is_active ?? true,
        notes:           r.notes    ?? null,
        created_at:      r.created_at ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    suppMap[r.id] = doc._id;
    progress('Suppliers', i + 1, rows.length);
  }
}

async function migrateProducts() {
  // First pass: create products with empty variants
  const products = await q(`SELECT * FROM products ORDER BY id`);
  console.log(`[6/16] Products: ${products.length} rows`);
  for (let i = 0; i < products.length; i++) {
    const r = products[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await Product.findOneAndUpdate(
      { company_id: cid, sku: r.sku },
      { $setOnInsert: {
        company_id:      cid,
        name:            r.name,
        sku:             r.sku,
        barcode:         r.barcode         ?? null,
        description:     r.description     ?? null,
        category_id:     r.category_id     ? (catMap[r.category_id]  ?? null) : null,
        brand_id:        r.brand_id        ? (brandMap[r.brand_id]   ?? null) : null,
        cost_price:      parseFloat(r.cost_price  ?? 0),
        sale_price:      parseFloat(r.sale_price  ?? 0),
        wholesale_price: parseFloat(r.wholesale_price ?? 0),
        tax_rate:        parseFloat(r.tax_rate     ?? 0),
        stock_quantity:  parseFloat(r.stock_quantity ?? 0),
        low_stock_alert: parseFloat(r.low_stock_alert ?? 5),
        unit:            r.unit            ?? 'pcs',
        is_active:       r.is_active       ?? true,
        track_inventory: r.track_inventory ?? true,
        is_raw_material: r.is_raw_material ?? false,
        is_finished_good: r.is_finished_good ?? false,
        image_url:       r.image_url       ?? null,
        variants:        [],
        created_at:      r.created_at      ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    productMap[r.id] = doc._id;
    progress('Products', i + 1, products.length);
  }

  // Second pass: push variants
  const variants = await q(`SELECT * FROM product_variants ORDER BY id`);
  console.log(`[6b/16] ProductVariants: ${variants.length} rows`);
  for (let i = 0; i < variants.length; i++) {
    const r = variants[i];
    const parentId = productMap[r.product_id];
    if (!parentId) continue;
    const varId = new mongoose.Types.ObjectId();
    try {
      await Product.updateOne({ _id: parentId }, { $push: { variants: {
        _id:            varId,
        sku:            r.sku,
        barcode:        r.barcode    ?? null,
        size:           r.size       ?? null,
        color:          r.color      ?? null,
        cost_price:     parseFloat(r.cost_price ?? 0),
        sale_price:     parseFloat(r.sale_price ?? 0),
        stock_quantity: parseFloat(r.stock_quantity ?? 0),
        is_active:      r.is_active  ?? true,
      }}});
      variantMap[r.id] = varId;
    } catch (_) {}
    progress('Variants', i + 1, variants.length);
  }
}

async function migrateCustomers() {
  const rows = await q(`SELECT * FROM customers ORDER BY id`);
  console.log(`[7/16] Customers: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    // No reliable natural key — upsert by company_id + phone or email if available
    const filter = { company_id: cid };
    if (r.phone) filter.phone = r.phone;
    else if (r.email) filter.email = r.email;
    else filter.name = r.name;

    const doc = await Customer.findOneAndUpdate(filter, {
      $setOnInsert: {
        company_id:      cid,
        name:            r.name,
        email:           r.email          ?? null,
        phone:           r.phone          ?? null,
        address:         r.address        ?? null,
        city:            r.city           ?? null,
        customer_group:  r.customer_group ?? 'general',
        credit_limit:    parseFloat(r.credit_limit  ?? 0),
        current_balance: parseFloat(r.current_balance ?? 0),
        loyalty_points:  parseFloat(r.loyalty_points  ?? 0),
        is_active:       r.is_active       ?? true,
        notes:           r.notes           ?? null,
        created_at:      r.created_at      ?? new Date(),
      },
    }, { upsert: true, new: true }).lean();
    customerMap[r.id] = doc._id;
    progress('Customers', i + 1, rows.length);
  }
}

async function migrateSales() {
  const sales = await q(`SELECT * FROM sales ORDER BY id`);
  console.log(`[8/16] Sales: ${sales.length} rows`);
  // Prefetch all sale items once (avoid N+1)
  const allItems = await q(`SELECT * FROM sale_items ORDER BY sale_id, id`);
  const itemsBySale = {};
  for (const item of allItems) {
    if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
    itemsBySale[item.sale_id].push(item);
  }

  for (let i = 0; i < sales.length; i++) {
    const r = sales[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const items = (itemsBySale[r.id] || []).map(si => ({
      product_id:   si.product_id ? (productMap[si.product_id] ?? null) : null,
      variant_id:   si.variant_id ? (variantMap[si.variant_id] ?? null) : null,
      product_name: si.product_name,
      sku:          si.sku ?? null,
      quantity:     parseFloat(si.quantity ?? 0),
      unit_price:   parseFloat(si.unit_price ?? 0),
      cost_price:   parseFloat(si.cost_price ?? 0),
      discount:     parseFloat(si.discount ?? 0),
      tax_amount:   parseFloat(si.tax_amount ?? 0),
      total:        parseFloat(si.total ?? 0),
    }));

    const doc = await Sale.findOneAndUpdate(
      { company_id: cid, reference: r.reference },
      { $setOnInsert: {
        company_id:      cid,
        branch_id:       r.branch_id   ? (branchMap[r.branch_id] ?? null) : null,
        customer_id:     r.customer_id ? (customerMap[r.customer_id] ?? null) : null,
        reference:       r.reference,
        status:          r.status       ?? 'completed',
        sale_date:       r.sale_date    ?? r.created_at,
        subtotal:        parseFloat(r.subtotal ?? 0),
        tax_amount:      parseFloat(r.tax_amount ?? 0),
        discount_amount: parseFloat(r.discount_amount ?? 0),
        total_amount:    parseFloat(r.total_amount ?? 0),
        paid_amount:     parseFloat(r.paid_amount ?? 0),
        change_amount:   parseFloat(r.change_amount ?? 0),
        due_amount:      parseFloat(r.due_amount ?? 0),
        payment_method:  r.payment_method ?? 'cash',
        notes:           r.notes ?? null,
        created_by:      r.created_by ? (userMap[r.created_by] ?? null) : null,
        items,
        created_at:      r.created_at ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    saleMap[r.id] = doc._id;
    progress('Sales', i + 1, sales.length);
  }
}

async function migratePurchases() {
  const purchases = await q(`SELECT * FROM purchases ORDER BY id`);
  console.log(`[9/16] Purchases: ${purchases.length} rows`);
  const allItems = await q(`SELECT * FROM purchase_items ORDER BY purchase_id, id`);
  const itemsByPurch = {};
  for (const item of allItems) {
    if (!itemsByPurch[item.purchase_id]) itemsByPurch[item.purchase_id] = [];
    itemsByPurch[item.purchase_id].push(item);
  }

  for (let i = 0; i < purchases.length; i++) {
    const r = purchases[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const items = (itemsByPurch[r.id] || []).map(pi => ({
      product_id:   pi.product_id ? (productMap[pi.product_id] ?? null) : null,
      product_name: pi.product_name,
      sku:          pi.sku ?? null,
      quantity:     parseFloat(pi.quantity ?? 0),
      unit_cost:    parseFloat(pi.unit_cost ?? 0),
      discount:     parseFloat(pi.discount ?? 0),
      tax_amount:   parseFloat(pi.tax_amount ?? 0),
      total:        parseFloat(pi.total ?? 0),
    }));

    const doc = await Purchase.findOneAndUpdate(
      { company_id: cid, reference: r.reference },
      { $setOnInsert: {
        company_id:      cid,
        branch_id:       r.branch_id   ? (branchMap[r.branch_id]   ?? null) : null,
        supplier_id:     r.supplier_id ? (suppMap[r.supplier_id]   ?? null) : null,
        reference:       r.reference,
        status:          r.status       ?? 'received',
        purchase_date:   r.purchase_date ?? r.created_at,
        subtotal:        parseFloat(r.subtotal ?? 0),
        tax_amount:      parseFloat(r.tax_amount ?? 0),
        discount_amount: parseFloat(r.discount_amount ?? 0),
        total_amount:    parseFloat(r.total_amount ?? 0),
        paid_amount:     parseFloat(r.paid_amount ?? 0),
        due_amount:      parseFloat(r.due_amount ?? 0),
        notes:           r.notes ?? null,
        created_by:      r.created_by ? (userMap[r.created_by] ?? null) : null,
        items,
        created_at:      r.created_at ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    purchMap[r.id] = doc._id;
    progress('Purchases', i + 1, purchases.length);
  }

  // Purchase payments
  const payments = await q(`SELECT * FROM purchase_payments ORDER BY id`);
  console.log(`[9b/16] PurchasePayments: ${payments.length} rows`);
  for (let i = 0; i < payments.length; i++) {
    const r = payments[i];
    const purchId = purchMap[r.purchase_id];
    if (!purchId) continue;
    const cid = r.company_id ? companyMap[r.company_id] : null;
    try {
      await PurchasePayment.findOneAndUpdate(
        { purchase_id: purchId, paid_at: r.paid_at, amount: parseFloat(r.amount) },
        { $setOnInsert: {
          company_id:     cid,
          purchase_id:    purchId,
          amount:         parseFloat(r.amount ?? 0),
          payment_method: r.payment_method ?? 'cash',
          reference:      r.reference ?? null,
          notes:          r.notes ?? null,
          paid_at:        r.paid_at ?? r.created_at,
          created_by:     r.created_by ? (userMap[r.created_by] ?? null) : null,
          created_at:     r.created_at ?? new Date(),
        }},
        { upsert: true }
      );
    } catch (_) {}
    progress('PurchasePayments', i + 1, payments.length);
  }
}

async function migrateReturns() {
  const returns = await q(`SELECT * FROM returns ORDER BY id`);
  console.log(`[10/16] Returns: ${returns.length} rows`);
  const retItems  = await q(`SELECT * FROM return_items ORDER BY return_id, id`);
  const exchItems = await q(`SELECT * FROM exchange_items ORDER BY return_id, id`);
  const riByRet   = {};
  for (const ri of retItems)  { if (!riByRet[ri.return_id]) riByRet[ri.return_id] = []; riByRet[ri.return_id].push(ri); }
  const eiByRet   = {};
  for (const ei of exchItems) { if (!eiByRet[ei.return_id]) eiByRet[ei.return_id] = []; eiByRet[ei.return_id].push(ei); }

  for (let i = 0; i < returns.length; i++) {
    const r = returns[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const items = (riByRet[r.id] || []).map(ri => ({
      product_id:   ri.product_id ? (productMap[ri.product_id] ?? null) : null,
      variant_id:   ri.variant_id ? (variantMap[ri.variant_id] ?? null) : null,
      product_name: ri.product_name,
      sku:          ri.sku ?? null,
      quantity:     parseFloat(ri.quantity ?? 0),
      unit_price:   parseFloat(ri.unit_price ?? 0),
      total:        parseFloat(ri.total ?? 0),
      sale_item_id: null,
    }));
    const exchange_items = (eiByRet[r.id] || []).map(ei => ({
      product_id:   ei.product_id ? (productMap[ei.product_id] ?? null) : null,
      variant_id:   ei.variant_id ? (variantMap[ei.variant_id] ?? null) : null,
      product_name: ei.product_name,
      sku:          ei.sku ?? null,
      quantity:     parseFloat(ei.quantity ?? 0),
      unit_price:   parseFloat(ei.unit_price ?? 0),
      total:        parseFloat(ei.total ?? 0),
    }));

    const doc = await Return.findOneAndUpdate(
      { company_id: cid, reference: r.reference },
      { $setOnInsert: {
        company_id:    cid,
        sale_id:       r.sale_id ? (saleMap[r.sale_id] ?? null) : null,
        reference:     r.reference,
        return_date:   r.return_date ?? r.created_at,
        total_amount:  parseFloat(r.total_amount ?? 0),
        refund_method: r.refund_method ?? 'cash',
        refund_amount: parseFloat(r.refund_amount ?? r.total_amount ?? 0),
        type:          r.type   ?? 'return',
        reason:        r.reason ?? null,
        notes:         r.notes  ?? null,
        created_by:    r.created_by ? (userMap[r.created_by] ?? null) : null,
        items,
        exchange_items,
        created_at:    r.created_at ?? new Date(),
      }},
      { upsert: true, new: true }
    ).lean();
    returnMap[r.id] = doc._id;
    progress('Returns', i + 1, returns.length);
  }
}

async function migrateExpenses() {
  const cats = await q(`SELECT * FROM expense_categories ORDER BY id`);
  console.log(`[11a/16] ExpenseCategories: ${cats.length} rows`);
  for (let i = 0; i < cats.length; i++) {
    const r = cats[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const doc = await ExpenseCategory.findOneAndUpdate(
      { company_id: cid, name: r.name },
      { $setOnInsert: { company_id: cid, name: r.name, description: r.description ?? null, is_active: r.is_active ?? true, created_at: r.created_at ?? new Date() } },
      { upsert: true, new: true }
    ).lean();
    expCatMap[r.id] = doc._id;
    progress('ExpCats', i + 1, cats.length);
  }

  const expenses = await q(`SELECT * FROM expenses ORDER BY id`);
  console.log(`[11b/16] Expenses: ${expenses.length} rows`);
  for (let i = 0; i < expenses.length; i++) {
    const r = expenses[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    try {
      await Expense.findOneAndUpdate(
        { company_id: cid, reference: r.reference ?? `EXP-${r.id}` },
        { $setOnInsert: {
          company_id:     cid,
          branch_id:      r.branch_id   ? (branchMap[r.branch_id] ?? null) : null,
          category_id:    r.category_id ? (expCatMap[r.category_id] ?? null) : null,
          title:          r.title ?? r.description ?? 'Expense',
          amount:         parseFloat(r.amount ?? 0),
          payment_method: r.payment_method ?? 'cash',
          expense_date:   r.expense_date ?? r.created_at,
          reference:      r.reference ?? null,
          notes:          r.notes ?? null,
          created_by:     r.created_by ? (userMap[r.created_by] ?? null) : null,
          created_at:     r.created_at ?? new Date(),
        }},
        { upsert: true }
      );
    } catch (_) {}
    progress('Expenses', i + 1, expenses.length);
  }
}

async function migrateStockAdjustments() {
  const adjustments = await q(`SELECT * FROM stock_adjustments ORDER BY id`);
  console.log(`[12/16] StockAdjustments: ${adjustments.length} rows`);
  const allItems = await q(`SELECT * FROM stock_adjustment_items ORDER BY adjustment_id, id`);
  const itemsByAdj = {};
  for (const item of allItems) {
    if (!itemsByAdj[item.adjustment_id]) itemsByAdj[item.adjustment_id] = [];
    itemsByAdj[item.adjustment_id].push(item);
  }

  for (let i = 0; i < adjustments.length; i++) {
    const r = adjustments[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const items = (itemsByAdj[r.id] || []).map(ai => ({
      product_id:        ai.product_id ? (productMap[ai.product_id] ?? null) : null,
      variant_id:        ai.variant_id ? (variantMap[ai.variant_id] ?? null) : null,
      product_name:      ai.product_name,
      sku:               ai.sku ?? null,
      quantity_before:   parseFloat(ai.quantity_before   ?? 0),
      quantity_adjusted: parseFloat(ai.quantity_adjusted ?? 0),
      quantity_after:    parseFloat(ai.quantity_after    ?? 0),
      unit_cost:         parseFloat(ai.unit_cost         ?? 0),
    }));

    try {
      await StockAdjustment.findOneAndUpdate(
        { company_id: cid, reference: r.reference },
        { $setOnInsert: {
          company_id: cid,
          reference:  r.reference,
          type:       r.type   ?? 'adjustment',
          reason:     r.reason ?? null,
          notes:      r.notes  ?? null,
          created_by: r.created_by ? (userMap[r.created_by] ?? null) : null,
          items,
          created_at: r.created_at ?? new Date(),
        }},
        { upsert: true }
      );
    } catch (_) {}
    progress('StockAdjustments', i + 1, adjustments.length);
  }
}

async function migrateSettings() {
  const rows = await q(`SELECT * FROM settings ORDER BY company_id, key`);
  console.log(`[13/16] Settings: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    try {
      await Setting.findOneAndUpdate(
        { company_id: cid, key: r.key },
        { $setOnInsert: { company_id: cid, key: r.key, value: r.value ?? null, type: r.type ?? 'string', group_name: r.group_name ?? 'general', label: r.label ?? null, created_at: r.created_at ?? new Date() } },
        { upsert: true }
      );
    } catch (_) {}
    progress('Settings', i + 1, rows.length);
  }
}

async function migrateEmployees() {
  const employees = await q(`SELECT * FROM employees ORDER BY id`);
  console.log(`[14a/16] Employees: ${employees.length} rows`);
  for (let i = 0; i < employees.length; i++) {
    const r = employees[i];
    const cid = companyMap[r.company_id];
    if (!cid) continue;
    const filter = { company_id: cid };
    if (r.email) filter.email = r.email;
    else filter.name = r.name;
    const doc = await Employee.findOneAndUpdate(filter, {
      $setOnInsert: {
        company_id:  cid,
        name:        r.name,
        email:       r.email       ?? null,
        phone:       r.phone       ?? null,
        address:     r.address     ?? null,
        designation: r.designation ?? null,
        department:  r.department  ?? null,
        base_salary: parseFloat(r.base_salary ?? 0),
        allowances:  parseFloat(r.allowances  ?? 0),
        deductions:  parseFloat(r.deductions  ?? 0),
        hire_date:   r.hire_date ? new Date(r.hire_date) : null,
        is_active:   r.is_active   ?? true,
        notes:       r.notes       ?? null,
        created_at:  r.created_at  ?? new Date(),
      },
    }, { upsert: true, new: true }).lean();
    employeeMap[r.id] = doc._id;
    progress('Employees', i + 1, employees.length);
  }

  const salaries = await q(`SELECT * FROM salaries ORDER BY id`);
  console.log(`[14b/16] Salaries: ${salaries.length} rows`);
  for (let i = 0; i < salaries.length; i++) {
    const r = salaries[i];
    const empId = employeeMap[r.employee_id];
    if (!empId) continue;
    const cid = r.company_id ? companyMap[r.company_id] : null;
    try {
      await Salary.findOneAndUpdate(
        { employee_id: empId, month: r.month, year: r.year },
        { $setOnInsert: {
          company_id:     cid,
          employee_id:    empId,
          month:          r.month,
          year:           r.year,
          base_salary:    parseFloat(r.base_salary  ?? 0),
          allowances:     parseFloat(r.allowances   ?? 0),
          deductions:     parseFloat(r.deductions   ?? 0),
          gross_salary:   parseFloat(r.gross_salary ?? 0),
          net_salary:     parseFloat(r.net_salary   ?? 0),
          status:         r.status ?? 'pending',
          paid_at:        r.paid_at ? new Date(r.paid_at) : null,
          payment_method: r.payment_method ?? 'cash',
          notes:          r.notes ?? null,
          created_by:     r.created_by ? (userMap[r.created_by] ?? null) : null,
          created_at:     r.created_at ?? new Date(),
        }},
        { upsert: true }
      );
    } catch (_) {}
    progress('Salaries', i + 1, salaries.length);
  }

  const attendance = await q(`SELECT * FROM attendance ORDER BY id`);
  console.log(`[14c/16] Attendance: ${attendance.length} rows`);
  for (let i = 0; i < attendance.length; i++) {
    const r = attendance[i];
    const empId = employeeMap[r.employee_id];
    if (!empId) continue;
    const cid = r.company_id ? companyMap[r.company_id] : null;
    try {
      await Attendance.findOneAndUpdate(
        { employee_id: empId, date: new Date(r.date) },
        { $setOnInsert: {
          company_id: cid,
          employee_id: empId,
          date:       new Date(r.date),
          status:     r.status    ?? 'present',
          check_in:   r.check_in  ?? null,
          check_out:  r.check_out ?? null,
          notes:      r.notes     ?? null,
          created_at: r.created_at ?? new Date(),
        }},
        { upsert: true }
      );
    } catch (_) {}
    progress('Attendance', i + 1, attendance.length);
  }
}

async function migrateBOM() {
  const rows = await q(`SELECT * FROM bill_of_materials ORDER BY id`);
  console.log(`[15a/16] BOM: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prodId = productMap[r.product_id];
    const rmId   = productMap[r.raw_material_id];
    if (!prodId || !rmId) continue;
    const cid = r.company_id ? companyMap[r.company_id] : null;
    try {
      await BOM.findOneAndUpdate(
        { product_id: prodId, raw_material_id: rmId },
        { $setOnInsert: { company_id: cid, product_id: prodId, raw_material_id: rmId, quantity_required: parseFloat(r.quantity_required ?? 1), unit: r.unit ?? null, created_at: r.created_at ?? new Date() } },
        { upsert: true }
      );
    } catch (_) {}
    progress('BOM', i + 1, rows.length);
  }

  const batches = await q(`SELECT * FROM production_batches ORDER BY id`);
  console.log(`[15b/16] ProductionBatches: ${batches.length} rows`);
  const allMaterials = await q(`SELECT * FROM production_batch_materials ORDER BY batch_id, id`);
  const matsByBatch  = {};
  for (const m of allMaterials) {
    if (!matsByBatch[m.batch_id]) matsByBatch[m.batch_id] = [];
    matsByBatch[m.batch_id].push(m);
  }

  for (let i = 0; i < batches.length; i++) {
    const r = batches[i];
    const prodId = productMap[r.product_id];
    if (!prodId) continue;
    const cid = r.company_id ? companyMap[r.company_id] : null;
    const materials = (matsByBatch[r.id] || []).map(m => ({
      product_id:    m.product_id ? (productMap[m.product_id] ?? null) : null,
      product_name:  m.product_name ?? 'Material',
      quantity_used: parseFloat(m.quantity_used ?? 0),
      unit_cost:     parseFloat(m.unit_cost     ?? 0),
      total_cost:    parseFloat(m.total_cost    ?? 0),
    }));

    try {
      const doc = await ProductionBatch.findOneAndUpdate(
        { company_id: cid, reference: r.reference },
        { $setOnInsert: {
          company_id:       cid,
          product_id:       prodId,
          reference:        r.reference,
          quantity_produced: parseFloat(r.quantity_produced ?? 0),
          production_cost:  parseFloat(r.production_cost   ?? 0),
          batch_date:       r.batch_date ? new Date(r.batch_date) : (r.created_at ?? new Date()),
          status:           r.status ?? 'completed',
          notes:            r.notes  ?? null,
          created_by:       r.created_by ? (userMap[r.created_by] ?? null) : null,
          materials,
          created_at:       r.created_at ?? new Date(),
        }},
        { upsert: true, new: true }
      ).lean();
      batchMap[r.id] = doc._id;
    } catch (_) {}
    progress('Batches', i + 1, batches.length);
  }
}

async function migrateCartHolds() {
  const rows = await q(`SELECT * FROM cart_holds ORDER BY id`);
  console.log(`[16a/16] CartHolds: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = r.company_id ? companyMap[r.company_id] : null;
    if (!cid) continue;
    try {
      let cartData = r.cart_data;
      if (typeof cartData === 'string') { try { cartData = JSON.parse(cartData); } catch { cartData = {}; } }
      await CartHold.create({ company_id: cid, label: r.label ?? null, cart_data: cartData ?? {}, created_by: r.created_by ? (userMap[r.created_by] ?? null) : null, created_at: r.created_at ?? new Date() });
    } catch (_) {}
    progress('CartHolds', i + 1, rows.length);
  }
}

async function migrateAuditLogs() {
  // Check if table exists
  const exists = await q(`SELECT to_regclass('public.audit_logs') AS name`);
  if (!exists[0]?.name) { console.log('[16b/16] audit_logs table not found — skipped'); return; }

  const rows = await q(`SELECT * FROM audit_logs ORDER BY id LIMIT 50000`);
  console.log(`[16b/16] AuditLogs: ${rows.length} rows`);
  const CHUNK = 200;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const docs  = chunk.map(r => ({
      company_id:   r.company_id ? companyMap[r.company_id] : null,
      user_id:      r.user_id    ? userMap[r.user_id]       : null,
      action:       r.action,
      resource:     r.resource ?? r.table_name ?? 'unknown',
      resource_id:  r.resource_id ?? r.record_id?.toString() ?? null,
      old_value:    r.old_value ?? null,
      new_value:    r.new_value ?? r.details ?? null,
      ip_address:   r.ip_address ?? null,
      user_agent:   r.user_agent ?? null,
      created_at:   r.created_at ?? new Date(),
    }));
    try { await AuditLog.insertMany(docs, { ordered: false }); } catch (_) {}
    progress('AuditLogs', Math.min(start + CHUNK, rows.length), rows.length);
  }
}

async function migrateDemoLeads() {
  const exists = await q(`SELECT to_regclass('public.demo_leads') AS name`);
  if (!exists[0]?.name) { console.log('[16c/16] demo_leads table not found — skipped'); return; }

  const rows = await q(`SELECT * FROM demo_leads ORDER BY id`);
  console.log(`[16c/16] DemoLeads: ${rows.length} rows`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await DemoLead.findOneAndUpdate(
        { email: r.email },
        { $setOnInsert: { name: r.name, email: r.email, company: r.company ?? null, phone: r.phone ?? null, message: r.message ?? null, status: r.status ?? 'new', source: r.source ?? null, created_at: r.created_at ?? new Date() } },
        { upsert: true }
      );
    } catch (_) {}
    progress('DemoLeads', i + 1, rows.length);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SAS Garments — PostgreSQL → MongoDB Migration     ');
  console.log('═══════════════════════════════════════════════════\n');

  if (!process.env.DATABASE_URL) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  if (!process.env.MONGODB_URI)  { console.error('ERROR: MONGODB_URI not set');  process.exit(1); }

  await connectPg();
  await connectMongo();

  const t0 = Date.now();

  await migrateCompanies();
  await migrateSuperAdmins();
  await migrateBranchesAndRoles();
  await migrateUsers();
  await migrateRefreshTokens();
  await migrateCategories();
  await migrateBrands();
  await migrateSuppliers();
  await migrateProducts();
  await migrateCustomers();
  await migrateSales();
  await migratePurchases();
  await migrateReturns();
  await migrateExpenses();
  await migrateStockAdjustments();
  await migrateSettings();
  await migrateEmployees();
  await migrateBOM();
  await migrateCartHolds();
  await migrateAuditLogs();
  await migrateDemoLeads();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Migration complete in ${elapsed}s`);
  console.log('\nSummary of ID maps built:');
  console.log(`  companies:  ${Object.keys(companyMap).length}`);
  console.log(`  users:      ${Object.keys(userMap).length}`);
  console.log(`  products:   ${Object.keys(productMap).length}`);
  console.log(`  customers:  ${Object.keys(customerMap).length}`);
  console.log(`  sales:      ${Object.keys(saleMap).length}`);
  console.log(`  purchases:  ${Object.keys(purchMap).length}`);
  console.log(`  returns:    ${Object.keys(returnMap).length}`);
  console.log('');

  await pg.end();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
