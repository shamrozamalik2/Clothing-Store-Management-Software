'use strict';

const { query, getClient } = require('../config/database');
const { success, error }   = require('../utils/response');
const logger               = require('../config/logger');

const now = () => new Date().toISOString();
const ts  = v => v ?? now();

// ── SQLite detection ──────────────────────────────────────────────────────────
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');
const isSqlite = buf => buf.length >= 16 && buf.slice(0, 16).equals(SQLITE_MAGIC);

// Read all tables from a SQLite .db buffer using sql.js (pure WASM, no native bindings)
async function sqliteBufferToData(buf) {
  let initSqlJs;
  try { initSqlJs = require('sql.js'); }
  catch { throw new Error('sql.js is not installed on the server.'); }

  const SQL = await initSqlJs();
  const db  = new SQL.Database(new Uint8Array(buf));

  // List every user table that actually exists in this file
  const masterRes  = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  const tableNames = masterRes.length ? masterRes[0].values.map(r => String(r[0])) : [];
  logger.info(`[Backup] SQLite tables found: ${tableNames.join(', ') || '(none)'}`);

  // Read a table by exact name → array of row objects
  function tbl(name) {
    if (!tableNames.includes(name)) return [];
    try {
      const res = db.exec(`SELECT * FROM "${name}"`);
      if (!res.length) return [];
      const { columns, values } = res[0];
      return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    } catch { return []; }
  }

  // Try a list of candidate names, return the first that has rows
  function tblAny(...names) {
    for (const n of names) {
      const rows = tbl(n);
      if (rows.length) return rows;
    }
    // Fallback: return rows from first existing name even if empty
    for (const n of names) {
      if (tableNames.includes(n)) return tbl(n);
    }
    return [];
  }

  const data = {
    categories:             tblAny('categories',           'category'),
    brands:                 tblAny('brands',               'brand'),
    suppliers:              tblAny('suppliers',            'supplier'),
    products:               tblAny('products',             'product', 'items', 'inventory'),
    product_variants:       tblAny('product_variants',     'variants', 'product_variant'),
    customers:              tblAny('customers',            'customer', 'clients', 'client'),
    sales:                  tblAny('sales',                'sale',    'orders',  'invoices'),
    sale_items:             tblAny('sale_items',           'sale_item','order_items','invoice_items'),
    purchases:              tblAny('purchases',            'purchase', 'purchase_orders'),
    purchase_items:         tblAny('purchase_items',       'purchase_item'),
    purchase_payments:      tblAny('purchase_payments',    'purchase_payment'),
    returns:                tblAny('returns',              'return',  'refunds'),
    return_items:           tblAny('return_items',         'return_item'),
    exchange_items:         tblAny('exchange_items',       'exchange_item', 'exchanges'),
    expense_categories:     tblAny('expense_categories',   'expense_category', 'expense_cats'),
    expenses:               tblAny('expenses',             'expense'),
    stock_adjustments:      tblAny('stock_adjustments',    'stock_adjustment', 'adjustments'),
    stock_adjustment_items: tblAny('stock_adjustment_items','stock_adjustment_item'),
    settings:               tblAny('settings',             'setting',  'config', 'configuration'),
  };

  db.close();

  const totalRows = Object.values(data).reduce((s, r) => s + r.length, 0);
  logger.info(`[Backup] SQLite total rows extracted: ${totalRows}`);

  if (totalRows === 0) {
    throw new Error(
      `No data could be read from the SQLite file. Tables found: [${tableNames.join(', ') || 'none'}]. ` +
      `Expected tables like: products, sales, customers, categories.`
    );
  }

  return data;
}

// ── bulkInsert — ON CONFLICT DO UPDATE ensures zero rows skipped ──────────────
async function bulkInsert(client, table, cols, rows, mapper) {
  if (!rows?.length) return 0;
  let total = 0;
  const CHUNK   = 500;
  const updateSet = cols.filter(c => c !== 'id').map(c => `${c}=EXCLUDED.${c}`).join(',');

  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const n  = cols.length;
    const ph = chunk
      .map((_, i) => `(${cols.map((__, j) => `$${i * n + j + 1}`).join(',')})`)
      .join(',');
    const res = await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph}
       ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
      chunk.flatMap(mapper)
    );
    total += res.rowCount || 0;
  }
  return total;
}

// ── Core restore — shared by both endpoints ────────────────────────────────────
async function performRestore(client, cid, d) {
  // Safety guard: never delete existing data if the backup contains nothing
  const totalRows = Object.values(d).reduce((s, rows) => s + (Array.isArray(rows) ? rows.length : 0), 0);
  if (totalRows === 0) {
    throw new Error('Backup file contains no data rows. Restore aborted — your existing data has not been changed.');
  }

  const report = {};

  const ins = async (table, cols, rows, mapper) => {
    if (!rows?.length) { report[table] = { provided: 0, inserted: 0 }; return 0; }
    const inserted = await bulkInsert(client, table, cols, rows, mapper);
    report[table] = { provided: rows.length, inserted };
    return inserted;
  };

  // Delete in FK-safe order (children first)
  await client.query(`DELETE FROM exchange_items          WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM return_items            WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM returns                 WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM stock_adjustment_items  WHERE adjustment_id IN (SELECT id FROM stock_adjustments WHERE company_id=$1)`, [cid]);
  await client.query(`DELETE FROM stock_adjustments       WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM sale_items              WHERE sale_id IN (SELECT id FROM sales WHERE company_id=$1)`, [cid]);
  await client.query(`DELETE FROM sales                   WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM purchase_payments       WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM purchase_items          WHERE purchase_id IN (SELECT id FROM purchases WHERE company_id=$1)`, [cid]);
  await client.query(`DELETE FROM purchases               WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM expenses                WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM expense_categories      WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM product_variants        WHERE product_id IN (SELECT id FROM products WHERE company_id=$1)`, [cid]);
  await client.query(`DELETE FROM products                WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM customers               WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM suppliers               WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM brands                  WHERE company_id=$1`, [cid]);
  await client.query(`DELETE FROM categories              WHERE company_id=$1`, [cid]);

  // Insert in FK-safe order (parents first)
  await ins('categories',
    ['id','company_id','name','description','is_active','created_at','updated_at'],
    d.categories, r => [
      r.id, cid, r.name, r.description ?? null, r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('brands',
    ['id','company_id','name','description','is_active','created_at','updated_at'],
    d.brands, r => [
      r.id, cid, r.name, r.description ?? null, r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('suppliers',
    ['id','company_id','name','email','phone','address','city','is_active','created_at','updated_at'],
    d.suppliers, r => [
      r.id, cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null, r.city ?? null,
      r.is_active ?? true, ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('products',
    ['id','company_id','name','sku','barcode','description','category_id','brand_id',
     'cost_price','sale_price','wholesale_price','tax_rate','stock_quantity',
     'low_stock_alert','unit','is_active','created_at','updated_at'],
    d.products, r => [
      r.id, cid,
      r.name,
      r.sku ?? String(r.id),
      r.barcode ?? null,
      r.description ?? null,
      r.category_id ?? null,
      r.brand_id ?? null,
      r.cost_price ?? 0,
      r.sale_price ?? r.selling_price ?? r.price ?? 0,
      r.wholesale_price ?? 0,
      r.tax_rate ?? 0,
      r.stock_quantity ?? r.quantity ?? 0,
      r.low_stock_alert ?? r.min_stock_level ?? r.reorder_level ?? 5,
      r.unit ?? 'pcs',
      r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('product_variants',
    ['id','company_id','product_id','sku','barcode','size','color',
     'cost_price','sale_price','stock_quantity','is_active','created_at','updated_at'],
    d.product_variants, r => [
      r.id, r.company_id ?? cid, r.product_id,
      r.sku ?? `VAR-${r.id}`, r.barcode ?? null,
      r.size ?? null, r.color ?? null,
      r.cost_price ?? 0, r.sale_price ?? 0,
      r.stock_quantity ?? 0, r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('customers',
    ['id','company_id','name','email','phone','address','city','loyalty_points','is_active','created_at','updated_at'],
    d.customers, r => [
      r.id, cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null, r.city ?? null,
      r.loyalty_points ?? 0, r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('sales',
    ['id','company_id','branch_id','customer_id','reference','status','sale_date',
     'subtotal','tax_amount','discount_amount','total_amount','paid_amount',
     'change_amount','due_amount','payment_method','notes','created_by','created_at','updated_at'],
    d.sales, r => {
      const total = r.total_amount ?? r.total ?? r.grand_total ?? 0;
      return [
        r.id, cid, r.branch_id ?? null, r.customer_id ?? null,
        r.reference ?? r.reference_no ?? r.invoice_no ?? `IMPORT-${r.id}`,
        r.status ?? 'completed',
        r.sale_date ?? r.date ?? ts(r.created_at),
        r.subtotal ?? total, r.tax_amount ?? r.tax ?? 0,
        r.discount_amount ?? r.discount ?? 0, total,
        r.paid_amount ?? total, r.change_amount ?? 0, r.due_amount ?? 0,
        r.payment_method ?? r.payment_type ?? 'cash',
        r.notes ?? null, r.created_by ?? r.user_id ?? null,
        ts(r.created_at), ts(r.updated_at ?? r.created_at),
      ];
    });

  await ins('sale_items',
    ['id','company_id','sale_id','product_id','product_name','sku',
     'quantity','unit_price','cost_price','discount','tax_amount','total','created_at'],
    d.sale_items, r => [
      r.id, cid, r.sale_id, r.product_id ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? r.price ?? 0,
      r.cost_price ?? 0, r.discount ?? 0, r.tax_amount ?? 0,
      r.total ?? r.subtotal ?? 0, ts(r.created_at),
    ]);

  await ins('purchases',
    ['id','company_id','branch_id','supplier_id','reference','status','purchase_date',
     'subtotal','tax_amount','discount_amount','total_amount','paid_amount',
     'due_amount','notes','created_by','created_at','updated_at'],
    d.purchases, r => {
      const total = r.total_amount ?? r.total ?? 0;
      return [
        r.id, cid, r.branch_id ?? null, r.supplier_id ?? null,
        r.reference ?? r.reference_no ?? `IMPORT-PO-${r.id}`,
        r.status ?? 'received',
        r.purchase_date ?? r.date ?? ts(r.created_at),
        r.subtotal ?? total, r.tax_amount ?? r.tax ?? 0,
        r.discount_amount ?? r.discount ?? 0, total,
        r.paid_amount ?? total, r.due_amount ?? 0,
        r.notes ?? null, r.created_by ?? r.user_id ?? null,
        ts(r.created_at), ts(r.updated_at ?? r.created_at),
      ];
    });

  await ins('purchase_items',
    ['id','company_id','purchase_id','product_id','product_name','sku',
     'quantity','unit_cost','discount','tax_amount','total','created_at'],
    d.purchase_items, r => [
      r.id, cid, r.purchase_id, r.product_id ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_cost ?? r.cost ?? 0,
      r.discount ?? 0, r.tax_amount ?? 0, r.total ?? 0,
      ts(r.created_at),
    ]);

  await ins('purchase_payments',
    ['id','company_id','purchase_id','amount','payment_method','reference',
     'notes','paid_at','created_by','created_at','updated_at'],
    d.purchase_payments, r => [
      r.id, cid, r.purchase_id, r.amount ?? 0,
      r.payment_method ?? 'cash', r.reference ?? null, r.notes ?? null,
      r.paid_at ?? ts(r.created_at),
      r.created_by ?? null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('returns',
    ['id','company_id','sale_id','reference','return_date','total_amount',
     'refund_method','refund_amount','type','reason','notes','created_by','created_at','updated_at'],
    d.returns, r => [
      r.id, cid, r.sale_id ?? null,
      r.reference ?? `IMPORT-RET-${r.id}`,
      r.return_date ?? ts(r.created_at),
      r.total_amount ?? 0,
      r.refund_method ?? 'cash', r.refund_amount ?? r.total_amount ?? 0,
      r.type ?? 'return', r.reason ?? null, r.notes ?? null,
      r.created_by ?? null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('return_items',
    ['id','company_id','return_id','product_id','variant_id',
     'product_name','sku','quantity','unit_price','total','created_at'],
    d.return_items, r => [
      r.id, cid, r.return_id, r.product_id ?? null, r.variant_id ?? null,
      r.product_name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? 0, r.total ?? 0,
      ts(r.created_at),
    ]);

  await ins('exchange_items',
    ['id','company_id','return_id','product_id','variant_id',
     'product_name','sku','quantity','unit_price','total'],
    d.exchange_items, r => [
      r.id, cid, r.return_id, r.product_id ?? null, r.variant_id ?? null,
      r.product_name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? 0, r.total ?? 0,
    ]);

  await ins('expense_categories',
    ['id','company_id','name','is_active','created_at'],
    d.expense_categories, r => [
      r.id, cid, r.name, r.is_active ?? true, ts(r.created_at),
    ]);

  await ins('expenses',
    ['id','company_id','branch_id','category_id','title','amount',
     'payment_method','expense_date','notes','created_by','created_at','updated_at'],
    d.expenses, r => [
      r.id, cid, r.branch_id ?? null, r.category_id ?? null,
      r.title ?? r.description ?? r.name ?? 'Expense',
      r.amount ?? 0, r.payment_method ?? 'cash',
      r.expense_date ?? r.date ?? ts(r.created_at),
      r.notes ?? null, r.created_by ?? r.user_id ?? null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('stock_adjustments',
    ['id','company_id','branch_id','reference','type','reason',
     'status','notes','created_by','created_at','updated_at'],
    d.stock_adjustments, r => [
      r.id, cid, r.branch_id ?? null,
      r.reference ?? `IMPORT-ADJ-${r.id}`,
      r.type ?? 'adjustment', r.reason ?? null,
      r.status ?? 'completed', r.notes ?? null,
      r.created_by ?? r.user_id ?? null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ]);

  await ins('stock_adjustment_items',
    ['id','company_id','adjustment_id','product_id','product_name','sku',
     'quantity_before','quantity_adjusted','quantity_after','unit_cost','created_at'],
    d.stock_adjustment_items, r => [
      r.id, cid, r.adjustment_id, r.product_id ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity_before ?? r.old_quantity ?? 0,
      r.quantity_adjusted ?? r.quantity ?? 0,
      r.quantity_after ?? r.new_quantity ?? 0,
      r.unit_cost ?? 0, ts(r.created_at),
    ]);

  // Settings — upsert (preserve existing keys not in backup)
  for (const r of (d.settings || [])) {
    await client.query(
      `INSERT INTO settings (company_id,key,value,type,group_name,label)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [cid, r.key, r.value ?? null, r.type ?? 'string', r.group_name ?? 'general', r.label ?? null]
    );
  }

  // Reset sequences so new records don't clash with restored IDs
  const seqTables = [
    'categories','brands','suppliers','products','customers',
    'sales','sale_items','purchases','purchase_items',
    'expense_categories','expenses',
    'stock_adjustments','stock_adjustment_items',
    'product_variants','purchase_payments',
    'returns','return_items','exchange_items',
  ];
  for (const t of seqTables) {
    try {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`
      );
    } catch (_) {}
  }

  return report;
}

// ── Export ─────────────────────────────────────────────────────────────────────
exports.exportBackup = async (req, res, next) => {
  const cid = req.companyId;
  try {
    const [
      { rows: settings },
      { rows: categories },
      { rows: brands },
      { rows: suppliers },
      { rows: products },
      { rows: productVariants },
      { rows: customers },
      { rows: sales },
      { rows: saleItems },
      { rows: purchases },
      { rows: purchaseItems },
      { rows: purchasePayments },
      { rows: returns },
      { rows: returnItems },
      { rows: exchangeItems },
      { rows: expenseCategories },
      { rows: expenses },
      { rows: stockAdjustments },
      { rows: stockAdjustmentItems },
      { rows: users },
      { rows: company },
    ] = await Promise.all([
      query(`SELECT key,value,type,group_name,label FROM settings WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM categories WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM brands     WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM suppliers  WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM products   WHERE company_id=$1`, [cid]),
      query(`SELECT pv.* FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.company_id=$1`, [cid]),
      query(`SELECT * FROM customers  WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM sales      WHERE company_id=$1`, [cid]),
      query(`SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.company_id=$1`, [cid]),
      query(`SELECT * FROM purchases  WHERE company_id=$1`, [cid]),
      query(`SELECT pi.* FROM purchase_items pi JOIN purchases p ON p.id=pi.purchase_id WHERE p.company_id=$1`, [cid]),
      query(`SELECT * FROM purchase_payments WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM returns    WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM return_items   WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM exchange_items WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM expense_categories WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM expenses   WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM stock_adjustments WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM stock_adjustment_items WHERE company_id=$1`, [cid]),
      query(`SELECT id,name,email,role_id,branch_id,is_active,created_at FROM users WHERE company_id=$1`, [cid]),
      query(`SELECT id,name,slug,email,phone,plan,subscription_status,max_users,created_at FROM companies WHERE id=$1`, [cid]),
    ]);

    const backup = {
      version:     '2.0',
      exported_at: now(),
      company:     company[0] || {},
      counts: {
        categories: categories.length, brands: brands.length,
        suppliers: suppliers.length, products: products.length,
        product_variants: productVariants.length, customers: customers.length,
        sales: sales.length, sale_items: saleItems.length,
        purchases: purchases.length, purchase_items: purchaseItems.length,
        purchase_payments: purchasePayments.length,
        returns: returns.length, return_items: returnItems.length,
        exchange_items: exchangeItems.length,
        expense_categories: expenseCategories.length, expenses: expenses.length,
        stock_adjustments: stockAdjustments.length,
        stock_adjustment_items: stockAdjustmentItems.length,
      },
      data: {
        settings, categories, brands, suppliers,
        products, product_variants: productVariants, customers,
        sales, sale_items: saleItems,
        purchases, purchase_items: purchaseItems, purchase_payments: purchasePayments,
        returns, return_items: returnItems, exchange_items: exchangeItems,
        expense_categories: expenseCategories, expenses,
        stock_adjustments: stockAdjustments, stock_adjustment_items: stockAdjustmentItems,
        users,
      },
    };

    const filename = `backup-${company[0]?.slug || cid}-${now().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(backup, null, 2), 'utf8');
  } catch (err) { next(err); }
};

// ── Restore from JSON body (existing route, kept for API compatibility) ────────
exports.restoreBackup = async (req, res, next) => {
  const cid  = req.companyId;
  const body = req.body;

  let d;
  if (body?.version && body?.data && typeof body.data === 'object') {
    d = body.data;
  } else if (body?.success === true && body?.data?.version && body?.data?.data) {
    d = body.data.data; // unwrap axios envelope saved by old export code
  } else if (body && typeof body === 'object' && !Array.isArray(body) &&
             (body.products || body.categories || body.sales || body.customers)) {
    d = body;
  } else {
    return error(res, 'Invalid backup file format.', 422);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const report = await performRestore(client, cid, d);
    await client.query('COMMIT');
    logger.info(`[Backup] JSON restore done for company ${cid}`);
    return success(res, { report }, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] Restore failed for company ${cid}: ${err.message}`);
    next(err);
  } finally {
    client.release();
  }
};

// ── Restore from uploaded file (SQLite .db or JSON) ────────────────────────────
exports.restoreBackupFile = async (req, res, next) => {
  const cid = req.companyId;

  if (!req.file?.buffer) {
    return error(res, 'No file received.', 422);
  }

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
      // Strip BOM (UTF-8, UTF-16 LE/BE)
      let text;
      if (buf[0] === 0xFF && buf[1] === 0xFE)     text = buf.slice(2).toString('utf16le');
      else if (buf[0] === 0xFE && buf[1] === 0xFF) text = buf.slice(2).swap16().toString('utf16le');
      else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) text = buf.slice(3).toString('utf8');
      else text = buf.toString('utf8');

      const body = JSON.parse(text.trim());

      if (body?.version && body?.data && typeof body.data === 'object') {
        d = body.data;
      } else if (body?.success === true && body?.data?.version && body?.data?.data) {
        d = body.data.data;
      } else if (body && typeof body === 'object' && !Array.isArray(body) &&
                 (body.products || body.categories || body.sales || body.customers)) {
        d = body;
      } else {
        return error(res, 'Uploaded file is not a recognised backup format.', 422);
      }
    } catch (err) {
      return error(res, `File is not a valid SQLite database or JSON backup: ${err.message}`, 422);
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const report = await performRestore(client, cid, d);
    await client.query('COMMIT');
    logger.info(`[Backup] File restore (${source}) done for company ${cid}`);
    return success(res, { report, source }, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] File restore failed for company ${cid}: ${err.message}`);
    next(err);
  } finally {
    client.release();
  }
};
