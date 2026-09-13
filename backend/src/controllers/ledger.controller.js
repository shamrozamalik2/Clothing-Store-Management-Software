'use strict';

const Customer        = require('../models/Customer');
const Supplier        = require('../models/Supplier');
const Sale            = require('../models/Sale');
const Return          = require('../models/Return');
const Purchase        = require('../models/Purchase');
const PurchasePayment = require('../models/PurchasePayment');
const { success, error } = require('../utils/response');

// ── Customer Ledger ────────────────────────────────────────────────────────────

exports.customerLedger = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = req.params.id;
    const { from, to } = req.query;

    const customer = await Customer.findOne({ _id: id, company_id: cid }).lean();
    if (!customer) return error(res, 'Customer not found.', 404);

    const saleFilter = { company_id: cid, customer_id: id, status: 'completed' };
    if (from || to) {
      saleFilter.sale_date = {};
      if (from) saleFilter.sale_date.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   saleFilter.sale_date.$lte = new Date(to   + 'T23:59:59.999Z');
    }

    const sales = await Sale.find(saleFilter, { reference: 1, sale_date: 1, total_amount: 1, paid_amount: 1, due_amount: 1, payment_method: 1, notes: 1 }).lean();

    // Get all returns for this customer's sales
    const saleIds = sales.map(s => s._id);
    const retFilter = { company_id: cid, sale_id: { $in: saleIds } };
    if (from || to) {
      retFilter.return_date = {};
      if (from) retFilter.return_date.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   retFilter.return_date.$lte = new Date(to   + 'T23:59:59.999Z');
    }
    const returns = await Return.find(retFilter, { reference: 1, return_date: 1, total_amount: 1, refund_method: 1, notes: 1 }).lean();

    const salesEntries = sales.map(s => ({
      id:              s._id.toString(),
      reference:       s.reference,
      date:            s.sale_date,
      type:            'sale',
      debit:           parseFloat(s.total_amount)  || 0,
      credit:          parseFloat(s.paid_amount)   || 0,
      balance_impact:  parseFloat(s.due_amount)    || 0,
      payment_method:  s.payment_method,
      notes:           s.notes,
    }));

    const returnEntries = returns.map(r => ({
      id:             r._id.toString(),
      reference:      r.reference,
      date:           r.return_date,
      type:           'return',
      debit:          0,
      credit:         parseFloat(r.total_amount) || 0,
      balance_impact: -(parseFloat(r.total_amount) || 0),
      payment_method: r.refund_method,
      notes:          r.notes,
    }));

    const entries = [...salesEntries, ...returnEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += e.balance_impact;
      return { ...e, running_balance: runningBalance };
    });

    return success(res, {
      customer: { ...customer, id: customer._id.toString() },
      ledger,
      summary: {
        total_sales:     salesEntries.reduce((s, r) => s + r.debit, 0),
        total_paid:      salesEntries.reduce((s, r) => s + r.credit, 0),
        total_returns:   returnEntries.reduce((s, r) => s + r.credit, 0),
        current_balance: parseFloat(customer.current_balance) || 0,
      },
    });
  } catch (err) { next(err); }
};

exports.customersSummary = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const { type = '' } = req.query;

    const filter = { company_id: cid, is_active: true };
    if (type === 'receivable') filter.current_balance = { $gt: 0 };
    if (type === 'payable')    filter.current_balance = { $lt: 0 };

    const customers = await Customer.find(filter, { name: 1, phone: 1, email: 1, customer_group: 1, credit_limit: 1, current_balance: 1 }).sort({ current_balance: -1 }).lean();

    const custIds   = customers.map(c => c._id);
    const saleCounts = await Sale.aggregate([
      { $match: { company_id: cid, customer_id: { $in: custIds } } },
      { $group: { _id: '$customer_id', total_sales: { $sum: 1 } } },
    ]);
    const cntMap = Object.fromEntries(saleCounts.map(s => [s._id.toString(), s.total_sales]));

    return success(res, customers.map(c => ({ ...c, id: c._id.toString(), total_sales: cntMap[c._id.toString()] || 0 })));
  } catch (err) { next(err); }
};

// ── Supplier Ledger ────────────────────────────────────────────────────────────

exports.supplierLedger = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = req.params.id;
    const { from, to } = req.query;

    const supplier = await Supplier.findOne({ _id: id, company_id: cid }).lean();
    if (!supplier) return error(res, 'Supplier not found.', 404);

    const purchFilter = { company_id: cid, supplier_id: id };
    if (from || to) {
      purchFilter.purchase_date = {};
      if (from) purchFilter.purchase_date.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   purchFilter.purchase_date.$lte = new Date(to   + 'T23:59:59.999Z');
    }
    const purchases = await Purchase.find(purchFilter, { reference: 1, purchase_date: 1, total_amount: 1, paid_amount: 1, due_amount: 1, notes: 1 }).lean();

    const purchaseIds = purchases.map(p => p._id);
    const payFilter   = { company_id: cid, purchase_id: { $in: purchaseIds } };
    if (from || to) {
      payFilter.paid_at = {};
      if (from) payFilter.paid_at.$gte = new Date(from + 'T00:00:00.000Z');
      if (to)   payFilter.paid_at.$lte = new Date(to   + 'T23:59:59.999Z');
    }
    const payments = await PurchasePayment.find(payFilter, { reference: 1, paid_at: 1, amount: 1, payment_method: 1, notes: 1 }).lean();

    const purchaseEntries = purchases.map(p => ({
      id:             p._id.toString(),
      reference:      p.reference,
      date:           p.purchase_date,
      type:           'purchase',
      credit:         parseFloat(p.total_amount) || 0,
      debit:          parseFloat(p.paid_amount)  || 0,
      balance_impact: parseFloat(p.due_amount)   || 0,
      notes:          p.notes,
    }));

    const paymentEntries = payments.map(p => ({
      id:             p._id.toString(),
      reference:      p.reference,
      date:           p.paid_at,
      type:           'payment',
      debit:          parseFloat(p.amount) || 0,
      credit:         0,
      balance_impact: -(parseFloat(p.amount) || 0),
      payment_method: p.payment_method,
      notes:          p.notes,
    }));

    const entries = [...purchaseEntries, ...paymentEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += e.balance_impact;
      return { ...e, running_balance: runningBalance };
    });

    return success(res, {
      supplier: { ...supplier, id: supplier._id.toString() },
      ledger,
      summary: {
        total_purchases: purchaseEntries.reduce((s, r) => s + r.credit, 0),
        total_paid:      paymentEntries.reduce((s, r) => s + r.debit, 0),
        current_balance: parseFloat(supplier.current_balance) || 0,
      },
    });
  } catch (err) { next(err); }
};

exports.suppliersSummary = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ company_id: req.companyId, is_active: true }, { name: 1, phone: 1, email: 1, current_balance: 1, opening_balance: 1 }).sort({ current_balance: -1 }).lean();
    return success(res, suppliers.map(s => ({ ...s, id: s._id.toString() })));
  } catch (err) { next(err); }
};

exports.arApSummary = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const [arAgg, apAgg] = await Promise.all([
      Sale.aggregate([{ $match: { company_id: cid, status: 'completed' } }, { $group: { _id: null, total_ar: { $sum: '$due_amount' } } }]),
      Purchase.aggregate([{ $match: { company_id: cid } }, { $group: { _id: null, total_ap: { $sum: '$due_amount' } } }]),
    ]);
    return success(res, {
      accounts_receivable: parseFloat(arAgg[0]?.total_ar || 0),
      accounts_payable:    parseFloat(apAgg[0]?.total_ap || 0),
    });
  } catch (err) { next(err); }
};
