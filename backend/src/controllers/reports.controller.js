'use strict';

const { query } = require('../config/database');

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDateRange(qry) {
  const today = new Date().toISOString().slice(0, 10);
  return { from: qry.from || today, to: qry.to || today };
}

// ─── overview (KPIs) ─────────────────────────────────────────────────────────

exports.overview = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const { rows: [sales] } = await query(`
      SELECT
        COUNT(*)::int                    AS sale_count,
        COALESCE(SUM(total_amount),0)    AS revenue,
        COALESCE(SUM(paid_amount), 0)    AS collected,
        COALESCE(SUM(due_amount),  0)    AS outstanding,
        COALESCE(SUM(discount_amount),0) AS total_discount,
        COALESCE(SUM(tax_amount),  0)    AS total_tax
      FROM sales
      WHERE company_id=$1 AND status='completed'
        AND sale_date::date BETWEEN $2 AND $3
    `, [cid, from, to]);

    const { rows: [cogs] } = await query(`
      SELECT COALESCE(SUM(si.cost_price * si.quantity),0) AS cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.company_id=$1 AND s.status='completed'
        AND s.sale_date::date BETWEEN $2 AND $3
    `, [cid, from, to]);

    const { rows: [purchases] } = await query(`
      SELECT
        COUNT(*)::int                  AS purchase_count,
        COALESCE(SUM(total_amount),0)  AS purchase_total,
        COALESCE(SUM(paid_amount), 0)  AS purchase_paid,
        COALESCE(SUM(due_amount),  0)  AS purchase_due
      FROM purchases
      WHERE company_id=$1 AND status='received'
        AND purchase_date BETWEEN $2 AND $3
    `, [cid, from, to]);

    const { rows: [stock] } = await query(`
      SELECT
        COUNT(*)::int AS total_products,
        SUM(CASE WHEN track_inventory AND stock_quantity <= 0 THEN 1 ELSE 0 END)::int AS out_of_stock,
        SUM(CASE WHEN track_inventory AND stock_quantity > 0 AND stock_quantity <= low_stock_alert THEN 1 ELSE 0 END)::int AS low_stock
      FROM products
      WHERE company_id=$1 AND is_active=TRUE
    `, [cid]);

    const revenue = parseFloat(sales.revenue) || 0;
    const cogsVal = parseFloat(cogs.cogs)     || 0;
    const gross_profit  = revenue - cogsVal;
    const profit_margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;
    const avg_order     = sales.sale_count > 0 ? revenue / sales.sale_count : 0;

    res.json({
      success: true,
      data: {
        period: { from, to },
        sales: { ...sales, avg_order_value: avg_order },
        cogs: cogsVal,
        gross_profit,
        profit_margin,
        purchases,
        stock,
      },
    });
  } catch (err) { next(err); }
};

// ─── daily sales chart ────────────────────────────────────────────────────────

exports.dailySales = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const { rows } = await query(`
      SELECT
        sale_date::date                  AS day,
        COUNT(*)::int                    AS sale_count,
        COALESCE(SUM(total_amount), 0)   AS revenue,
        COALESCE(SUM(paid_amount),  0)   AS collected
      FROM sales
      WHERE company_id=$1 AND status='completed'
        AND sale_date::date BETWEEN $2 AND $3
      GROUP BY sale_date::date
      ORDER BY day ASC
    `, [cid, from, to]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── sales by payment method ──────────────────────────────────────────────────

exports.paymentMethods = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const { rows } = await query(`
      SELECT
        payment_method,
        COUNT(*)::int                    AS sale_count,
        COALESCE(SUM(total_amount), 0)   AS revenue
      FROM sales
      WHERE company_id=$1 AND status='completed'
        AND sale_date::date BETWEEN $2 AND $3
      GROUP BY payment_method
      ORDER BY revenue DESC
    `, [cid, from, to]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── top products ─────────────────────────────────────────────────────────────

exports.topProducts = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const { from, to } = getDateRange(req.query);
    const lim   = Math.min(parseInt(req.query.limit) || 10, 50);

    const { rows } = await query(`
      SELECT
        p.id,
        p.name,
        p.sku,
        c.name                                        AS category_name,
        COALESCE(SUM(si.quantity), 0)                 AS total_qty,
        COALESCE(SUM(si.total),    0)                 AS total_revenue,
        COALESCE(SUM(si.cost_price * si.quantity), 0) AS total_cost,
        COUNT(DISTINCT s.id)::int                     AS sale_count
      FROM sale_items si
      JOIN products p  ON p.id  = si.product_id
      JOIN sales    s  ON s.id  = si.sale_id
      LEFT JOIN categories c ON c.id = p.category_id AND c.company_id = p.company_id
      WHERE s.company_id=$1 AND s.status='completed'
        AND s.sale_date::date BETWEEN $2 AND $3
      GROUP BY p.id, p.name, p.sku, c.name
      ORDER BY total_revenue DESC
      LIMIT $4
    `, [cid, from, to, lim]);

    const data = rows.map(r => {
      const rev = parseFloat(r.total_revenue) || 0;
      const cost = parseFloat(r.total_cost) || 0;
      return {
        ...r,
        gross_profit:  rev - cost,
        profit_margin: rev > 0 ? ((rev - cost) / rev) * 100 : 0,
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── top customers ────────────────────────────────────────────────────────────

exports.topCustomers = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);
    const lim = Math.min(parseInt(req.query.limit) || 10, 50);

    const { rows } = await query(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.customer_group,
        c.current_balance,
        COUNT(DISTINCT s.id)::int        AS sale_count,
        COALESCE(SUM(s.total_amount), 0) AS total_spent,
        COALESCE(SUM(s.paid_amount),  0) AS total_paid,
        COALESCE(SUM(s.due_amount),   0) AS total_due
      FROM sales s
      JOIN customers c ON c.id = s.customer_id AND c.company_id = s.company_id
      WHERE s.company_id=$1 AND s.status='completed'
        AND s.sale_date::date BETWEEN $2 AND $3
      GROUP BY c.id, c.name, c.phone, c.customer_group, c.current_balance
      ORDER BY total_spent DESC
      LIMIT $4
    `, [cid, from, to, lim]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── stock valuation ──────────────────────────────────────────────────────────

exports.stockValuation = async (req, res, next) => {
  try {
    const cid = req.companyId;

    const { rows: [summary] } = await query(`
      SELECT
        COUNT(*)::int                                    AS total_products,
        COALESCE(SUM(stock_quantity * cost_price), 0)   AS stock_value,
        COALESCE(SUM(stock_quantity * sale_price),  0)  AS retail_value,
        SUM(CASE WHEN track_inventory AND stock_quantity <= 0 THEN 1 ELSE 0 END)::int AS out_of_stock,
        SUM(CASE WHEN track_inventory AND stock_quantity > 0 AND stock_quantity <= low_stock_alert THEN 1 ELSE 0 END)::int AS low_stock
      FROM products
      WHERE company_id=$1 AND is_active=TRUE
    `, [cid]);

    const { rows: byCategory } = await query(`
      SELECT
        COALESCE(c.name, 'Uncategorized')               AS category,
        COUNT(p.id)::int                                 AS product_count,
        COALESCE(SUM(p.stock_quantity), 0)               AS total_stock,
        COALESCE(SUM(p.stock_quantity * p.cost_price),0) AS stock_value,
        COALESCE(SUM(p.stock_quantity * p.sale_price),0) AS retail_value
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id AND c.company_id = p.company_id
      WHERE p.company_id=$1 AND p.is_active=TRUE
      GROUP BY c.id, c.name
      ORDER BY stock_value DESC
    `, [cid]);

    const { rows: lowStockItems } = await query(`
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.low_stock_alert, p.cost_price, p.sale_price,
             c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id AND c.company_id = p.company_id
      WHERE p.company_id=$1 AND p.is_active=TRUE
        AND p.track_inventory=TRUE
        AND p.stock_quantity <= p.low_stock_alert
      ORDER BY p.stock_quantity ASC
      LIMIT 20
    `, [cid]);

    res.json({ success: true, data: { summary, byCategory, lowStockItems } });
  } catch (err) { next(err); }
};

// ─── purchases summary ────────────────────────────────────────────────────────

exports.purchasesSummary = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const { rows: [totals] } = await query(`
      SELECT
        COUNT(*)::int                  AS purchase_count,
        COALESCE(SUM(total_amount),0)  AS total_amount,
        COALESCE(SUM(paid_amount), 0)  AS paid_amount,
        COALESCE(SUM(due_amount),  0)  AS due_amount
      FROM purchases
      WHERE company_id=$1 AND status='received'
        AND purchase_date BETWEEN $2 AND $3
    `, [cid, from, to]);

    const { rows: bySupplier } = await query(`
      SELECT
        COALESCE(s.name, 'Unknown')     AS supplier_name,
        COUNT(p.id)::int                AS purchase_count,
        COALESCE(SUM(p.total_amount),0) AS total_amount,
        COALESCE(SUM(p.paid_amount), 0) AS paid_amount,
        COALESCE(SUM(p.due_amount),  0) AS due_amount
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.company_id = p.company_id
      WHERE p.company_id=$1 AND p.status='received'
        AND p.purchase_date BETWEEN $2 AND $3
      GROUP BY p.supplier_id, s.name
      ORDER BY total_amount DESC
      LIMIT 10
    `, [cid, from, to]);

    const { rows: daily } = await query(`
      SELECT
        purchase_date                  AS day,
        COUNT(*)::int                  AS purchase_count,
        COALESCE(SUM(total_amount),0)  AS total_amount
      FROM purchases
      WHERE company_id=$1 AND status='received'
        AND purchase_date BETWEEN $2 AND $3
      GROUP BY purchase_date
      ORDER BY day ASC
    `, [cid, from, to]);

    res.json({ success: true, data: { period: { from, to }, totals, bySupplier, daily } });
  } catch (err) { next(err); }
};
