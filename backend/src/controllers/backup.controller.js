'use strict';

const { query, getClient } = require('../config/database');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

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

    // categories
    for (const r of (d.categories || [])) {
      await client.query(
        `INSERT INTO categories (id,company_id,name,description,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.description ?? null, r.is_active ?? true, r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // brands
    for (const r of (d.brands || [])) {
      await client.query(
        `INSERT INTO brands (id,company_id,name,description,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.description ?? null, r.is_active ?? true, r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // suppliers
    for (const r of (d.suppliers || [])) {
      await client.query(
        `INSERT INTO suppliers (id,company_id,name,email,phone,address,city,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.email ?? null, r.phone ?? null, r.address ?? null,
         r.city ?? null, r.is_active ?? true, r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // products — SQLite uses selling_price/min_stock_level; PostgreSQL uses sale_price/low_stock_alert
    for (const r of (d.products || [])) {
      await client.query(
        `INSERT INTO products (id,company_id,name,sku,barcode,description,category_id,brand_id,
          cost_price,sale_price,wholesale_price,tax_rate,stock_quantity,low_stock_alert,unit,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.sku ?? String(r.id),
         r.barcode ?? null, r.description ?? null,
         r.category_id ?? null, r.brand_id ?? null,
         r.cost_price ?? 0,
         r.sale_price ?? r.selling_price ?? r.price ?? 0,
         r.wholesale_price ?? 0,
         r.tax_rate ?? 0,
         r.stock_quantity ?? r.quantity ?? 0,
         r.low_stock_alert ?? r.min_stock_level ?? r.reorder_level ?? 5,
         r.unit ?? 'pcs', r.is_active ?? true,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // customers
    for (const r of (d.customers || [])) {
      await client.query(
        `INSERT INTO customers (id,company_id,name,email,phone,address,city,loyalty_points,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.email ?? null, r.phone ?? null,
         r.address ?? null, r.city ?? null,
         r.loyalty_points ?? 0, r.is_active ?? true,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // sales — PostgreSQL has reference (NOT NULL), created_by (not user_id), sale_date
    for (const r of (d.sales || [])) {
      const total = r.total_amount ?? r.total ?? r.grand_total ?? 0;
      const ref   = r.reference ?? r.reference_no ?? r.invoice_no ?? `IMPORT-${r.id}`;
      await client.query(
        `INSERT INTO sales (id,company_id,branch_id,customer_id,reference,status,sale_date,
          subtotal,tax_amount,discount_amount,total_amount,paid_amount,change_amount,due_amount,
          payment_method,notes,created_by,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id ?? null, r.customer_id ?? null,
         ref, r.status ?? 'completed',
         r.sale_date ?? r.date ?? r.created_at,
         r.subtotal ?? total,
         r.tax_amount ?? r.tax ?? 0,
         r.discount_amount ?? r.discount ?? 0,
         total, r.paid_amount ?? total,
         r.change_amount ?? 0, r.due_amount ?? 0,
         r.payment_method ?? r.payment_type ?? 'cash',
         r.notes ?? null,
         r.created_by ?? r.user_id ?? null,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // sale_items — PostgreSQL requires company_id and product_name (NOT NULL)
    for (const r of (d.sale_items || [])) {
      await client.query(
        `INSERT INTO sale_items (id,company_id,sale_id,product_id,product_name,sku,quantity,unit_price,cost_price,discount,tax_amount,total,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.sale_id, r.product_id ?? null,
         r.product_name ?? r.name ?? 'Product',
         r.sku ?? null,
         r.quantity ?? 0,
         r.unit_price ?? r.price ?? 0,
         r.cost_price ?? 0,
         r.discount ?? 0,
         r.tax_amount ?? 0,
         r.total ?? r.subtotal ?? 0,
         r.created_at]
      );
    }

    // purchases — reference is NOT NULL; created_by not user_id
    for (const r of (d.purchases || [])) {
      const total = r.total_amount ?? r.total ?? 0;
      const ref   = r.reference ?? r.reference_no ?? `IMPORT-PO-${r.id}`;
      await client.query(
        `INSERT INTO purchases (id,company_id,branch_id,supplier_id,reference,status,purchase_date,
          subtotal,tax_amount,discount_amount,total_amount,paid_amount,due_amount,
          notes,created_by,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id ?? null, r.supplier_id ?? null,
         ref, r.status ?? 'received',
         r.purchase_date ?? r.date ?? r.created_at,
         r.subtotal ?? total,
         r.tax_amount ?? r.tax ?? 0,
         r.discount_amount ?? r.discount ?? 0,
         total, r.paid_amount ?? total, r.due_amount ?? 0,
         r.notes ?? null,
         r.created_by ?? r.user_id ?? null,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // purchase_items — requires company_id and product_name
    for (const r of (d.purchase_items || [])) {
      await client.query(
        `INSERT INTO purchase_items (id,company_id,purchase_id,product_id,product_name,sku,quantity,unit_cost,discount,tax_amount,total,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.purchase_id, r.product_id ?? null,
         r.product_name ?? r.name ?? 'Product',
         r.sku ?? null,
         r.quantity ?? 0,
         r.unit_cost ?? r.cost ?? 0,
         r.discount ?? 0, r.tax_amount ?? 0,
         r.total ?? 0, r.created_at]
      );
    }

    // expense_categories (must come before expenses)
    for (const r of (d.expense_categories || [])) {
      await client.query(
        `INSERT INTO expense_categories (id,company_id,name,is_active,created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.is_active ?? true, r.created_at]
      );
    }

    // expenses — PostgreSQL uses title (NOT NULL) and category_id, not category text / user_id
    for (const r of (d.expenses || [])) {
      await client.query(
        `INSERT INTO expenses (id,company_id,branch_id,category_id,title,amount,payment_method,expense_date,notes,created_by,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id ?? null,
         r.category_id ?? null,
         r.title ?? r.description ?? r.name ?? 'Expense',
         r.amount ?? 0,
         r.payment_method ?? 'cash',
         r.expense_date ?? r.date ?? r.created_at,
         r.notes ?? null,
         r.created_by ?? r.user_id ?? null,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // stock_adjustments
    for (const r of (d.stock_adjustments || [])) {
      const ref = r.reference ?? `IMPORT-ADJ-${r.id}`;
      await client.query(
        `INSERT INTO stock_adjustments (id,company_id,branch_id,reference,type,reason,status,notes,created_by,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id ?? null, ref,
         r.type ?? 'adjustment', r.reason ?? null,
         r.status ?? 'completed', r.notes ?? null,
         r.created_by ?? r.user_id ?? null,
         r.created_at, r.updated_at ?? r.created_at]
      );
    }

    // stock_adjustment_items — SQLite uses old_quantity/quantity; PG uses quantity_before/adjusted/after
    for (const r of (d.stock_adjustment_items || [])) {
      await client.query(
        `INSERT INTO stock_adjustment_items (id,company_id,adjustment_id,product_id,product_name,sku,quantity_before,quantity_adjusted,quantity_after,unit_cost,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.adjustment_id, r.product_id ?? null,
         r.product_name ?? r.name ?? 'Product',
         r.sku ?? null,
         r.quantity_before ?? r.old_quantity ?? 0,
         r.quantity_adjusted ?? r.quantity ?? 0,
         r.quantity_after ?? r.new_quantity ?? 0,
         r.unit_cost ?? 0, r.created_at]
      );
    }

    // settings — upsert so existing settings not in backup are preserved
    for (const r of (d.settings || [])) {
      await client.query(
        `INSERT INTO settings (company_id,key,value,type,group_name,label)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (company_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [cid, r.key, r.value ?? null,
         r.type ?? 'string', r.group_name ?? 'general', r.label ?? null]
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
