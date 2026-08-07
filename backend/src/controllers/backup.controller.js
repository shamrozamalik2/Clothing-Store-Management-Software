'use strict';

const { query, getClient } = require('../config/database');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

// Bulk INSERT in chunks of 500 rows to stay under PostgreSQL's 65535-param limit
async function bulkInsert(client, table, cols, rows, mapper, conflict = 'ON CONFLICT (id) DO NOTHING') {
  if (!rows || rows.length === 0) return;
  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const n = cols.length;
    const ph = chunk.map((_, i) =>
      `(${cols.map((__, j) => `$${i * n + j + 1}`).join(',')})`
    ).join(',');
    await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph} ${conflict}`,
      chunk.flatMap(mapper)
    );
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

exports.exportBackup = async (req, res, next) => {
  const cid = req.companyId;
  try {
    const [
      { rows: settings },
      { rows: categories },
      { rows: brands },
      { rows: suppliers },
      { rows: products },
      { rows: customers },
      { rows: sales },
      { rows: saleItems },
      { rows: purchases },
      { rows: purchaseItems },
      { rows: expenses },
      { rows: users },
      { rows: company },
    ] = await Promise.all([
      query(`SELECT key, value, type, group_name, label FROM settings WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM categories  WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM brands      WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM suppliers   WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM products    WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM customers   WHERE company_id=$1`, [cid]),
      query(`SELECT * FROM sales       WHERE company_id=$1`, [cid]),
      query(`SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.company_id=$1`, [cid]),
      query(`SELECT * FROM purchases   WHERE company_id=$1`, [cid]),
      query(`SELECT pi.* FROM purchase_items pi JOIN purchases p ON p.id=pi.purchase_id WHERE p.company_id=$1`, [cid]),
      query(`SELECT * FROM expenses    WHERE company_id=$1`, [cid]),
      query(`SELECT id,name,email,role_id,branch_id,is_active,created_at FROM users WHERE company_id=$1`, [cid]),
      query(`SELECT id,name,slug,email,phone,plan,subscription_status,max_users,created_at FROM companies WHERE id=$1`, [cid]),
    ]);

    const backup = {
      version:     '1.0',
      exported_at: new Date().toISOString(),
      company:     company[0] || {},
      data: {
        settings, categories, brands, suppliers,
        products, customers,
        sales, sale_items: saleItems,
        purchases, purchase_items: purchaseItems,
        expenses, users,
      },
    };

    const filename = `backup-${company[0]?.slug || cid}-${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) { next(err); }
};

// ── Restore ───────────────────────────────────────────────────────────────────

exports.restoreBackup = async (req, res, next) => {
  const cid  = req.companyId;
  const body = req.body;

  // Accept two formats:
  //   Standard:  { version, data: { categories, products, ... } }
  //   Flat/legacy (old desktop app): tables at top level
  let d;
  if (body?.version && body?.data && typeof body.data === 'object') {
    d = body.data;
  } else if (body && typeof body === 'object' && !Array.isArray(body) &&
             (body.products || body.categories || body.sales || body.customers)) {
    d = body;
  } else {
    return error(res, 'Invalid backup file format.', 422);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Delete in FK-safe order
    await client.query(`DELETE FROM stock_adjustment_items WHERE adjustment_id IN (SELECT id FROM stock_adjustments WHERE company_id=$1)`, [cid]);
    await client.query(`DELETE FROM stock_adjustments WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM sale_items     WHERE sale_id     IN (SELECT id FROM sales     WHERE company_id=$1)`, [cid]);
    await client.query(`DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE company_id=$1)`, [cid]);
    await client.query(`DELETE FROM sales          WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM purchases      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM expenses       WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM expense_categories WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM products       WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM customers      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM suppliers      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM brands         WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM categories     WHERE company_id=$1`, [cid]);

    await bulkInsert(client, 'categories',
      ['id','company_id','name','description','is_active','created_at','updated_at'],
      d.categories, r => [r.id, cid, r.name, r.description??null, r.is_active??true, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'brands',
      ['id','company_id','name','description','is_active','created_at','updated_at'],
      d.brands, r => [r.id, cid, r.name, r.description??null, r.is_active??true, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'suppliers',
      ['id','company_id','name','email','phone','address','city','is_active','created_at','updated_at'],
      d.suppliers, r => [r.id, cid, r.name, r.email??null, r.phone??null, r.address??null, r.city??null, r.is_active??true, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'products',
      ['id','company_id','name','sku','barcode','description','category_id','brand_id',
       'cost_price','sale_price','wholesale_price','tax_rate','stock_quantity','low_stock_alert','unit','is_active','created_at','updated_at'],
      d.products, r => [
        r.id, cid, r.name, r.sku??String(r.id), r.barcode??null, r.description??null,
        r.category_id??null, r.brand_id??null,
        r.cost_price??0, r.sale_price??r.selling_price??r.price??0,
        r.wholesale_price??0, r.tax_rate??0,
        r.stock_quantity??r.quantity??0, r.low_stock_alert??r.min_stock_level??r.reorder_level??5,
        r.unit??'pcs', r.is_active??true, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'customers',
      ['id','company_id','name','email','phone','address','city','loyalty_points','is_active','created_at','updated_at'],
      d.customers, r => [r.id, cid, r.name, r.email??null, r.phone??null, r.address??null, r.city??null, r.loyalty_points??0, r.is_active??true, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'sales',
      ['id','company_id','branch_id','customer_id','reference','status','sale_date',
       'subtotal','tax_amount','discount_amount','total_amount','paid_amount','change_amount','due_amount',
       'payment_method','notes','created_by','created_at','updated_at'],
      d.sales, r => {
        const total = r.total_amount??r.total??r.grand_total??0;
        return [r.id, cid, r.branch_id??null, r.customer_id??null,
          r.reference??r.reference_no??r.invoice_no??`IMPORT-${r.id}`,
          r.status??'completed', r.sale_date??r.date??r.created_at,
          r.subtotal??total, r.tax_amount??r.tax??0, r.discount_amount??r.discount??0,
          total, r.paid_amount??total, r.change_amount??0, r.due_amount??0,
          r.payment_method??r.payment_type??'cash', r.notes??null,
          r.created_by??r.user_id??null, r.created_at, r.updated_at??r.created_at];
      });

    await bulkInsert(client, 'sale_items',
      ['id','company_id','sale_id','product_id','product_name','sku','quantity','unit_price','cost_price','discount','tax_amount','total','created_at'],
      d.sale_items, r => [r.id, cid, r.sale_id, r.product_id??null, r.product_name??r.name??'Product', r.sku??null, r.quantity??0, r.unit_price??r.price??0, r.cost_price??0, r.discount??0, r.tax_amount??0, r.total??r.subtotal??0, r.created_at]);

    await bulkInsert(client, 'purchases',
      ['id','company_id','branch_id','supplier_id','reference','status','purchase_date',
       'subtotal','tax_amount','discount_amount','total_amount','paid_amount','due_amount','notes','created_by','created_at','updated_at'],
      d.purchases, r => {
        const total = r.total_amount??r.total??0;
        return [r.id, cid, r.branch_id??null, r.supplier_id??null,
          r.reference??r.reference_no??`IMPORT-PO-${r.id}`,
          r.status??'received', r.purchase_date??r.date??r.created_at,
          r.subtotal??total, r.tax_amount??r.tax??0, r.discount_amount??r.discount??0,
          total, r.paid_amount??total, r.due_amount??0, r.notes??null,
          r.created_by??r.user_id??null, r.created_at, r.updated_at??r.created_at];
      });

    await bulkInsert(client, 'purchase_items',
      ['id','company_id','purchase_id','product_id','product_name','sku','quantity','unit_cost','discount','tax_amount','total','created_at'],
      d.purchase_items, r => [r.id, cid, r.purchase_id, r.product_id??null, r.product_name??r.name??'Product', r.sku??null, r.quantity??0, r.unit_cost??r.cost??0, r.discount??0, r.tax_amount??0, r.total??0, r.created_at]);

    await bulkInsert(client, 'expense_categories',
      ['id','company_id','name','is_active','created_at'],
      d.expense_categories, r => [r.id, cid, r.name, r.is_active??true, r.created_at]);

    await bulkInsert(client, 'expenses',
      ['id','company_id','branch_id','category_id','title','amount','payment_method','expense_date','notes','created_by','created_at','updated_at'],
      d.expenses, r => [r.id, cid, r.branch_id??null, r.category_id??null, r.title??r.description??r.name??'Expense', r.amount??0, r.payment_method??'cash', r.expense_date??r.date??r.created_at, r.notes??null, r.created_by??r.user_id??null, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'stock_adjustments',
      ['id','company_id','branch_id','reference','type','reason','status','notes','created_by','created_at','updated_at'],
      d.stock_adjustments, r => [r.id, cid, r.branch_id??null, r.reference??`IMPORT-ADJ-${r.id}`, r.type??'adjustment', r.reason??null, r.status??'completed', r.notes??null, r.created_by??r.user_id??null, r.created_at, r.updated_at??r.created_at]);

    await bulkInsert(client, 'stock_adjustment_items',
      ['id','company_id','adjustment_id','product_id','product_name','sku','quantity_before','quantity_adjusted','quantity_after','unit_cost','created_at'],
      d.stock_adjustment_items, r => [r.id, cid, r.adjustment_id, r.product_id??null, r.product_name??r.name??'Product', r.sku??null, r.quantity_before??r.old_quantity??0, r.quantity_adjusted??r.quantity??0, r.quantity_after??r.new_quantity??0, r.unit_cost??0, r.created_at]);

    // settings — upsert (don't wipe keys not in the backup)
    for (const r of (d.settings || [])) {
      await client.query(
        `INSERT INTO settings (company_id,key,value,type,group_name,label)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (company_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [cid, r.key, r.value??null, r.type??'string', r.group_name??'general', r.label??null]
      );
    }

    // Reset sequences so new records don't clash with restored IDs
    const seqTables = [
      'categories', 'brands', 'suppliers', 'products', 'customers',
      'sales', 'sale_items', 'purchases', 'purchase_items',
      'expense_categories', 'expenses',
      'stock_adjustments', 'stock_adjustment_items',
    ];
    for (const t of seqTables) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE(MAX(id), 1)) FROM ${t}`
      );
    }

    await client.query('COMMIT');
    logger.info(`[Backup] Restore completed for company ${cid}`);
    return success(res, null, 'Backup restored successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[Backup] Restore failed for company ${cid}: ${err.message}`);
    next(err);
  } finally {
    client.release();
  }
};
