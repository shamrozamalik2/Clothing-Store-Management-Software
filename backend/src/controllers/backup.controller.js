'use strict';

const mongoose        = require('mongoose');
const Category        = require('../models/Category');
const Brand           = require('../models/Brand');
const Supplier        = require('../models/Supplier');
const Product         = require('../models/Product');
const Customer        = require('../models/Customer');
const Sale            = require('../models/Sale');
const Purchase        = require('../models/Purchase');
const PurchasePayment = require('../models/PurchasePayment');
const Return          = require('../models/Return');
const ExpenseCategory = require('../models/ExpenseCategory');
const Expense         = require('../models/Expense');
const StockAdjustment = require('../models/StockAdjustment');
const Setting         = require('../models/Setting');
const Employee        = require('../models/Employee');
const Salary          = require('../models/Salary');
const Attendance      = require('../models/Attendance');
const BOM             = require('../models/BillOfMaterials');
const ProductionBatch = require('../models/ProductionBatch');
const CartHold        = require('../models/CartHold');
const Company         = require('../models/Company');
const { success, error } = require('../utils/response');
const { logAudit }    = require('../utils/audit');
const logger          = require('../config/logger');

const now = () => new Date().toISOString();
const ts  = v => (v ? new Date(v) : new Date());

// ── Inline CompanyBackup model (server-side snapshots) ────────────────────────
let CompanyBackup;
try   { CompanyBackup = mongoose.model('CompanyBackup'); }
catch {
  const s = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    file_name:  String,
    version:    String,
    row_counts: mongoose.Schema.Types.Mixed,
    data:       mongoose.Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
  });
  CompanyBackup = mongoose.model('CompanyBackup', s);
}

// ── SQLite detection ──────────────────────────────────────────────────────────
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');
const isSqlite = buf => buf.length >= 16 && buf.slice(0, 16).equals(SQLITE_MAGIC);

// Read all tables from a SQLite .db buffer using sql.js (pure WASM, no native bindings)
async function sqliteBufferToData(buf) {
  let initSqlJs;
  try { initSqlJs = require('sql.js'); }
  catch { throw new Error('sql.js is not installed on the server.'); }

  const isWal = buf.length > 19 && buf[18] === 2 && buf[19] === 2;

  const SQL = await initSqlJs();
  const db  = new SQL.Database(new Uint8Array(buf));

  let pageCount = 0;
  try { const pc = db.exec('PRAGMA page_count'); pageCount = pc[0]?.values[0]?.[0] ?? 0; } catch {}

  const masterRes  = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  const tableNames = masterRes.length ? masterRes[0].values.map(r => String(r[0])) : [];
  logger.info(`[Backup] SQLite: wal=${isWal}, pages=${pageCount}, tables=[${tableNames.join(', ') || 'none'}]`);

  if (tableNames.length === 0) {
    db.close();
    if (isWal) {
      throw new Error(
        'The database file is in WAL (Write-Ahead Logging) mode. ' +
        'The actual data is stored in a separate .db-wal file that was not uploaded. ' +
        'To fix this: completely close the old desktop application, then copy and upload the .db file again. ' +
        'Closing the app triggers a checkpoint that merges the WAL back into the main file.'
      );
    }
    throw new Error(
      `The database file contains no tables (${pageCount} pages). ` +
      'Please make sure you are uploading the correct database file from your old desktop application.'
    );
  }

  function tbl(name) {
    if (!tableNames.includes(name)) return [];
    try {
      const res = db.exec(`SELECT * FROM "${name}"`);
      if (!res.length) return [];
      const { columns, values } = res[0];
      return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    } catch { return []; }
  }

  function tblAny(...names) {
    for (const n of names) { const rows = tbl(n); if (rows.length) return rows; }
    for (const n of names) { if (tableNames.includes(n)) return tbl(n); }
    return [];
  }

  const data = {
    categories:             tblAny('categories',            'category'),
    brands:                 tblAny('brands',                'brand'),
    suppliers:              tblAny('suppliers',             'supplier'),
    products:               tblAny('products',              'product', 'items', 'inventory'),
    product_variants:       tblAny('product_variants',      'variants', 'product_variant'),
    customers:              tblAny('customers',             'customer', 'clients', 'client'),
    sales:                  tblAny('sales',                 'sale', 'orders', 'invoices'),
    sale_items:             tblAny('sale_items',            'sale_item', 'order_items', 'invoice_items'),
    purchases:              tblAny('purchases',             'purchase', 'purchase_orders'),
    purchase_items:         tblAny('purchase_items',        'purchase_item'),
    purchase_payments:      tblAny('purchase_payments',     'purchase_payment'),
    returns:                tblAny('returns',               'return', 'refunds'),
    return_items:           tblAny('return_items',          'return_item'),
    exchange_items:         tblAny('exchange_items',        'exchange_item', 'exchanges'),
    expense_categories:     tblAny('expense_categories',    'expense_category', 'expense_cats'),
    expenses:               tblAny('expenses',              'expense'),
    stock_adjustments:      tblAny('stock_adjustments',     'stock_adjustment', 'adjustments'),
    stock_adjustment_items: tblAny('stock_adjustment_items','stock_adjustment_item'),
    settings:               tblAny('settings',              'setting', 'config', 'configuration'),
    employees:              tblAny('employees',             'employee', 'staff'),
    salaries:               tblAny('salaries',              'salary'),
    attendance:             tblAny('attendance',            'attendances'),
    bill_of_materials:      tblAny('bill_of_materials',     'bom'),
    production_batches:     tblAny('production_batches',    'batches'),
    production_batch_materials: tblAny('production_batch_materials', 'batch_materials'),
    cart_holds:             tblAny('cart_holds',            'cart_hold', 'holds'),
  };

  db.close();

  const totalRows = Object.values(data).reduce((s, r) => s + r.length, 0);
  logger.info(`[Backup] SQLite rows extracted: ${totalRows} across ${tableNames.length} tables`);

  if (totalRows === 0) {
    throw new Error(
      `Tables were found [${tableNames.join(', ')}] but all are empty. ` +
      'The database may have been copied while the old application was still running. ' +
      'Close the old application completely and upload the file again.'
    );
  }

  return data;
}

// ── Core restore — shared by all endpoints ─────────────────────────────────────
//
// ID-free restore: never reuse the original `id` values from the backup.
// Each inserted document gets a fresh MongoDB ObjectId. FK references are
// remapped through old→new maps built from returned documents.
// This prevents cross-company ID collisions entirely.
async function performRestore(cid, d, userId) {
  const totalRows = Object.values(d).reduce((s, rows) => s + (Array.isArray(rows) ? rows.length : 0), 0);
  if (totalRows === 0) {
    throw new Error('Backup file contains no data rows. Restore aborted — your existing data has not been changed.');
  }

  const oid    = typeof cid === 'string' ? new mongoose.Types.ObjectId(cid) : cid;
  const report = {};

  // Upsert by natural key. Returns document. Tracks provided/inserted in report.
  async function upsert(Model, key, reportKey, rows, buildFilter, buildSet, buildSetOnInsert) {
    report[reportKey] = { provided: (rows || []).length, inserted: 0 };
    const map = {};
    for (const r of (rows || [])) {
      try {
        const doc = await Model.findOneAndUpdate(
          buildFilter(r),
          { $set: buildSet(r), $setOnInsert: buildSetOnInsert(r) },
          { upsert: true, new: true }
        ).lean();
        map[r[key]] = doc._id;
        report[reportKey].inserted++;
      } catch (e) { logger.warn(`[Backup] ${reportKey} skip: ${e.message}`); }
    }
    return map;
  }

  // Insert fresh (no natural key). Returns id map.
  async function insertFresh(Model, reportKey, rows, buildDoc) {
    report[reportKey] = { provided: (rows || []).length, inserted: 0 };
    const map = {};
    for (const r of (rows || [])) {
      try {
        const doc = await Model.create(buildDoc(r));
        map[r.id] = doc._id;
        report[reportKey].inserted++;
      } catch (e) { logger.warn(`[Backup] ${reportKey} skip: ${e.message}`); }
    }
    return map;
  }

  // ── 1. Categories ─────────────────────────────────────────────────────────
  const catMap = await upsert(Category, 'id', 'categories', d.categories,
    r => ({ company_id: oid, name: r.name }),
    r => ({ description: r.description ?? null, is_active: r.is_active ?? true, updated_at: new Date() }),
    r => ({ company_id: oid, name: r.name, description: r.description ?? null, is_active: r.is_active ?? true, created_at: ts(r.created_at) })
  );

  // ── 2. Brands ──────────────────────────────────────────────────────────────
  const brandMap = await upsert(Brand, 'id', 'brands', d.brands,
    r => ({ company_id: oid, name: r.name }),
    r => ({ description: r.description ?? null, is_active: r.is_active ?? true, updated_at: new Date() }),
    r => ({ company_id: oid, name: r.name, description: r.description ?? null, is_active: r.is_active ?? true, created_at: ts(r.created_at) })
  );

  // ── 3. Suppliers ───────────────────────────────────────────────────────────
  const suppMap = await upsert(Supplier, 'id', 'suppliers', d.suppliers,
    r => ({ company_id: oid, name: r.name }),
    r => ({ email: r.email ?? null, phone: r.phone ?? null, address: r.address ?? null, city: r.city ?? null, is_active: r.is_active ?? true, updated_at: new Date() }),
    r => ({ company_id: oid, name: r.name, email: r.email ?? null, phone: r.phone ?? null, address: r.address ?? null, city: r.city ?? null, current_balance: r.current_balance ?? 0, opening_balance: r.opening_balance ?? r.current_balance ?? 0, is_active: r.is_active ?? true, created_at: ts(r.created_at) })
  );

  // ── 4. Products (set variants:[] first, then push in step 5) ──────────────
  report['products'] = { provided: (d.products || []).length, inserted: 0 };
  const productMap  = {};
  for (const r of (d.products || [])) {
    const _sku = r.sku ?? String(r.id);
    try {
      const doc = await Product.findOneAndUpdate(
        { company_id: oid, sku: _sku },
        {
          $set: {
            name: r.name, barcode: r.barcode ?? null, description: r.description ?? null,
            category_id:  r.category_id  ? (catMap[r.category_id]  ?? null) : null,
            brand_id:     r.brand_id     ? (brandMap[r.brand_id]   ?? null) : null,
            cost_price:   r.cost_price   ?? 0,
            sale_price:   r.sale_price   ?? r.selling_price ?? r.price ?? 0,
            wholesale_price: r.wholesale_price ?? 0,
            tax_rate:     r.tax_rate     ?? 0,
            stock_quantity: r.stock_quantity ?? r.quantity ?? 0,
            low_stock_alert: r.low_stock_alert ?? r.min_stock_level ?? r.reorder_level ?? 5,
            unit:         r.unit         ?? 'pcs',
            is_active:    r.is_active    ?? true,
            track_inventory: r.track_inventory ?? true,
            variants:     [],
            updated_at:   new Date(),
          },
          $setOnInsert: { company_id: oid, sku: _sku, created_at: ts(r.created_at) },
        },
        { upsert: true, new: true }
      ).lean();
      productMap[r.id] = doc._id;
      report['products'].inserted++;
    } catch (e) { logger.warn(`[Backup] products skip: ${e.message}`); }
  }

  // ── 5. Product Variants (push into products) ──────────────────────────────
  report['product_variants'] = { provided: (d.product_variants || []).length, inserted: 0 };
  const variantMap = {};
  for (const r of (d.product_variants || [])) {
    const parentId = productMap[r.product_id];
    if (!parentId) continue;
    const varId = new mongoose.Types.ObjectId();
    try {
      await Product.updateOne(
        { _id: parentId, company_id: oid },
        { $push: { variants: {
          _id:            varId,
          sku:            r.sku ?? `VAR-${r.id}`,
          barcode:        r.barcode    ?? null,
          size:           r.size       ?? null,
          color:          r.color      ?? null,
          cost_price:     r.cost_price ?? 0,
          sale_price:     r.sale_price ?? 0,
          stock_quantity: r.stock_quantity ?? 0,
          is_active:      r.is_active  ?? true,
        }}}
      );
      variantMap[r.id] = varId;
      report['product_variants'].inserted++;
    } catch (e) { logger.warn(`[Backup] product_variants skip: ${e.message}`); }
  }

  // ── 6. Customers (no reliable natural key — insert fresh) ─────────────────
  const customerMap = await insertFresh(Customer, 'customers', d.customers, r => ({
    company_id:      oid,
    name:            r.name,
    email:           r.email         ?? null,
    phone:           r.phone         ?? null,
    address:         r.address       ?? null,
    city:            r.city          ?? null,
    customer_group:  r.customer_group ?? 'general',
    credit_limit:    r.credit_limit  ?? 0,
    current_balance: r.current_balance ?? 0,
    loyalty_points:  r.loyalty_points ?? 0,
    is_active:       r.is_active     ?? true,
    notes:           r.notes         ?? null,
    created_at:      ts(r.created_at),
  }));

  // ── 7. Sales (unique: company_id + reference) with embedded items ──────────
  report['sales']      = { provided: (d.sales || []).length, inserted: 0 };
  report['sale_items'] = { provided: (d.sale_items || []).length, inserted: 0 };
  const saleMap = {};
  for (const r of (d.sales || [])) {
    const ref     = r.reference ?? r.reference_no ?? r.invoice_no ?? `IMPORT-${r.id}`;
    const custId  = r.customer_id ? (customerMap[r.customer_id] ?? null) : null;
    const total   = parseFloat(r.total_amount ?? r.total ?? r.grand_total ?? 0);
    const paid    = parseFloat(r.paid_amount ?? total);
    const due     = parseFloat(r.due_amount ?? 0);

    // Build embedded items for this sale
    const rawItems = (d.sale_items || []).filter(si => String(si.sale_id) === String(r.id));
    const items = rawItems.map(si => ({
      product_id:   si.product_id ? (productMap[si.product_id] ?? null) : null,
      variant_id:   si.variant_id ? (variantMap[si.variant_id] ?? null) : null,
      product_name: si.product_name ?? si.name ?? 'Product',
      sku:          si.sku ?? null,
      quantity:     parseFloat(si.quantity ?? 1),
      unit_price:   parseFloat(si.unit_price ?? si.price ?? 0),
      cost_price:   parseFloat(si.cost_price ?? 0),
      discount:     parseFloat(si.discount ?? 0),
      tax_amount:   parseFloat(si.tax_amount ?? 0),
      total:        parseFloat(si.total ?? si.subtotal ?? 0),
    }));

    try {
      const doc = await Sale.findOneAndUpdate(
        { company_id: oid, reference: ref },
        {
          $set: {
            customer_id:    custId,
            status:         r.status       ?? 'completed',
            sale_date:      r.sale_date    ? new Date(r.sale_date) : ts(r.created_at),
            subtotal:       parseFloat(r.subtotal ?? total),
            tax_amount:     parseFloat(r.tax_amount ?? r.tax ?? 0),
            discount_amount: parseFloat(r.discount_amount ?? r.discount ?? 0),
            total_amount:   total,
            paid_amount:    paid,
            change_amount:  parseFloat(r.change_amount ?? 0),
            due_amount:     due,
            payment_method: r.payment_method ?? r.payment_type ?? 'cash',
            notes:          r.notes ?? null,
            items,
            updated_at:     new Date(),
          },
          $setOnInsert: { company_id: oid, reference: ref, created_by: null, created_at: ts(r.created_at) },
        },
        { upsert: true, new: true }
      ).lean();
      saleMap[r.id] = doc._id;
      report['sales'].inserted++;
      report['sale_items'].inserted += items.length;
    } catch (e) { logger.warn(`[Backup] sales skip: ${e.message}`); }
  }

  // ── 8. Purchases (unique: company_id + reference) with embedded items ──────
  report['purchases']       = { provided: (d.purchases || []).length, inserted: 0 };
  report['purchase_items']  = { provided: (d.purchase_items || []).length, inserted: 0 };
  const purchMap = {};
  for (const r of (d.purchases || [])) {
    const ref    = r.reference ?? r.reference_no ?? `IMPORT-PO-${r.id}`;
    const suppId = r.supplier_id ? (suppMap[r.supplier_id] ?? null) : null;
    const total  = parseFloat(r.total_amount ?? r.total ?? 0);

    const rawItems = (d.purchase_items || []).filter(pi => String(pi.purchase_id) === String(r.id));
    const items = rawItems.map(pi => ({
      product_id:   pi.product_id ? (productMap[pi.product_id] ?? null) : null,
      product_name: pi.product_name ?? pi.name ?? 'Product',
      sku:          pi.sku ?? null,
      quantity:     parseFloat(pi.quantity ?? 0),
      unit_cost:    parseFloat(pi.unit_cost ?? pi.cost ?? 0),
      discount:     parseFloat(pi.discount ?? 0),
      tax_amount:   parseFloat(pi.tax_amount ?? 0),
      total:        parseFloat(pi.total ?? 0),
    }));

    try {
      const doc = await Purchase.findOneAndUpdate(
        { company_id: oid, reference: ref },
        {
          $set: {
            supplier_id:     suppId,
            status:          r.status      ?? 'received',
            purchase_date:   r.purchase_date ? new Date(r.purchase_date) : ts(r.created_at),
            subtotal:        parseFloat(r.subtotal ?? total),
            tax_amount:      parseFloat(r.tax_amount ?? r.tax ?? 0),
            discount_amount: parseFloat(r.discount_amount ?? r.discount ?? 0),
            total_amount:    total,
            paid_amount:     parseFloat(r.paid_amount ?? total),
            due_amount:      parseFloat(r.due_amount ?? 0),
            notes:           r.notes ?? null,
            items,
            updated_at:      new Date(),
          },
          $setOnInsert: { company_id: oid, reference: ref, created_by: null, created_at: ts(r.created_at) },
        },
        { upsert: true, new: true }
      ).lean();
      purchMap[r.id] = doc._id;
      report['purchases'].inserted++;
      report['purchase_items'].inserted += items.length;
    } catch (e) { logger.warn(`[Backup] purchases skip: ${e.message}`); }
  }

  // ── 9. Purchase Payments ──────────────────────────────────────────────────
  report['purchase_payments'] = { provided: (d.purchase_payments || []).length, inserted: 0 };
  for (const r of (d.purchase_payments || [])) {
    const purchId = purchMap[r.purchase_id];
    if (!purchId) continue;
    try {
      await PurchasePayment.create({
        company_id:     oid,
        purchase_id:    purchId,
        amount:         parseFloat(r.amount ?? 0),
        payment_method: r.payment_method ?? 'cash',
        reference:      r.reference ?? null,
        notes:          r.notes ?? null,
        paid_at:        r.paid_at ? new Date(r.paid_at) : ts(r.created_at),
        created_by:     null,
        created_at:     ts(r.created_at),
      });
      report['purchase_payments'].inserted++;
    } catch (e) { logger.warn(`[Backup] purchase_payments skip: ${e.message}`); }
  }

  // ── 10. Returns (unique: company_id + reference) with embedded items ────────
  report['returns']        = { provided: (d.returns || []).length, inserted: 0 };
  report['return_items']   = { provided: (d.return_items || []).length, inserted: 0 };
  report['exchange_items'] = { provided: (d.exchange_items || []).length, inserted: 0 };
  const returnMap = {};
  for (const r of (d.returns || [])) {
    const ref    = r.reference ?? `IMPORT-RET-${r.id}`;
    const saleId = r.sale_id ? (saleMap[r.sale_id] ?? null) : null;

    const retItems = (d.return_items || []).filter(ri => String(ri.return_id) === String(r.id));
    const exItems  = (d.exchange_items || []).filter(ei => String(ei.return_id) === String(r.id));

    const items = retItems.map(ri => ({
      product_id:   ri.product_id ? (productMap[ri.product_id] ?? null) : null,
      variant_id:   ri.variant_id ? (variantMap[ri.variant_id] ?? null) : null,
      product_name: ri.product_name ?? 'Product',
      sku:          ri.sku ?? null,
      quantity:     parseFloat(ri.quantity ?? 0),
      unit_price:   parseFloat(ri.unit_price ?? 0),
      total:        parseFloat(ri.total ?? 0),
      sale_item_id: null,
    }));

    const exchangeItems = exItems.map(ei => ({
      product_id:   ei.product_id ? (productMap[ei.product_id] ?? null) : null,
      variant_id:   ei.variant_id ? (variantMap[ei.variant_id] ?? null) : null,
      product_name: ei.product_name ?? 'Product',
      sku:          ei.sku ?? null,
      quantity:     parseFloat(ei.quantity ?? 0),
      unit_price:   parseFloat(ei.unit_price ?? 0),
      total:        parseFloat(ei.total ?? 0),
    }));

    try {
      const doc = await Return.findOneAndUpdate(
        { company_id: oid, reference: ref },
        {
          $set: {
            sale_id:       saleId,
            return_date:   r.return_date ? new Date(r.return_date) : ts(r.created_at),
            total_amount:  parseFloat(r.total_amount ?? 0),
            refund_method: r.refund_method ?? 'cash',
            refund_amount: parseFloat(r.refund_amount ?? r.total_amount ?? 0),
            type:          r.type ?? 'return',
            reason:        r.reason ?? null,
            notes:         r.notes ?? null,
            items,
            exchange_items: exchangeItems,
            updated_at:    new Date(),
          },
          $setOnInsert: { company_id: oid, reference: ref, created_by: null, created_at: ts(r.created_at) },
        },
        { upsert: true, new: true }
      ).lean();
      returnMap[r.id] = doc._id;
      report['returns'].inserted++;
      report['return_items'].inserted   += items.length;
      report['exchange_items'].inserted += exchangeItems.length;
    } catch (e) { logger.warn(`[Backup] returns skip: ${e.message}`); }
  }

  // ── 11. Expense Categories ─────────────────────────────────────────────────
  const expCatMap = await upsert(ExpenseCategory, 'id', 'expense_categories', d.expense_categories,
    r => ({ company_id: oid, name: r.name }),
    r => ({ is_active: r.is_active ?? true, updated_at: new Date() }),
    r => ({ company_id: oid, name: r.name, is_active: r.is_active ?? true, created_at: ts(r.created_at) })
  );

  // ── 12. Expenses (no unique key — insert fresh) ────────────────────────────
  report['expenses'] = { provided: (d.expenses || []).length, inserted: 0 };
  for (const r of (d.expenses || [])) {
    try {
      await Expense.create({
        company_id:     oid,
        category_id:    r.category_id ? (expCatMap[r.category_id] ?? null) : null,
        title:          r.title ?? r.description ?? r.name ?? 'Expense',
        amount:         parseFloat(r.amount ?? 0),
        payment_method: r.payment_method ?? 'cash',
        expense_date:   r.expense_date ? new Date(r.expense_date) : ts(r.created_at),
        reference:      r.reference ?? null,
        notes:          r.notes ?? null,
        created_by:     null,
        created_at:     ts(r.created_at),
      });
      report['expenses'].inserted++;
    } catch (e) { logger.warn(`[Backup] expenses skip: ${e.message}`); }
  }

  // ── 13. Stock Adjustments (unique: company_id + reference) with embedded items ─
  report['stock_adjustments']      = { provided: (d.stock_adjustments || []).length, inserted: 0 };
  report['stock_adjustment_items'] = { provided: (d.stock_adjustment_items || []).length, inserted: 0 };
  for (const r of (d.stock_adjustments || [])) {
    const ref = r.reference ?? `IMPORT-ADJ-${r.id}`;

    const rawItems = (d.stock_adjustment_items || []).filter(ai =>
      String(ai.adjustment_id ?? ai.stock_adjustment_id) === String(r.id)
    );
    const items = rawItems.map(ai => ({
      product_id:        ai.product_id ? (productMap[ai.product_id] ?? null) : null,
      variant_id:        ai.variant_id ? (variantMap[ai.variant_id] ?? null) : null,
      product_name:      ai.product_name ?? ai.name ?? 'Product',
      sku:               ai.sku ?? null,
      quantity_before:   parseFloat(ai.quantity_before ?? ai.old_quantity ?? 0),
      quantity_adjusted: parseFloat(ai.quantity_adjusted ?? ai.quantity ?? 0),
      quantity_after:    parseFloat(ai.quantity_after ?? ai.new_quantity ?? 0),
      unit_cost:         parseFloat(ai.unit_cost ?? 0),
    }));

    try {
      await StockAdjustment.findOneAndUpdate(
        { company_id: oid, reference: ref },
        {
          $set: {
            type:       r.type   ?? 'adjustment',
            reason:     r.reason ?? null,
            notes:      r.notes  ?? null,
            items,
            updated_at: new Date(),
          },
          $setOnInsert: { company_id: oid, reference: ref, created_by: null, created_at: ts(r.created_at) },
        },
        { upsert: true }
      );
      report['stock_adjustments'].inserted++;
      report['stock_adjustment_items'].inserted += items.length;
    } catch (e) { logger.warn(`[Backup] stock_adjustments skip: ${e.message}`); }
  }

  // ── 14. Settings (unique: company_id + key) ────────────────────────────────
  report['settings'] = { provided: (d.settings || []).length, inserted: 0 };
  for (const r of (d.settings || [])) {
    try {
      await Setting.findOneAndUpdate(
        { company_id: oid, key: r.key },
        { $set: { value: r.value ?? null, type: r.type ?? 'string', group_name: r.group_name ?? 'general', label: r.label ?? null, updated_at: new Date() },
          $setOnInsert: { company_id: oid, key: r.key, created_at: new Date() } },
        { upsert: true }
      );
      report['settings'].inserted++;
    } catch (e) { logger.warn(`[Backup] settings skip: ${e.message}`); }
  }

  // ── 15. Employees (no unique key — insert fresh) ───────────────────────────
  const employeeMap = await insertFresh(Employee, 'employees', d.employees, r => ({
    company_id:  oid,
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
    is_active:   r.is_active  ?? true,
    notes:       r.notes      ?? null,
    created_at:  ts(r.created_at),
  }));

  // ── 16. Salaries (unique: company_id + employee_id + month + year) ─────────
  report['salaries'] = { provided: (d.salaries || []).length, inserted: 0 };
  for (const r of (d.salaries || [])) {
    const empId = employeeMap[r.employee_id];
    if (!empId) continue;
    try {
      await Salary.findOneAndUpdate(
        { company_id: oid, employee_id: empId, month: r.month, year: r.year },
        {
          $set: { base_salary: r.base_salary ?? 0, allowances: r.allowances ?? 0, deductions: r.deductions ?? 0, gross_salary: r.gross_salary ?? 0, net_salary: r.net_salary ?? 0, status: r.status ?? 'pending', paid_at: r.paid_at ? new Date(r.paid_at) : null, payment_method: r.payment_method ?? 'cash', notes: r.notes ?? null, updated_at: new Date() },
          $setOnInsert: { company_id: oid, employee_id: empId, month: r.month, year: r.year, created_at: ts(r.created_at) },
        },
        { upsert: true }
      );
      report['salaries'].inserted++;
    } catch (e) { logger.warn(`[Backup] salaries skip: ${e.message}`); }
  }

  // ── 17. Attendance (unique: company_id + employee_id + date) ──────────────
  report['attendance'] = { provided: (d.attendance || []).length, inserted: 0 };
  for (const r of (d.attendance || [])) {
    const empId = employeeMap[r.employee_id];
    if (!empId) continue;
    try {
      await Attendance.findOneAndUpdate(
        { company_id: oid, employee_id: empId, date: new Date(r.date) },
        {
          $set: { status: r.status ?? 'present', check_in: r.check_in ?? null, check_out: r.check_out ?? null, notes: r.notes ?? null, updated_at: new Date() },
          $setOnInsert: { company_id: oid, employee_id: empId, date: new Date(r.date), created_at: ts(r.created_at) },
        },
        { upsert: true }
      );
      report['attendance'].inserted++;
    } catch (e) { logger.warn(`[Backup] attendance skip: ${e.message}`); }
  }

  // ── 18. Bill of Materials (unique: company_id + product_id + raw_material_id) ─
  report['bill_of_materials'] = { provided: (d.bill_of_materials || []).length, inserted: 0 };
  for (const r of (d.bill_of_materials || [])) {
    const prodId = productMap[r.product_id];
    const rmId   = productMap[r.raw_material_id];
    if (!prodId || !rmId) continue;
    try {
      await BOM.findOneAndUpdate(
        { company_id: oid, product_id: prodId, raw_material_id: rmId },
        {
          $set: { quantity_required: r.quantity_required ?? 1, unit: r.unit ?? null, updated_at: new Date() },
          $setOnInsert: { company_id: oid, product_id: prodId, raw_material_id: rmId, created_at: ts(r.created_at) },
        },
        { upsert: true }
      );
      report['bill_of_materials'].inserted++;
    } catch (e) { logger.warn(`[Backup] bill_of_materials skip: ${e.message}`); }
  }

  // ── 19. Production Batches (unique: company_id + reference) ──────────────
  report['production_batches']          = { provided: (d.production_batches || []).length, inserted: 0 };
  report['production_batch_materials']  = { provided: (d.production_batch_materials || []).length, inserted: 0 };
  for (const r of (d.production_batches || [])) {
    const prodId = productMap[r.product_id];
    if (!prodId) continue;
    const ref = r.reference ?? `IMPORT-BATCH-${r.id}`;

    const rawMaterials = (d.production_batch_materials || []).filter(m => String(m.batch_id) === String(r.id));
    const materials = rawMaterials.map(m => ({
      product_id:   m.product_id ? (productMap[m.product_id] ?? null) : null,
      product_name: m.product_name ?? 'Material',
      quantity_used: parseFloat(m.quantity_used ?? 0),
      unit_cost:    parseFloat(m.unit_cost ?? 0),
      total_cost:   parseFloat(m.total_cost ?? 0),
    }));

    try {
      await ProductionBatch.findOneAndUpdate(
        { company_id: oid, reference: ref },
        {
          $set: { product_id: prodId, quantity_produced: r.quantity_produced ?? 0, production_cost: r.production_cost ?? 0, batch_date: r.batch_date ? new Date(r.batch_date) : ts(r.created_at), status: r.status ?? 'completed', notes: r.notes ?? null, materials, updated_at: new Date() },
          $setOnInsert: { company_id: oid, reference: ref, created_by: null, created_at: ts(r.created_at) },
        },
        { upsert: true }
      );
      report['production_batches'].inserted++;
      report['production_batch_materials'].inserted += materials.length;
    } catch (e) { logger.warn(`[Backup] production_batches skip: ${e.message}`); }
  }

  // ── 20. Cart Holds (no unique key — insert fresh) ─────────────────────────
  report['cart_holds'] = { provided: (d.cart_holds || []).length, inserted: 0 };
  for (const r of (d.cart_holds || [])) {
    try {
      let cartData = r.cart_data;
      if (typeof cartData === 'string') { try { cartData = JSON.parse(cartData); } catch { cartData = {}; } }
      await CartHold.create({ company_id: oid, label: r.label ?? null, cart_data: cartData ?? {}, created_by: null, created_at: ts(r.created_at) });
      report['cart_holds'].inserted++;
    } catch (e) { logger.warn(`[Backup] cart_holds skip: ${e.message}`); }
  }

  return report;
}

// ── Export ─────────────────────────────────────────────────────────────────────
exports.exportBackup = async (req, res, next) => {
  const cid = req.companyId;
  try {
    const [
      settings, categories, brands, suppliers,
      products, customers, sales, purchases,
      purchasePayments, returns, expenseCategories, expenses,
      stockAdjustments, company, employees, salaries, attendance,
      bom, productionBatches, cartHolds,
    ] = await Promise.all([
      Setting.find({ company_id: cid }, { key: 1, value: 1, type: 1, group_name: 1, label: 1 }).lean(),
      Category.find({ company_id: cid }).lean(),
      Brand.find({ company_id: cid }).lean(),
      Supplier.find({ company_id: cid }).lean(),
      Product.find({ company_id: cid }).lean(),
      Customer.find({ company_id: cid }).lean(),
      Sale.find({ company_id: cid }).lean(),
      Purchase.find({ company_id: cid }).lean(),
      PurchasePayment.find({ company_id: cid }).lean(),
      Return.find({ company_id: cid }).lean(),
      ExpenseCategory.find({ company_id: cid }).lean(),
      Expense.find({ company_id: cid }).lean(),
      StockAdjustment.find({ company_id: cid }).lean(),
      Company.findById(cid, { name: 1, slug: 1, email: 1, phone: 1, plan: 1, subscription_status: 1, max_users: 1, created_at: 1 }).lean(),
      Employee.find({ company_id: cid }).lean(),
      Salary.find({ company_id: cid }).lean(),
      Attendance.find({ company_id: cid }).lean(),
      BOM.find({ company_id: cid }).lean(),
      ProductionBatch.find({ company_id: cid }).lean(),
      CartHold.find({ company_id: cid }).lean(),
    ]);

    // Flatten embedded arrays for backup compatibility
    const productVariants = products.flatMap(p =>
      (p.variants || []).map(v => ({ ...v, id: v._id?.toString(), product_id: p._id.toString() }))
    );
    const saleItems = sales.flatMap(s =>
      (s.items || []).map(item => ({ ...item, id: item._id?.toString(), sale_id: s._id.toString() }))
    );
    const purchaseItems = purchases.flatMap(p =>
      (p.items || []).map(item => ({ ...item, id: item._id?.toString(), purchase_id: p._id.toString() }))
    );
    const returnItems = returns.flatMap(r =>
      (r.items || []).map(item => ({ ...item, id: item._id?.toString(), return_id: r._id.toString() }))
    );
    const exchangeItems = returns.flatMap(r =>
      (r.exchange_items || []).map(item => ({ ...item, id: item._id?.toString(), return_id: r._id.toString() }))
    );
    const stockAdjustmentItems = stockAdjustments.flatMap(a =>
      (a.items || []).map(item => ({ ...item, id: item._id?.toString(), adjustment_id: a._id.toString() }))
    );
    const productionBatchMaterials = productionBatches.flatMap(b =>
      (b.materials || []).map(m => ({ ...m, id: m._id?.toString(), batch_id: b._id.toString() }))
    );

    // Strip embedded arrays from parent docs for the top-level arrays
    const salesFlat = sales.map(s => { const { items, ...rest } = s; return { ...rest, id: s._id.toString() }; });
    const purchasesFlat = purchases.map(p => { const { items, ...rest } = p; return { ...rest, id: p._id.toString() }; });
    const returnsFlat = returns.map(r => { const { items, exchange_items, ...rest } = r; return { ...rest, id: r._id.toString() }; });
    const stockAdjFlat = stockAdjustments.map(a => { const { items, ...rest } = a; return { ...rest, id: a._id.toString() }; });
    const batchesFlat = productionBatches.map(b => { const { materials, ...rest } = b; return { ...rest, id: b._id.toString() }; });
    const productsFlat = products.map(p => { const { variants, ...rest } = p; return { ...rest, id: p._id.toString() }; });

    const counts = {
      categories:                  categories.length,
      brands:                      brands.length,
      suppliers:                   suppliers.length,
      products:                    products.length,
      product_variants:            productVariants.length,
      customers:                   customers.length,
      sales:                       sales.length,
      sale_items:                  saleItems.length,
      purchases:                   purchases.length,
      purchase_items:              purchaseItems.length,
      purchase_payments:           purchasePayments.length,
      returns:                     returns.length,
      return_items:                returnItems.length,
      exchange_items:              exchangeItems.length,
      expense_categories:          expenseCategories.length,
      expenses:                    expenses.length,
      stock_adjustments:           stockAdjustments.length,
      stock_adjustment_items:      stockAdjustmentItems.length,
      employees:                   employees.length,
      salaries:                    salaries.length,
      attendance:                  attendance.length,
      bill_of_materials:           bom.length,
      production_batches:          productionBatches.length,
      production_batch_materials:  productionBatchMaterials.length,
      cart_holds:                  cartHolds.length,
    };

    const data = {
      settings, categories, brands, suppliers,
      products: productsFlat, product_variants: productVariants,
      customers,
      sales: salesFlat, sale_items: saleItems,
      purchases: purchasesFlat, purchase_items: purchaseItems, purchase_payments: purchasePayments,
      returns: returnsFlat, return_items: returnItems, exchange_items: exchangeItems,
      expense_categories: expenseCategories, expenses,
      stock_adjustments: stockAdjFlat, stock_adjustment_items: stockAdjustmentItems,
      employees, salaries, attendance,
      bill_of_materials: bom,
      production_batches: batchesFlat, production_batch_materials: productionBatchMaterials,
      cart_holds: cartHolds,
    };

    const backup   = { version: '2.0', exported_at: now(), company: { ...company, id: company?._id?.toString() }, counts, data };
    const filename = `backup-${company?.slug || cid}-${now().slice(0, 10)}.json`;

    // Save server-side snapshot (keep only 10 most recent)
    try {
      await CompanyBackup.create({ company_id: cid, created_by: req.user?.id ?? null, file_name: filename, version: backup.version, row_counts: counts, data });
      const old = await CompanyBackup.find({ company_id: cid }, { _id: 1 }).sort({ created_at: -1 }).skip(10).lean();
      if (old.length) await CompanyBackup.deleteMany({ _id: { $in: old.map(o => o._id) } });
    } catch (saveErr) {
      logger.error(`[Backup] Failed to save server snapshot: ${saveErr.message}`);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(backup, null, 2), 'utf8');
  } catch (err) { next(err); }
};

// ── Restore from JSON body ─────────────────────────────────────────────────────
exports.restoreBackup = async (req, res, next) => {
  const cid  = req.companyId;
  const body = req.body;

  let d;
  if (body?.version && body?.data && typeof body.data === 'object') {
    d = body.data;
  } else if (body?.success === true && body?.data?.version && body?.data?.data) {
    d = body.data.data;
  } else if (body && typeof body === 'object' && !Array.isArray(body) &&
             (body.products || body.categories || body.sales || body.customers)) {
    d = body;
  } else {
    return error(res, 'Invalid backup file format.', 422);
  }

  try {
    const report = await performRestore(cid, d, req.user?.id);
    logger.info(`[Backup] JSON restore done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', null, null, { source: 'json', report });
    return success(res, { report }, 'Backup restored successfully.');
  } catch (err) {
    logger.error(`[Backup] Restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', null, null, { source: 'json', reason: err.message }); } catch (_) {}
    next(err);
  }
};

// ── Restore from uploaded file (SQLite .db or JSON) ────────────────────────────
exports.restoreBackupFile = async (req, res, next) => {
  const cid = req.companyId;

  if (!req.file?.buffer) return error(res, 'No file received.', 422);

  const buf = req.file.buffer;
  let d;
  let source;

  if (isSqlite(buf)) {
    source = 'sqlite';
    try {
      d = await sqliteBufferToData(buf);
    } catch (err) {
      return error(res, `Could not read SQLite file: ${err.message}`, 422);
    }
  } else {
    source = 'json';
    try {
      let text;
      if (buf[0] === 0xFF && buf[1] === 0xFE)                           text = buf.slice(2).toString('utf16le');
      else if (buf[0] === 0xFE && buf[1] === 0xFF)                      text = buf.slice(2).swap16().toString('utf16le');
      else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF)  text = buf.slice(3).toString('utf8');
      else                                                               text = buf.toString('utf8');

      const parsed = JSON.parse(text.trim());

      if (parsed?.version && parsed?.data && typeof parsed.data === 'object') {
        d = parsed.data;
      } else if (parsed?.success === true && parsed?.data?.version && parsed?.data?.data) {
        d = parsed.data.data;
      } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                 (parsed.products || parsed.categories || parsed.sales || parsed.customers)) {
        d = parsed;
      } else {
        return error(res, 'Uploaded file is not a recognised backup format.', 422);
      }
    } catch (err) {
      return error(res, `File is not a valid SQLite database or JSON backup: ${err.message}`, 422);
    }
  }

  try {
    const report = await performRestore(cid, d, req.user?.id);
    logger.info(`[Backup] File restore (${source}) done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', null, null, { source, report });
    return success(res, { report, source }, 'Backup restored successfully.');
  } catch (err) {
    logger.error(`[Backup] File restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', null, null, { source, reason: err.message }); } catch (_) {}
    next(err);
  }
};

// ── List stored server-side backup snapshots ──────────────────────────────────
exports.listBackups = async (req, res, next) => {
  const cid = req.companyId;
  try {
    const backups = await CompanyBackup.find({ company_id: cid }, { data: 0 }).sort({ created_at: -1 }).limit(10).lean();
    return success(res, backups.map(b => ({ ...b, id: b._id.toString() })), 'Backup history retrieved.');
  } catch (err) { next(err); }
};

// ── Restore from a stored server-side snapshot ────────────────────────────────
exports.restoreSnapshot = async (req, res, next) => {
  const cid = req.companyId;

  const snap = await CompanyBackup.findOne({ _id: req.params.id, company_id: cid }).lean();
  if (!snap) return error(res, 'Backup snapshot not found.', 404);

  const currentProducts  = await Product.countDocuments({ company_id: cid });
  const snapshotProducts = snap.row_counts?.products ?? 0;
  if (currentProducts > 0 && snapshotProducts === 0) {
    logger.warn(`[Backup] Snapshot has 0 products but DB has ${currentProducts} — restore will NOT delete existing records (upsert-only).`);
  }

  try {
    const report = await performRestore(cid, snap.data, req.user?.id);
    logger.info(`[Backup] Snapshot ${req.params.id} restore done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', req.params.id, null, { source: 'snapshot', report });
    return success(res, { report }, 'Backup restored successfully.');
  } catch (err) {
    logger.error(`[Backup] Snapshot restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', req.params.id, null, { source: 'snapshot', reason: err.message }); } catch (_) {}
    next(err);
  }
};
