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
  const cid = req.companyId;
  const backup = req.body;

  if (!backup?.version || !backup?.data) {
    return error(res, 'Invalid backup file format.', 422);
  }

  const d = backup.data;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Delete in FK-safe order
    await client.query(`DELETE FROM sale_items     WHERE sale_id     IN (SELECT id FROM sales     WHERE company_id=$1)`, [cid]);
    await client.query(`DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE company_id=$1)`, [cid]);
    await client.query(`DELETE FROM sales          WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM purchases      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM expenses       WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM products       WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM customers      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM suppliers      WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM brands         WHERE company_id=$1`, [cid]);
    await client.query(`DELETE FROM categories     WHERE company_id=$1`, [cid]);

    // Restore categories
    for (const r of (d.categories || [])) {
      await client.query(
        `INSERT INTO categories (id,company_id,name,description,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.description, r.is_active ?? true, r.created_at, r.updated_at]
      );
    }

    // Restore brands
    for (const r of (d.brands || [])) {
      await client.query(
        `INSERT INTO brands (id,company_id,name,description,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.description, r.is_active ?? true, r.created_at, r.updated_at]
      );
    }

    // Restore suppliers
    for (const r of (d.suppliers || [])) {
      await client.query(
        `INSERT INTO suppliers (id,company_id,name,email,phone,address,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.email, r.phone, r.address, r.is_active ?? true, r.created_at, r.updated_at]
      );
    }

    // Restore products
    for (const r of (d.products || [])) {
      await client.query(
        `INSERT INTO products (id,company_id,name,sku,barcode,description,category_id,brand_id,
          cost_price,selling_price,stock_quantity,min_stock_level,unit,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.sku, r.barcode, r.description, r.category_id, r.brand_id,
         r.cost_price, r.selling_price, r.stock_quantity, r.min_stock_level, r.unit, r.is_active ?? true,
         r.created_at, r.updated_at]
      );
    }

    // Restore customers
    for (const r of (d.customers || [])) {
      await client.query(
        `INSERT INTO customers (id,company_id,name,email,phone,address,loyalty_points,is_active,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.name, r.email, r.phone, r.address, r.loyalty_points ?? 0, r.is_active ?? true,
         r.created_at, r.updated_at]
      );
    }

    // Restore sales
    for (const r of (d.sales || [])) {
      await client.query(
        `INSERT INTO sales (id,company_id,branch_id,user_id,customer_id,subtotal,discount_amount,
          tax_amount,total_amount,payment_method,status,notes,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id, r.user_id, r.customer_id, r.subtotal, r.discount_amount,
         r.tax_amount, r.total_amount, r.payment_method, r.status, r.notes, r.created_at, r.updated_at]
      );
    }
    for (const r of (d.sale_items || [])) {
      await client.query(
        `INSERT INTO sale_items (id,sale_id,product_id,quantity,unit_price,discount,total,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.sale_id, r.product_id, r.quantity, r.unit_price, r.discount, r.total, r.created_at]
      );
    }

    // Restore purchases
    for (const r of (d.purchases || [])) {
      await client.query(
        `INSERT INTO purchases (id,company_id,branch_id,supplier_id,user_id,reference_no,
          total_amount,status,notes,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id, r.supplier_id, r.user_id, r.reference_no,
         r.total_amount, r.status, r.notes, r.created_at, r.updated_at]
      );
    }
    for (const r of (d.purchase_items || [])) {
      await client.query(
        `INSERT INTO purchase_items (id,purchase_id,product_id,quantity,unit_cost,total,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.purchase_id, r.product_id, r.quantity, r.unit_cost, r.total, r.created_at]
      );
    }

    // Restore expenses
    for (const r of (d.expenses || [])) {
      await client.query(
        `INSERT INTO expenses (id,company_id,branch_id,user_id,category,amount,description,expense_date,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [r.id, cid, r.branch_id, r.user_id, r.category, r.amount, r.description,
         r.expense_date, r.created_at, r.updated_at]
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
