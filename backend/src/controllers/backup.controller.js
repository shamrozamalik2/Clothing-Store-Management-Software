'use strict';

const { query, getClient } = require('../config/database');
const { success, error }   = require('../utils/response');
const { logAudit }         = require('../utils/audit');
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

  // Detect WAL mode from the file header (byte 18 = write version; 2 = WAL)
  // In WAL mode the live data is split between .db and .db-wal — opening only
  // the .db file shows an empty database if no checkpoint has run yet.
  const isWal = buf.length > 19 && buf[18] === 2 && buf[19] === 2;

  const SQL = await initSqlJs();
  const db  = new SQL.Database(new Uint8Array(buf));

  // Diagnostics
  let pageCount = 0;
  try {
    const pc = db.exec('PRAGMA page_count');
    pageCount = pc[0]?.values[0]?.[0] ?? 0;
  } catch {}

  // List every user table that actually exists in this file
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
    for (const n of names) {
      if (tableNames.includes(n)) return tbl(n);
    }
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

// ── Core restore — shared by both endpoints ────────────────────────────────────
//
// ID-free restore: never insert the original `id` value from the backup.
// Each row receives a fresh PG-assigned ID. FK references between tables
// are remapped through old→new maps built from RETURNING clauses.
// This prevents cross-company ID collisions entirely: two companies can
// have overlapping legacy IDs with no risk of data theft.
async function performRestore(client, cid, d, userId) {
  const totalRows = Object.values(d).reduce((s, rows) => s + (Array.isArray(rows) ? rows.length : 0), 0);
  if (totalRows === 0) {
    throw new Error('Backup file contains no data rows. Restore aborted — your existing data has not been changed.');
  }

  const report = {};

  // Insert rows without `id`, conflict on natural key, return id + key column for mapping.
  async function insertNatural(table, { cols, mapper, conflictCols, onConflict, returnKey }, rows) {
    report[table] = { provided: rows?.length ?? 0, inserted: 0 };
    if (!rows?.length) return {};
    const CHUNK = 500;
    const keyToId = {};
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const n  = cols.length;
      const ph = chunk.map((_, i) => `(${cols.map((__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph}
         ON CONFLICT (${conflictCols}) ${onConflict}
         RETURNING id, ${returnKey}`,
        chunk.flatMap(mapper)
      );
      for (const row of res.rows) keyToId[row[returnKey]] = row.id;
      report[table].inserted += res.rows.length;
    }
    return keyToId;
  }

  // Delete existing children for the given parent IDs then bulk-insert fresh rows.
  async function insertChildren(table, { cols, mapper, parentIdCol, parentIds }, rows) {
    report[table] = { provided: rows?.length ?? 0, inserted: 0 };
    if (!parentIds?.size) return;
    await client.query(
      `DELETE FROM ${table} WHERE ${parentIdCol} = ANY($1)`,
      [Array.from(parentIds)]
    );
    if (!rows?.length) return;
    const CHUNK = 500;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const n  = cols.length;
      const ph = chunk.map((_, i) => `(${cols.map((__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph}`,
        chunk.flatMap(mapper)
      );
      report[table].inserted += res.rowCount || 0;
    }
  }

  // ── 1. Categories ─────────────────────────────────────────────────────────
  const catKeyMap = await insertNatural('categories', {
    cols: ['company_id','name','description','is_active','created_at','updated_at'],
    mapper: r => [cid, r.name, r.description ?? null, r.is_active ?? true, ts(r.created_at), ts(r.updated_at ?? r.created_at)],
    conflictCols: 'company_id, name',
    onConflict: 'DO UPDATE SET description=EXCLUDED.description, is_active=EXCLUDED.is_active, updated_at=NOW()',
    returnKey: 'name',
  }, d.categories);
  const catMap = {};
  for (const r of (d.categories || [])) if (r.name) catMap[r.id] = catKeyMap[r.name];

  // ── 2. Brands ─────────────────────────────────────────────────────────────
  const brandKeyMap = await insertNatural('brands', {
    cols: ['company_id','name','description','is_active','created_at','updated_at'],
    mapper: r => [cid, r.name, r.description ?? null, r.is_active ?? true, ts(r.created_at), ts(r.updated_at ?? r.created_at)],
    conflictCols: 'company_id, name',
    onConflict: 'DO UPDATE SET description=EXCLUDED.description, is_active=EXCLUDED.is_active, updated_at=NOW()',
    returnKey: 'name',
  }, d.brands);
  const brandMap = {};
  for (const r of (d.brands || [])) if (r.name) brandMap[r.id] = brandKeyMap[r.name];

  // ── 3. Suppliers ──────────────────────────────────────────────────────────
  const suppKeyMap = await insertNatural('suppliers', {
    cols: ['company_id','name','email','phone','address','city','is_active','created_at','updated_at'],
    mapper: r => [cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null, r.city ?? null, r.is_active ?? true, ts(r.created_at), ts(r.updated_at ?? r.created_at)],
    conflictCols: 'company_id, name',
    onConflict: 'DO UPDATE SET email=EXCLUDED.email, phone=EXCLUDED.phone, address=EXCLUDED.address, updated_at=NOW()',
    returnKey: 'name',
  }, d.suppliers);
  const suppMap = {};
  for (const r of (d.suppliers || [])) if (r.name) suppMap[r.id] = suppKeyMap[r.name];

  // ── 4. Products ───────────────────────────────────────────────────────────
  const products = (d.products || []).map(r => ({ ...r, _sku: r.sku ?? String(r.id) }));
  const prodKeyMap = await insertNatural('products', {
    cols: ['company_id','name','sku','barcode','description','category_id','brand_id',
           'cost_price','sale_price','wholesale_price','tax_rate','stock_quantity',
           'low_stock_alert','unit','is_active','created_at','updated_at'],
    mapper: r => [
      cid, r.name, r._sku, r.barcode ?? null, r.description ?? null,
      catMap[r.category_id] ?? null, brandMap[r.brand_id] ?? null,
      r.cost_price ?? 0, r.sale_price ?? r.selling_price ?? r.price ?? 0,
      r.wholesale_price ?? 0, r.tax_rate ?? 0,
      r.stock_quantity ?? r.quantity ?? 0,
      r.low_stock_alert ?? r.min_stock_level ?? r.reorder_level ?? 5,
      r.unit ?? 'pcs', r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ],
    conflictCols: 'company_id, sku',
    onConflict: `DO UPDATE SET name=EXCLUDED.name, barcode=EXCLUDED.barcode,
      description=EXCLUDED.description, category_id=EXCLUDED.category_id,
      brand_id=EXCLUDED.brand_id, cost_price=EXCLUDED.cost_price,
      sale_price=EXCLUDED.sale_price, wholesale_price=EXCLUDED.wholesale_price,
      stock_quantity=EXCLUDED.stock_quantity, is_active=EXCLUDED.is_active, updated_at=NOW()`,
    returnKey: 'sku',
  }, products);
  const productMap = {};
  for (const r of products) productMap[r.id] = prodKeyMap[r._sku];

  // ── 5. Product Variants ───────────────────────────────────────────────────
  const variants = (d.product_variants || [])
    .filter(r => productMap[r.product_id])
    .map(r => ({ ...r, _sku: r.sku ?? `VAR-${r.id}` }));
  const varKeyMap = await insertNatural('product_variants', {
    cols: ['company_id','product_id','sku','barcode','size','color',
           'cost_price','sale_price','stock_quantity','is_active','created_at','updated_at'],
    mapper: r => [
      cid, productMap[r.product_id], r._sku, r.barcode ?? null,
      r.size ?? null, r.color ?? null,
      r.cost_price ?? 0, r.sale_price ?? 0,
      r.stock_quantity ?? 0, r.is_active ?? true,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ],
    conflictCols: 'company_id, sku',
    onConflict: `DO UPDATE SET product_id=EXCLUDED.product_id, size=EXCLUDED.size,
      color=EXCLUDED.color, cost_price=EXCLUDED.cost_price,
      sale_price=EXCLUDED.sale_price, stock_quantity=EXCLUDED.stock_quantity,
      is_active=EXCLUDED.is_active, updated_at=NOW()`,
    returnKey: 'sku',
  }, variants);
  const variantMap = {};
  for (const r of variants) variantMap[r.id] = varKeyMap[r._sku];

  // ── 6. Customers (no reliable natural key — insert fresh, build map via RETURNING) ──
  const customerMap = {};
  for (const r of (d.customers || [])) {
    const res = await client.query(
      `INSERT INTO customers
         (company_id,name,email,phone,address,city,customer_group,
          credit_limit,current_balance,loyalty_points,is_active,notes,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null, r.city ?? null,
       r.customer_group ?? 'general', r.credit_limit ?? 0, r.current_balance ?? 0,
       r.loyalty_points ?? 0, r.is_active ?? true, r.notes ?? null,
       ts(r.created_at), ts(r.updated_at ?? r.created_at)]
    );
    customerMap[r.id] = res.rows[0].id;
  }
  report['customers'] = { provided: (d.customers || []).length, inserted: Object.keys(customerMap).length };

  // ── 7. Sales ──────────────────────────────────────────────────────────────
  const salesRows = (d.sales || []).map(r => ({
    ...r,
    _ref: r.reference ?? r.reference_no ?? r.invoice_no ?? `IMPORT-${r.id}`,
  }));
  const saleKeyMap = await insertNatural('sales', {
    cols: ['company_id','branch_id','customer_id','reference','status','sale_date',
           'subtotal','tax_amount','discount_amount','total_amount','paid_amount',
           'change_amount','due_amount','payment_method','notes','created_by','created_at','updated_at'],
    mapper: r => {
      const total = r.total_amount ?? r.total ?? r.grand_total ?? 0;
      return [
        cid, r.branch_id ?? null,
        r.customer_id ? (customerMap[r.customer_id] ?? null) : null,
        r._ref, r.status ?? 'completed',
        r.sale_date ?? r.date ?? ts(r.created_at),
        r.subtotal ?? total, r.tax_amount ?? r.tax ?? 0,
        r.discount_amount ?? r.discount ?? 0, total,
        r.paid_amount ?? total, r.change_amount ?? 0, r.due_amount ?? 0,
        r.payment_method ?? r.payment_type ?? 'cash',
        r.notes ?? null, null,
        ts(r.created_at), ts(r.updated_at ?? r.created_at),
      ];
    },
    conflictCols: 'company_id, reference',
    onConflict: `DO UPDATE SET customer_id=EXCLUDED.customer_id, status=EXCLUDED.status,
      total_amount=EXCLUDED.total_amount, paid_amount=EXCLUDED.paid_amount,
      due_amount=EXCLUDED.due_amount, updated_at=NOW()`,
    returnKey: 'reference',
  }, salesRows);
  const saleMap = {};
  for (const r of salesRows) saleMap[r.id] = saleKeyMap[r._ref];
  const saleIds = new Set(Object.values(saleMap).filter(Boolean));

  // ── 8. Sale Items ─────────────────────────────────────────────────────────
  await insertChildren('sale_items', {
    cols: ['company_id','sale_id','product_id','variant_id','product_name','sku',
           'quantity','unit_price','cost_price','discount','tax_amount','total','created_at'],
    mapper: r => [
      cid, saleMap[r.sale_id], productMap[r.product_id] ?? null, variantMap[r.variant_id] ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? r.price ?? 0,
      r.cost_price ?? 0, r.discount ?? 0, r.tax_amount ?? 0,
      r.total ?? r.subtotal ?? 0, ts(r.created_at),
    ],
    parentIdCol: 'sale_id',
    parentIds: saleIds,
  }, (d.sale_items || []).filter(r => saleMap[r.sale_id]));

  // ── 9. Purchases ──────────────────────────────────────────────────────────
  const purchRows = (d.purchases || []).map(r => ({
    ...r,
    _ref: r.reference ?? r.reference_no ?? `IMPORT-PO-${r.id}`,
  }));
  const purchKeyMap = await insertNatural('purchases', {
    cols: ['company_id','branch_id','supplier_id','reference','status','purchase_date',
           'subtotal','tax_amount','discount_amount','total_amount','paid_amount',
           'due_amount','notes','created_by','created_at','updated_at'],
    mapper: r => {
      const total = r.total_amount ?? r.total ?? 0;
      return [
        cid, r.branch_id ?? null,
        r.supplier_id ? (suppMap[r.supplier_id] ?? null) : null,
        r._ref, r.status ?? 'received',
        r.purchase_date ?? r.date ?? ts(r.created_at),
        r.subtotal ?? total, r.tax_amount ?? r.tax ?? 0,
        r.discount_amount ?? r.discount ?? 0, total,
        r.paid_amount ?? total, r.due_amount ?? 0,
        r.notes ?? null, null,
        ts(r.created_at), ts(r.updated_at ?? r.created_at),
      ];
    },
    conflictCols: 'company_id, reference',
    onConflict: `DO UPDATE SET supplier_id=EXCLUDED.supplier_id, status=EXCLUDED.status,
      total_amount=EXCLUDED.total_amount, paid_amount=EXCLUDED.paid_amount,
      due_amount=EXCLUDED.due_amount, updated_at=NOW()`,
    returnKey: 'reference',
  }, purchRows);
  const purchMap = {};
  for (const r of purchRows) purchMap[r.id] = purchKeyMap[r._ref];
  const purchIds = new Set(Object.values(purchMap).filter(Boolean));

  // ── 10. Purchase Items ────────────────────────────────────────────────────
  await insertChildren('purchase_items', {
    cols: ['company_id','purchase_id','product_id','product_name','sku',
           'quantity','unit_cost','discount','tax_amount','total','created_at'],
    mapper: r => [
      cid, purchMap[r.purchase_id], productMap[r.product_id] ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_cost ?? r.cost ?? 0,
      r.discount ?? 0, r.tax_amount ?? 0, r.total ?? 0, ts(r.created_at),
    ],
    parentIdCol: 'purchase_id',
    parentIds: purchIds,
  }, (d.purchase_items || []).filter(r => purchMap[r.purchase_id]));

  // ── 11. Purchase Payments ─────────────────────────────────────────────────
  await insertChildren('purchase_payments', {
    cols: ['company_id','purchase_id','amount','payment_method','reference',
           'notes','paid_at','created_by','created_at'],
    mapper: r => [
      cid, purchMap[r.purchase_id], r.amount ?? 0,
      r.payment_method ?? 'cash', r.reference ?? null, r.notes ?? null,
      r.paid_at ?? ts(r.created_at), null, ts(r.created_at),
    ],
    parentIdCol: 'purchase_id',
    parentIds: purchIds,
  }, (d.purchase_payments || []).filter(r => purchMap[r.purchase_id]));

  // ── 12. Returns ───────────────────────────────────────────────────────────
  const retRows = (d.returns || []).map(r => ({
    ...r,
    _ref: r.reference ?? `IMPORT-RET-${r.id}`,
  }));
  const retKeyMap = await insertNatural('returns', {
    cols: ['company_id','sale_id','reference','return_date','total_amount',
           'refund_method','refund_amount','type','reason','notes','created_by','created_at','updated_at'],
    mapper: r => [
      cid, r.sale_id ? (saleMap[r.sale_id] ?? null) : null,
      r._ref, r.return_date ?? ts(r.created_at),
      r.total_amount ?? 0, r.refund_method ?? 'cash',
      r.refund_amount ?? r.total_amount ?? 0,
      r.type ?? 'return', r.reason ?? null, r.notes ?? null, null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ],
    conflictCols: 'company_id, reference',
    onConflict: 'DO UPDATE SET total_amount=EXCLUDED.total_amount, updated_at=NOW()',
    returnKey: 'reference',
  }, retRows);
  const returnMap = {};
  for (const r of retRows) returnMap[r.id] = retKeyMap[r._ref];
  const retIds = new Set(Object.values(returnMap).filter(Boolean));

  // ── 13. Return Items ──────────────────────────────────────────────────────
  await insertChildren('return_items', {
    cols: ['company_id','return_id','product_id','variant_id',
           'product_name','sku','quantity','unit_price','total','created_at'],
    mapper: r => [
      cid, returnMap[r.return_id], productMap[r.product_id] ?? null, variantMap[r.variant_id] ?? null,
      r.product_name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? 0, r.total ?? 0, ts(r.created_at),
    ],
    parentIdCol: 'return_id',
    parentIds: retIds,
  }, (d.return_items || []).filter(r => returnMap[r.return_id]));

  // ── 14. Exchange Items ────────────────────────────────────────────────────
  await insertChildren('exchange_items', {
    cols: ['company_id','return_id','product_id','variant_id',
           'product_name','sku','quantity','unit_price','total'],
    mapper: r => [
      cid, returnMap[r.return_id], productMap[r.product_id] ?? null, variantMap[r.variant_id] ?? null,
      r.product_name ?? 'Product', r.sku ?? null,
      r.quantity ?? 0, r.unit_price ?? 0, r.total ?? 0,
    ],
    parentIdCol: 'return_id',
    parentIds: retIds,
  }, (d.exchange_items || []).filter(r => returnMap[r.return_id]));

  // ── 15. Expense Categories (already has unique constraint) ─────────────────
  const expCatKeyMap = await insertNatural('expense_categories', {
    cols: ['company_id','name','is_active','created_at'],
    mapper: r => [cid, r.name, r.is_active ?? true, ts(r.created_at)],
    conflictCols: 'company_id, name',
    onConflict: 'DO UPDATE SET is_active=EXCLUDED.is_active',
    returnKey: 'name',
  }, d.expense_categories);
  const expCatMap = {};
  for (const r of (d.expense_categories || [])) if (r.name) expCatMap[r.id] = expCatKeyMap[r.name];

  // ── 16. Expenses (no unique key — insert fresh) ────────────────────────────
  const expRows = d.expenses || [];
  if (expRows.length) {
    const CHUNK = 500;
    const n = 11;
    let total = 0;
    for (let start = 0; start < expRows.length; start += CHUNK) {
      const chunk = expRows.slice(start, start + CHUNK);
      const ph = chunk.map((_, i) => `(${Array.from({ length: n }, (__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO expenses
           (company_id,branch_id,category_id,title,amount,payment_method,expense_date,notes,created_by,created_at,updated_at)
         VALUES ${ph}`,
        chunk.flatMap(r => [
          cid, r.branch_id ?? null, expCatMap[r.category_id] ?? null,
          r.title ?? r.description ?? r.name ?? 'Expense',
          r.amount ?? 0, r.payment_method ?? 'cash',
          r.expense_date ?? r.date ?? ts(r.created_at),
          r.notes ?? null, null,
          ts(r.created_at), ts(r.updated_at ?? r.created_at),
        ])
      );
      total += res.rowCount || 0;
    }
    report['expenses'] = { provided: expRows.length, inserted: total };
  } else {
    report['expenses'] = { provided: 0, inserted: 0 };
  }

  // ── 17. Stock Adjustments ─────────────────────────────────────────────────
  const adjRows = (d.stock_adjustments || []).map(r => ({
    ...r,
    _ref: r.reference ?? `IMPORT-ADJ-${r.id}`,
  }));
  const adjKeyMap = await insertNatural('stock_adjustments', {
    cols: ['company_id','branch_id','reference','type','reason','status','notes','created_by','created_at','updated_at'],
    mapper: r => [
      cid, r.branch_id ?? null, r._ref,
      r.type ?? 'adjustment', r.reason ?? null,
      r.status ?? 'completed', r.notes ?? null, null,
      ts(r.created_at), ts(r.updated_at ?? r.created_at),
    ],
    conflictCols: 'company_id, reference',
    onConflict: 'DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()',
    returnKey: 'reference',
  }, adjRows);
  const adjMap = {};
  for (const r of adjRows) adjMap[r.id] = adjKeyMap[r._ref];
  const adjIds = new Set(Object.values(adjMap).filter(Boolean));

  // ── 18. Stock Adjustment Items ─────────────────────────────────────────────
  await insertChildren('stock_adjustment_items', {
    cols: ['company_id','adjustment_id','product_id','variant_id','product_name','sku',
           'quantity_before','quantity_adjusted','quantity_after','unit_cost','created_at'],
    mapper: r => [
      cid, adjMap[r.adjustment_id], productMap[r.product_id] ?? null, variantMap[r.variant_id] ?? null,
      r.product_name ?? r.name ?? 'Product', r.sku ?? null,
      r.quantity_before ?? r.old_quantity ?? 0,
      r.quantity_adjusted ?? r.quantity ?? 0,
      r.quantity_after ?? r.new_quantity ?? 0,
      r.unit_cost ?? 0, ts(r.created_at),
    ],
    parentIdCol: 'adjustment_id',
    parentIds: adjIds,
  }, (d.stock_adjustment_items || []).filter(r => adjMap[r.adjustment_id]));

  // ── 19. Settings (upsert by key, no id needed) ─────────────────────────────
  for (const r of (d.settings || [])) {
    await client.query(
      `INSERT INTO settings (company_id,key,value,type,group_name,label)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [cid, r.key, r.value ?? null, r.type ?? 'string', r.group_name ?? 'general', r.label ?? null]
    );
  }
  report['settings'] = { provided: (d.settings || []).length, inserted: (d.settings || []).length };

  // ── 20. Employees (no unique constraint — insert fresh, build id map) ──────
  const employeeMap = {};
  for (const r of (d.employees || [])) {
    const res = await client.query(
      `INSERT INTO employees
         (company_id,name,email,phone,address,designation,department,
          base_salary,allowances,deductions,hire_date,is_active,notes,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null,
       r.designation ?? null, r.department ?? null,
       r.base_salary ?? 0, r.allowances ?? 0, r.deductions ?? 0,
       r.hire_date ?? null, r.is_active ?? true, r.notes ?? null,
       ts(r.created_at), ts(r.updated_at ?? r.created_at)]
    );
    employeeMap[r.id] = res.rows[0].id;
  }
  report['employees'] = { provided: (d.employees || []).length, inserted: Object.keys(employeeMap).length };

  // ── 21. Salaries (unique: company_id, employee_id, month, year) ───────────
  const salaryRows = (d.salaries || []).filter(r => employeeMap[r.employee_id]);
  if (salaryRows.length) {
    const CHUNK = 500;
    let total = 0;
    for (let start = 0; start < salaryRows.length; start += CHUNK) {
      const chunk = salaryRows.slice(start, start + CHUNK);
      const n = 14;
      const ph = chunk.map((_, i) => `(${Array.from({ length: n }, (__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO salaries
           (company_id,employee_id,month,year,base_salary,allowances,deductions,
            gross_salary,net_salary,status,paid_at,payment_method,notes,created_at)
         VALUES ${ph}
         ON CONFLICT (company_id,employee_id,month,year) DO NOTHING`,
        chunk.flatMap(r => [
          cid, employeeMap[r.employee_id], r.month, r.year,
          r.base_salary ?? 0, r.allowances ?? 0, r.deductions ?? 0,
          r.gross_salary ?? 0, r.net_salary ?? 0,
          r.status ?? 'pending', r.paid_at ?? null,
          r.payment_method ?? 'cash', r.notes ?? null, ts(r.created_at),
        ])
      );
      total += res.rowCount || 0;
    }
    report['salaries'] = { provided: salaryRows.length, inserted: total };
  } else {
    report['salaries'] = { provided: 0, inserted: 0 };
  }

  // ── 22. Attendance (unique: company_id, employee_id, date) ───────────────
  const attendRows = (d.attendance || []).filter(r => employeeMap[r.employee_id]);
  if (attendRows.length) {
    const CHUNK = 500;
    let total = 0;
    for (let start = 0; start < attendRows.length; start += CHUNK) {
      const chunk = attendRows.slice(start, start + CHUNK);
      const n = 8;
      const ph = chunk.map((_, i) => `(${Array.from({ length: n }, (__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO attendance
           (company_id,employee_id,date,check_in,check_out,status,notes,created_at)
         VALUES ${ph}
         ON CONFLICT (company_id,employee_id,date) DO NOTHING`,
        chunk.flatMap(r => [
          cid, employeeMap[r.employee_id], r.date,
          r.check_in ?? null, r.check_out ?? null,
          r.status ?? 'present', r.notes ?? null, ts(r.created_at),
        ])
      );
      total += res.rowCount || 0;
    }
    report['attendance'] = { provided: attendRows.length, inserted: total };
  } else {
    report['attendance'] = { provided: 0, inserted: 0 };
  }

  // ── 23. Bill of Materials (unique: company_id, product_id, raw_material_id) ─
  const bomRows = (d.bill_of_materials || [])
    .filter(r => productMap[r.product_id] && productMap[r.raw_material_id]);
  if (bomRows.length) {
    const CHUNK = 500;
    let total = 0;
    for (let start = 0; start < bomRows.length; start += CHUNK) {
      const chunk = bomRows.slice(start, start + CHUNK);
      const n = 6;
      const ph = chunk.map((_, i) => `(${Array.from({ length: n }, (__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO bill_of_materials
           (company_id,product_id,raw_material_id,quantity_required,unit,created_at)
         VALUES ${ph}
         ON CONFLICT (company_id,product_id,raw_material_id)
         DO UPDATE SET quantity_required=EXCLUDED.quantity_required, unit=EXCLUDED.unit`,
        chunk.flatMap(r => [
          cid, productMap[r.product_id], productMap[r.raw_material_id],
          r.quantity_required ?? 1, r.unit ?? null, ts(r.created_at),
        ])
      );
      total += res.rowCount || 0;
    }
    report['bill_of_materials'] = { provided: bomRows.length, inserted: total };
  } else {
    report['bill_of_materials'] = { provided: 0, inserted: 0 };
  }

  // ── 24. Production Batches (unique: company_id, reference) ───────────────
  const batchRows = (d.production_batches || []).filter(r => productMap[r.product_id]);
  const batchKeyMap = await insertNatural('production_batches', {
    cols: ['company_id','product_id','reference','quantity_produced','production_cost',
           'batch_date','status','notes','created_at'],
    mapper: r => [
      cid, productMap[r.product_id], r.reference ?? `IMPORT-BATCH-${r.id}`,
      r.quantity_produced ?? 0, r.production_cost ?? 0,
      r.batch_date ?? ts(r.created_at).slice(0, 10),
      r.status ?? 'completed', r.notes ?? null, ts(r.created_at),
    ],
    conflictCols: 'company_id, reference',
    onConflict: 'DO UPDATE SET quantity_produced=EXCLUDED.quantity_produced, status=EXCLUDED.status',
    returnKey: 'reference',
  }, batchRows.map(r => ({ ...r, _ref: r.reference ?? `IMPORT-BATCH-${r.id}` })));
  const batchMap = {};
  for (const r of batchRows) batchMap[r.id] = batchKeyMap[r.reference ?? `IMPORT-BATCH-${r.id}`];
  const batchIds = new Set(Object.values(batchMap).filter(Boolean));

  // ── 25. Production Batch Materials ────────────────────────────────────────
  await insertChildren('production_batch_materials', {
    cols: ['company_id','batch_id','product_id','product_name','quantity_used','unit_cost','total_cost','created_at'],
    mapper: r => [
      cid, batchMap[r.batch_id], r.product_id ? (productMap[r.product_id] ?? null) : null,
      r.product_name ?? 'Material',
      r.quantity_used ?? 0, r.unit_cost ?? 0, r.total_cost ?? 0, ts(r.created_at),
    ],
    parentIdCol: 'batch_id',
    parentIds: batchIds,
  }, (d.production_batch_materials || []).filter(r => batchMap[r.batch_id]));

  // ── 26. Cart Holds (restore active holds; cart_data is JSONB) ─────────────
  const holdRows = d.cart_holds || [];
  if (holdRows.length) {
    const CHUNK = 500;
    let total = 0;
    for (let start = 0; start < holdRows.length; start += CHUNK) {
      const chunk = holdRows.slice(start, start + CHUNK);
      const n = 4;
      const ph = chunk.map((_, i) => `(${Array.from({ length: n }, (__, j) => `$${i * n + j + 1}`).join(',')})`).join(',');
      const res = await client.query(
        `INSERT INTO cart_holds (company_id,label,cart_data,created_at) VALUES ${ph}`,
        chunk.flatMap(r => [cid, r.label ?? null, JSON.stringify(r.cart_data ?? {}), ts(r.created_at)])
      );
      total += res.rowCount || 0;
    }
    report['cart_holds'] = { provided: holdRows.length, inserted: total };
  } else {
    report['cart_holds'] = { provided: 0, inserted: 0 };
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
      { rows: employees },
      { rows: salaries },
      { rows: attendance },
      { rows: bom },
      { rows: productionBatches },
      { rows: productionBatchMaterials },
      { rows: cartHolds },
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
      query(`SELECT * FROM employees WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM salaries  WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM attendance WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM bill_of_materials WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM production_batches WHERE company_id=$1`, [cid]),
      query(`SELECT pbm.* FROM production_batch_materials pbm JOIN production_batches pb ON pb.id=pbm.batch_id WHERE pb.company_id=$1`, [cid]),
      query(`SELECT * FROM cart_holds WHERE company_id=$1`, [cid]),
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
        employees: employees.length, salaries: salaries.length,
        attendance: attendance.length, bill_of_materials: bom.length,
        production_batches: productionBatches.length,
        production_batch_materials: productionBatchMaterials.length,
        cart_holds: cartHolds.length,
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
        employees, salaries, attendance,
        bill_of_materials: bom,
        production_batches: productionBatches,
        production_batch_materials: productionBatchMaterials,
        cart_holds: cartHolds,
      },
    };

    const filename = `backup-${company[0]?.slug || cid}-${now().slice(0, 10)}.json`;

    // Save a server-side snapshot so backup data is always in the database
    try {
      await query(
        `INSERT INTO company_backups (company_id, created_by, file_name, version, row_counts, data)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [cid, req.user?.id ?? null, filename, backup.version,
         JSON.stringify(backup.counts), JSON.stringify(backup.data)]
      );
      // Keep only the 10 most recent snapshots per company to limit storage
      await query(
        `DELETE FROM company_backups
         WHERE company_id=$1
           AND id NOT IN (
             SELECT id FROM company_backups WHERE company_id=$1 ORDER BY created_at DESC LIMIT 10
           )`,
        [cid]
      );
    } catch (saveErr) {
      logger.error(`[Backup] Failed to save server snapshot: ${saveErr.message}`);
      // Never block the file download because of a snapshot save failure
    }

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
    const report = await performRestore(client, cid, d, req.user?.id);
    await client.query('COMMIT');
    logger.info(`[Backup] JSON restore done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', null, { source: 'json', report });
    return success(res, { report }, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] Restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', null, { source: 'json', reason: err.message }); } catch (_) {}
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
    const report = await performRestore(client, cid, d, req.user?.id);
    await client.query('COMMIT');
    logger.info(`[Backup] File restore (${source}) done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', null, { source, report });
    return success(res, { report, source }, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] File restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', null, { source, reason: err.message }); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};

// ── List stored server-side backup snapshots ──────────────────────────────────
exports.listBackups = async (req, res, next) => {
  const cid = req.companyId;
  try {
    const { rows } = await query(
      `SELECT id, file_name, version, row_counts, created_at, created_by
       FROM company_backups WHERE company_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [cid]
    );
    return success(res, rows, 'Backup history retrieved.');
  } catch (err) { next(err); }
};

// ── Restore from a stored server-side snapshot ────────────────────────────────
exports.restoreSnapshot = async (req, res, next) => {
  const cid = req.companyId;
  const id  = Number(req.params.id);

  const { rows: [snap] } = await query(
    `SELECT data, row_counts FROM company_backups WHERE id=$1 AND company_id=$2`,
    [id, cid]
  );
  if (!snap) return error(res, 'Backup snapshot not found.', 404);

  // Safety: warn if snapshot has significantly fewer products than current DB
  const { rows: [cur] } = await query(
    `SELECT COUNT(*) AS cnt FROM products WHERE company_id=$1`, [cid]
  );
  const currentProducts  = Number(cur?.cnt ?? 0);
  const snapshotProducts = Number(snap.row_counts?.products ?? 0);
  if (currentProducts > 0 && snapshotProducts === 0) {
    logger.warn(`[Backup] Snapshot #${id} has 0 products but DB has ${currentProducts} — restore will NOT delete existing records (upsert-only).`);
  }

  const d = snap.data;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const report = await performRestore(client, cid, d, req.user?.id);
    await client.query('COMMIT');
    logger.info(`[Backup] Snapshot #${id} restore done for company ${cid}`);
    await logAudit(cid, req.user?.id, 'RESTORE', 'backup', id, { source: 'snapshot', report });
    return success(res, { report }, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] Snapshot restore failed for company ${cid}: ${err.message}`);
    try { await logAudit(cid, req.user?.id, 'RESTORE_FAILED', 'backup', id, { source: 'snapshot', reason: err.message }); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};
