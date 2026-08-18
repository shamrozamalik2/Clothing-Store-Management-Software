'use strict';

const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// ── Customer Ledger ────────────────────────────────────────────────────────────

// GET /ledger/customers/:id
exports.customerLedger = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = req.params.id;
    const { from, to } = req.query;

    const { rows: [customer] } = await query(
      'SELECT * FROM customers WHERE id=$1 AND company_id=$2', [id, cid]
    );
    if (!customer) return error(res, 'Customer not found.', 404);

    // Sales (debit — customer owes)
    const salesParams = [cid, id];
    let salesWhere    = 's.company_id=$1 AND s.customer_id=$2 AND s.status=\'completed\'';
    if (from) { salesParams.push(from); salesWhere += ` AND s.sale_date::date >= $${salesParams.length}`; }
    if (to)   { salesParams.push(to);   salesWhere += ` AND s.sale_date::date <= $${salesParams.length}`; }

    const { rows: sales } = await query(`
      SELECT s.id, s.reference, s.sale_date AS date,
             'sale'::text AS type,
             s.total_amount AS debit,
             s.paid_amount  AS credit,
             s.due_amount   AS balance_impact,
             s.payment_method, s.notes
      FROM sales s
      WHERE ${salesWhere}
    `, salesParams);

    // Returns (credit — refund back to customer)
    const { rows: returns } = await query(`
      SELECT r.id, r.reference, r.return_date AS date,
             'return'::text AS type,
             0::numeric AS debit,
             r.total_amount AS credit,
             (-r.total_amount) AS balance_impact,
             r.refund_method AS payment_method, r.notes
      FROM returns r
      JOIN sales s ON s.id = r.sale_id
      WHERE r.company_id=$1 AND s.customer_id=$2
        ${from ? `AND r.return_date::date >= '${from}'` : ''}
        ${to   ? `AND r.return_date::date <= '${to}'`   : ''}
    `, [cid, id]);

    const entries = [...sales, ...returns].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running balance
    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += parseFloat(e.balance_impact) || 0;
      return { ...e, running_balance: runningBalance };
    });

    return success(res, {
      customer,
      ledger,
      summary: {
        total_sales:    sales.reduce((s, r) => s + parseFloat(r.debit), 0),
        total_paid:     sales.reduce((s, r) => s + parseFloat(r.credit), 0),
        total_returns:  returns.reduce((s, r) => s + parseFloat(r.credit), 0),
        current_balance: parseFloat(customer.current_balance),
      },
    });
  } catch (err) { next(err); }
};

// GET /ledger/customers  — all customers with balance summary
exports.customersSummary = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { type = '' } = req.query; // 'payable' | 'receivable' | ''

    let where = 'company_id=$1 AND is_active=TRUE';
    if (type === 'receivable') where += ' AND current_balance > 0';
    if (type === 'payable')    where += ' AND current_balance < 0';

    const { rows } = await query(`
      SELECT id, name, phone, email, customer_group, credit_limit, current_balance,
             (SELECT COUNT(*) FROM sales s WHERE s.customer_id = customers.id AND s.company_id = customers.company_id) AS total_sales
      FROM customers
      WHERE ${where}
      ORDER BY current_balance DESC
    `, [cid]);

    return success(res, rows);
  } catch (err) { next(err); }
};

// GET /ledger/suppliers/:id
exports.supplierLedger = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = req.params.id;
    const { from, to } = req.query;

    const { rows: [supplier] } = await query(
      'SELECT * FROM suppliers WHERE id=$1 AND company_id=$2', [id, cid]
    );
    if (!supplier) return error(res, 'Supplier not found.', 404);

    // Purchases (credit — we owe supplier)
    const { rows: purchases } = await query(`
      SELECT p.id, p.reference, p.purchase_date AS date,
             'purchase'::text AS type,
             p.total_amount  AS credit,
             p.paid_amount   AS debit,
             p.due_amount    AS balance_impact,
             p.notes
      FROM purchases p
      WHERE p.company_id=$1 AND p.supplier_id=$2
        ${from ? `AND p.purchase_date >= '${from}'` : ''}
        ${to   ? `AND p.purchase_date <= '${to}'`   : ''}
      ORDER BY p.purchase_date
    `, [cid, id]);

    // Payments to supplier
    const { rows: payments } = await query(`
      SELECT pp.id, pp.reference, pp.paid_at AS date,
             'payment'::text AS type,
             pp.amount AS debit,
             0::numeric AS credit,
             (-pp.amount) AS balance_impact,
             pp.payment_method, pp.notes
      FROM purchase_payments pp
      JOIN purchases p ON p.id = pp.purchase_id
      WHERE pp.company_id=$1 AND p.supplier_id=$2
        ${from ? `AND pp.paid_at::date >= '${from}'` : ''}
        ${to   ? `AND pp.paid_at::date <= '${to}'`   : ''}
    `, [cid, id]);

    const entries = [...purchases, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += parseFloat(e.balance_impact) || 0;
      return { ...e, running_balance: runningBalance };
    });

    return success(res, {
      supplier,
      ledger,
      summary: {
        total_purchases: purchases.reduce((s, r) => s + parseFloat(r.credit), 0),
        total_paid:      payments.reduce((s, r) => s + parseFloat(r.debit), 0),
        current_balance: parseFloat(supplier.current_balance),
      },
    });
  } catch (err) { next(err); }
};

// GET /ledger/suppliers  — all suppliers with balance
exports.suppliersSummary = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT id, name, phone, email, current_balance, opening_balance
      FROM suppliers WHERE company_id=$1 AND is_active=TRUE ORDER BY current_balance DESC
    `, [req.companyId]);
    return success(res, rows);
  } catch (err) { next(err); }
};

// GET /ledger/ar-ap  — accounts receivable / payable summary
exports.arApSummary = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const [arRow, apRow] = await Promise.all([
      query(`SELECT COALESCE(SUM(due_amount),0) AS total_ar FROM sales WHERE company_id=$1 AND status='completed'`, [cid]),
      query(`SELECT COALESCE(SUM(due_amount),0) AS total_ap FROM purchases WHERE company_id=$1`, [cid]),
    ]);
    return success(res, {
      accounts_receivable: parseFloat(arRow.rows[0].total_ar),
      accounts_payable:    parseFloat(apRow.rows[0].total_ap),
    });
  } catch (err) { next(err); }
};
