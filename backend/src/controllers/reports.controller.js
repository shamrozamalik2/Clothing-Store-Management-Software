'use strict';

const mongoose = require('mongoose');
const Sale     = require('../models/Sale');
const Product  = require('../models/Product');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const User     = require('../models/User');
const Return   = require('../models/Return');
const Expense  = require('../models/Expense');

// ─── helpers ──────────────────────────────────────────────────────────────────

function dayRange(dateStr) {
  const d   = new Date(dateStr);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end   = new Date(start.getTime() + 86400000 - 1);
  return { start, end };
}

function getDateRange(qry) {
  const today = new Date().toISOString().slice(0, 10);
  return { from: qry.from || today, to: qry.to || today };
}

function fromToRange(from, to) {
  return {
    $gte: new Date(from + 'T00:00:00.000Z'),
    $lte: new Date(to   + 'T23:59:59.999Z'),
  };
}

// ─── mobile dashboard ─────────────────────────────────────────────────────────

exports.dashboard = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const today   = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayStart = new Date(today + 'T00:00:00.000Z');
    const todayEnd   = new Date(today + 'T23:59:59.999Z');
    const weekStart  = new Date(weekAgo + 'T00:00:00.000Z');

    const [todayAgg, cogsAgg, stockAgg, recentSales, topProducts, weeklySales, paymentAgg] = await Promise.all([
      // Today KPIs
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, today_orders: { $sum: 1 }, today_sales: { $sum: '$total_amount' }, pending_payments: { $sum: '$due_amount' } } },
      ]),
      // Today COGS
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: { $gte: todayStart, $lte: todayEnd } } },
        { $unwind: '$items' },
        { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.cost_price', '$items.quantity'] } } } },
      ]),
      // Stock counts
      Product.aggregate([
        { $match: { company_id: cid, is_active: true } },
        { $group: {
          _id: null,
          low_stock_count:    { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $gt: ['$stock_quantity', 0] }, { $lte: ['$stock_quantity', '$low_stock_alert'] }] }, 1, 0] } },
          out_of_stock_count: { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $lte: ['$stock_quantity', 0] }] }, 1, 0] } },
        }},
      ]),
      // 10 most recent sales
      Sale.find({ company_id: cid, status: 'completed' }, { reference: 1, total_amount: 1, sale_date: 1, customer_id: 1 })
        .sort({ sale_date: -1 }).limit(10).lean(),
      // Top 5 products last 30 days
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: { $gte: new Date(Date.now() - 30 * 86400000) } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product_id', name: { $first: '$items.product_name' }, total_qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $project: { name: 1, total_qty: 1, revenue: 1 } },
      ]),
      // Weekly sales
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: { $gte: weekStart, $lte: todayEnd } } },
        { $group: {
          _id:    { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } },
          amount: { $sum: '$total_amount' },
        }},
        { $sort: { _id: 1 } },
      ]),
      // Today payment method breakdown
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: {
          _id:          null,
          cash_sales:   { $sum: { $cond: [{ $eq: ['$payment_method', 'cash'] },   '$total_amount', 0] } },
          card_sales:   { $sum: { $cond: [{ $eq: ['$payment_method', 'card'] },   '$total_amount', 0] } },
          credit_sales: { $sum: { $cond: [{ $eq: ['$payment_method', 'credit'] }, '$total_amount', 0] } },
          bank_sales:   { $sum: { $cond: [{ $eq: ['$payment_method', 'bank'] },   '$total_amount', 0] } },
        }},
      ]),
    ]);

    // Populate customer names for recent sales
    const custIds = [...new Set(recentSales.map(s => s.customer_id?.toString()).filter(Boolean))];
    const custMap = await Customer.find({ _id: { $in: custIds } }, { name: 1 }).lean().then(r => Object.fromEntries(r.map(c => [c._id.toString(), c.name])));

    const t   = todayAgg[0]  || { today_orders: 0, today_sales: 0, pending_payments: 0 };
    const cogs = parseFloat(cogsAgg[0]?.cogs || 0);
    const st  = stockAgg[0]  || { low_stock_count: 0, out_of_stock_count: 0 };
    const pm  = paymentAgg[0] || { cash_sales: 0, card_sales: 0, credit_sales: 0, bank_sales: 0 };

    res.json({
      success: true,
      data: {
        today_sales:        parseFloat(t.today_sales)        || 0,
        today_orders:       t.today_orders                   || 0,
        today_profit:       (parseFloat(t.today_sales) || 0) - cogs,
        low_stock_count:    st.low_stock_count               || 0,
        out_of_stock_count: st.out_of_stock_count            || 0,
        pending_payments:   parseFloat(t.pending_payments)   || 0,
        cash_sales:         parseFloat(pm.cash_sales)        || 0,
        card_sales:         parseFloat(pm.card_sales)        || 0,
        credit_sales:       parseFloat(pm.credit_sales)      || 0,
        bank_sales:         parseFloat(pm.bank_sales)        || 0,
        recent_sales: recentSales.map(s => ({
          id:            s._id.toString(),
          invoice_no:    s.reference,
          total_amount:  parseFloat(s.total_amount) || 0,
          created_at:    s.sale_date,
          customer_name: s.customer_id ? custMap[s.customer_id.toString()] || null : null,
        })),
        top_products: topProducts.map(p => ({ name: p.name, total_qty: p.total_qty, revenue: parseFloat(p.revenue) || 0 })),
        weekly_sales: weeklySales.map(w => ({ day: new Date(w._id).toLocaleDateString('en-US', { weekday: 'short' }), amount: parseFloat(w.amount) || 0 })),
      },
    });
  } catch (err) { next(err); }
};

// ─── overview (KPIs) ─────────────────────────────────────────────────────────

exports.overview = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);
    const dateRange = fromToRange(from, to);

    const [salesAgg, cogsAgg, purchasesAgg, stockAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: dateRange } },
        { $group: {
          _id:            null,
          sale_count:     { $sum: 1 },
          revenue:        { $sum: '$total_amount' },
          collected:      { $sum: '$paid_amount' },
          outstanding:    { $sum: '$due_amount' },
          total_discount: { $sum: '$discount_amount' },
          total_tax:      { $sum: '$tax_amount' },
        }},
      ]),
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: dateRange } },
        { $unwind: '$items' },
        { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.cost_price', '$items.quantity'] } } } },
      ]),
      Purchase.aggregate([
        { $match: { company_id: cid, status: 'received', purchase_date: dateRange } },
        { $group: { _id: null, purchase_count: { $sum: 1 }, purchase_total: { $sum: '$total_amount' }, purchase_paid: { $sum: '$paid_amount' }, purchase_due: { $sum: '$due_amount' } } },
      ]),
      Product.aggregate([
        { $match: { company_id: cid, is_active: true } },
        { $group: {
          _id:           null,
          total_products: { $sum: 1 },
          out_of_stock:   { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $lte: ['$stock_quantity', 0] }] }, 1, 0] } },
          low_stock:      { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $gt: ['$stock_quantity', 0] }, { $lte: ['$stock_quantity', '$low_stock_alert'] }] }, 1, 0] } },
        }},
      ]),
    ]);

    const sales     = salesAgg[0]     || { sale_count: 0, revenue: 0, collected: 0, outstanding: 0, total_discount: 0, total_tax: 0 };
    const cogsVal   = parseFloat(cogsAgg[0]?.cogs || 0);
    const purchases = purchasesAgg[0] || { purchase_count: 0, purchase_total: 0, purchase_paid: 0, purchase_due: 0 };
    const stock     = stockAgg[0]     || { total_products: 0, out_of_stock: 0, low_stock: 0 };
    const revenue   = parseFloat(sales.revenue) || 0;
    const gross_profit  = revenue - cogsVal;
    const profit_margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;
    const avg_order     = sales.sale_count > 0 ? revenue / sales.sale_count : 0;

    res.json({ success: true, data: { period: { from, to }, sales: { ...sales, avg_order_value: avg_order }, cogs: cogsVal, gross_profit, profit_margin, purchases, stock } });
  } catch (err) { next(err); }
};

// ─── daily sales chart ────────────────────────────────────────────────────────

exports.dailySales = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const rows = await Sale.aggregate([
      { $match: { company_id: cid, status: 'completed', sale_date: fromToRange(from, to) } },
      { $group: {
        _id:        { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } },
        sale_count: { $sum: 1 },
        revenue:    { $sum: '$total_amount' },
        collected:  { $sum: '$paid_amount' },
      }},
      { $sort: { _id: 1 } },
      { $project: { day: '$_id', sale_count: 1, revenue: 1, collected: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── payment methods ──────────────────────────────────────────────────────────

exports.paymentMethods = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const rows = await Sale.aggregate([
      { $match: { company_id: cid, status: 'completed', sale_date: fromToRange(from, to) } },
      { $group: { _id: '$payment_method', sale_count: { $sum: 1 }, revenue: { $sum: '$total_amount' } } },
      { $sort: { revenue: -1 } },
      { $project: { payment_method: '$_id', sale_count: 1, revenue: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ─── top products ─────────────────────────────────────────────────────────────

exports.topProducts = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);
    const lim = Math.min(parseInt(req.query.limit) || 10, 50);

    const rows = await Sale.aggregate([
      { $match: { company_id: cid, status: 'completed', sale_date: fromToRange(from, to) } },
      { $unwind: '$items' },
      { $group: {
        _id:           '$items.product_id',
        name:          { $first: '$items.product_name' },
        sku:           { $first: '$items.sku' },
        total_qty:     { $sum: '$items.quantity' },
        total_revenue: { $sum: '$items.total' },
        total_cost:    { $sum: { $multiply: ['$items.cost_price', '$items.quantity'] } },
        sale_count:    { $sum: 1 },
      }},
      { $sort: { total_revenue: -1 } },
      { $limit: lim },
    ]);

    // Fetch category names
    const productIds = rows.map(r => r._id);
    const products   = await Product.find({ _id: { $in: productIds }, company_id: cid }, { category_id: 1 }).populate('category_id', 'name').lean();
    const catMap     = Object.fromEntries(products.map(p => [p._id.toString(), p.category_id?.name || null]));

    const data = rows.map(r => {
      const rev  = parseFloat(r.total_revenue) || 0;
      const cost = parseFloat(r.total_cost)    || 0;
      return {
        id:            r._id.toString(),
        name:          r.name,
        sku:           r.sku,
        category_name: catMap[r._id.toString()],
        total_qty:     r.total_qty,
        total_revenue: rev,
        total_cost:    cost,
        sale_count:    r.sale_count,
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

    const rows = await Sale.aggregate([
      { $match: { company_id: cid, status: 'completed', sale_date: fromToRange(from, to) } },
      { $group: {
        _id:        '$customer_id',
        sale_count: { $sum: 1 },
        total_spent:{ $sum: '$total_amount' },
        total_paid: { $sum: '$paid_amount'  },
        total_due:  { $sum: '$due_amount'   },
      }},
      { $sort: { total_spent: -1 } },
      { $limit: lim },
    ]);

    const custIds  = rows.map(r => r._id).filter(Boolean);
    const customers = await Customer.find({ _id: { $in: custIds } }, { name: 1, phone: 1, customer_group: 1, current_balance: 1 }).lean();
    const custMap  = Object.fromEntries(customers.map(c => [c._id.toString(), c]));

    const data = rows.map(r => {
      const c = r._id ? custMap[r._id.toString()] : null;
      return {
        id:              r._id?.toString(),
        name:            c?.name            || 'Walk-in Customer',
        phone:           c?.phone           || null,
        customer_group:  c?.customer_group  || null,
        current_balance: c?.current_balance || 0,
        sale_count:      r.sale_count,
        total_spent:     parseFloat(r.total_spent) || 0,
        total_paid:      parseFloat(r.total_paid)  || 0,
        total_due:       parseFloat(r.total_due)   || 0,
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── stock valuation ──────────────────────────────────────────────────────────

exports.stockValuation = async (req, res, next) => {
  try {
    const cid = req.companyId;

    const [summaryAgg, byCategory, lowStockItems] = await Promise.all([
      Product.aggregate([
        { $match: { company_id: cid, is_active: true } },
        { $group: {
          _id:            null,
          total_products: { $sum: 1 },
          stock_value:    { $sum: { $multiply: ['$stock_quantity', '$cost_price'] } },
          retail_value:   { $sum: { $multiply: ['$stock_quantity', '$sale_price'] } },
          out_of_stock:   { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $lte: ['$stock_quantity', 0] }] }, 1, 0] } },
          low_stock:      { $sum: { $cond: [{ $and: [{ $eq: ['$track_inventory', true] }, { $gt: ['$stock_quantity', 0] }, { $lte: ['$stock_quantity', '$low_stock_alert'] }] }, 1, 0] } },
        }},
      ]),
      Product.aggregate([
        { $match: { company_id: cid, is_active: true } },
        { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: '_cat' } },
        { $group: {
          _id:           '$category_id',
          category:      { $first: { $ifNull: [{ $arrayElemAt: ['$_cat.name', 0] }, 'Uncategorized'] } },
          product_count: { $sum: 1 },
          total_stock:   { $sum: '$stock_quantity' },
          stock_value:   { $sum: { $multiply: ['$stock_quantity', '$cost_price'] } },
          retail_value:  { $sum: { $multiply: ['$stock_quantity', '$sale_price'] } },
        }},
        { $sort: { stock_value: -1 } },
      ]),
      Product.find(
        { company_id: cid, is_active: true, track_inventory: true, $expr: { $lte: ['$stock_quantity', '$low_stock_alert'] } },
        { name: 1, sku: 1, stock_quantity: 1, low_stock_alert: 1, cost_price: 1, sale_price: 1, category_id: 1 }
      ).populate('category_id', 'name').sort({ stock_quantity: 1 }).limit(20).lean(),
    ]);

    res.json({ success: true, data: {
      summary:        summaryAgg[0] || { total_products: 0, stock_value: 0, retail_value: 0, out_of_stock: 0, low_stock: 0 },
      byCategory:     byCategory.map(c => ({ ...c, id: c._id?.toString() })),
      lowStockItems:  lowStockItems.map(p => ({ ...p, id: p._id.toString(), category_name: p.category_id?.name || null })),
    }});
  } catch (err) { next(err); }
};

// ─── purchases summary ────────────────────────────────────────────────────────

exports.purchasesSummary = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);
    const dateRange = fromToRange(from, to);

    const [totalsAgg, bySupplierAgg, dailyAgg] = await Promise.all([
      Purchase.aggregate([
        { $match: { company_id: cid, status: 'received', purchase_date: dateRange } },
        { $group: { _id: null, purchase_count: { $sum: 1 }, total_amount: { $sum: '$total_amount' }, paid_amount: { $sum: '$paid_amount' }, due_amount: { $sum: '$due_amount' } } },
      ]),
      Purchase.aggregate([
        { $match: { company_id: cid, status: 'received', purchase_date: dateRange } },
        { $lookup: { from: 'suppliers', localField: 'supplier_id', foreignField: '_id', as: '_supp' } },
        { $group: {
          _id:           '$supplier_id',
          supplier_name: { $first: { $ifNull: [{ $arrayElemAt: ['$_supp.name', 0] }, 'Unknown'] } },
          purchase_count:{ $sum: 1 },
          total_amount:  { $sum: '$total_amount' },
          paid_amount:   { $sum: '$paid_amount'  },
          due_amount:    { $sum: '$due_amount'   },
        }},
        { $sort: { total_amount: -1 } },
        { $limit: 10 },
      ]),
      Purchase.aggregate([
        { $match: { company_id: cid, status: 'received', purchase_date: dateRange } },
        { $group: {
          _id:            { $dateToString: { format: '%Y-%m-%d', date: '$purchase_date' } },
          purchase_count: { $sum: 1 },
          total_amount:   { $sum: '$total_amount' },
        }},
        { $sort: { _id: 1 } },
        { $project: { day: '$_id', purchase_count: 1, total_amount: 1, _id: 0 } },
      ]),
    ]);

    res.json({ success: true, data: {
      period:     { from, to },
      totals:     totalsAgg[0] || { purchase_count: 0, total_amount: 0, paid_amount: 0, due_amount: 0 },
      bySupplier: bySupplierAgg,
      daily:      dailyAgg,
    }});
  } catch (err) { next(err); }
};

// ─── staff report ─────────────────────────────────────────────────────────────

exports.staffReport = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { from, to } = getDateRange(req.query);

    const users = await User.find({ company_id: cid }, { name: 1, email: 1, role_id: 1 }).lean();
    const roleIds = [...new Set(users.map(u => u.role_id?.toString()).filter(Boolean))];
    const Role = require('../models/Role');
    const roles   = await Role.find({ _id: { $in: roleIds } }, { name: 1 }).lean();
    const roleMap = Object.fromEntries(roles.map(r => [r._id.toString(), r.name]));

    const salesAgg = await Sale.aggregate([
      { $match: { company_id: cid, status: 'completed', sale_date: fromToRange(from, to) } },
      { $group: { _id: '$created_by', sale_count: { $sum: 1 }, revenue: { $sum: '$total_amount' }, collected: { $sum: '$paid_amount' } } },
    ]);
    const salesMap = Object.fromEntries(salesAgg.map(s => [s._id?.toString(), s]));

    const data = users.map(u => {
      const s = salesMap[u._id.toString()] || {};
      return {
        id:         u._id.toString(),
        name:       u.name,
        email:      u.email,
        role:       roleMap[u.role_id?.toString()] || null,
        sale_count: s.sale_count || 0,
        revenue:    parseFloat(s.revenue)   || 0,
        collected:  parseFloat(s.collected) || 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── sales analysis ───────────────────────────────────────────────────────────

exports.salesAnalysis = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { period = '7days', from: fromQ, to: toQ } = req.query;

    const today = new Date().toISOString().slice(0, 10);
    let from, to;

    if (period === 'today')  { from = today; to = today; }
    else if (period === '7days')  { from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10); to = today; }
    else if (period === 'month')  { from = today.slice(0, 7) + '-01'; to = today; }
    else if (period === 'year')   { from = today.slice(0, 4) + '-01-01'; to = today; }
    else                          { from = fromQ || today; to = toQ || today; }

    const dateRange = fromToRange(from, to);

    const [totalsAgg, chartAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: dateRange } },
        { $group: { _id: null, total_sales: { $sum: '$total_amount' }, order_count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { company_id: cid, status: 'completed', sale_date: dateRange } },
        { $group: {
          _id:    { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } },
          amount: { $sum: '$total_amount' },
          orders: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', amount: 1, orders: 1, _id: 0 } },
      ]),
    ]);

    const totals = totalsAgg[0] || { total_sales: 0, order_count: 0 };
    return res.json({
      success: true,
      data: {
        period,
        from,
        to,
        total_sales: parseFloat(totals.total_sales) || 0,
        order_count: totals.order_count || 0,
        chart: chartAgg.map(r => ({ date: r.date, amount: parseFloat(r.amount) || 0, orders: r.orders || 0 })),
      },
    });
  } catch (err) { next(err); }
};
