'use strict';

const Customer = require('../models/Customer');
const Sale     = require('../models/Sale');
const { success, created, error }   = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', status = '', group = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filter = { company_id: cid };
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status !== '') filter.is_active = status === 'active';
    if (group)  filter.customer_group = group;

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter).sort({ name: 1 }).skip(offset).limit(limit).lean(),
    ]);

    return res.json({ success: true, data: customers.map(c => ({ ...c, id: c._id.toString() })), pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!customer) return error(res, 'Customer not found.', 404);

    const [totalSales, totalSpent, totalDue] = await Sale.aggregate([
      { $match: { company_id: req.companyId, customer_id: customer._id, status: 'completed' } },
      { $group: { _id: null, cnt: { $sum: 1 }, spent: { $sum: '$total_amount' }, due: { $sum: '$due_amount' } } },
    ]).then(r => r[0] ? [r[0].cnt, r[0].spent, r[0].due] : [0, 0, 0]);

    return success(res, { ...customer, id: customer._id.toString(), total_sales: totalSales, total_spent: totalSpent, total_due: totalDue });
  } catch (err) { next(err); }
};

const createCustomer = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const body = req.body;
    const customer = await Customer.create({
      company_id:      cid,
      name:            body.name,
      email:           body.email    || null,
      phone:           body.phone    || null,
      address:         body.address  || null,
      city:            body.city     || null,
      customer_group:  body.customer_group || 'general',
      credit_limit:    parseFloat(body.credit_limit)    || 0,
      current_balance: parseFloat(body.current_balance) || 0,
      loyalty_points:  parseInt(body.loyalty_points, 10) || 0,
      notes:           body.notes    || null,
      is_active:       body.is_active !== false && body.is_active !== 'false',
    });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'customers', customer._id.toString(), null, { name: body.name });
    return created(res, { ...customer.toJSON() }, 'Customer created.');
  } catch (err) { next(err); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const cid      = req.companyId;
    const customer = await Customer.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!customer) return error(res, 'Customer not found.', 404);

    const body   = req.body;
    const update = {};
    if (body.name            !== undefined) update.name            = body.name;
    if (body.email           !== undefined) update.email           = body.email    || null;
    if (body.phone           !== undefined) update.phone           = body.phone    || null;
    if (body.address         !== undefined) update.address         = body.address  || null;
    if (body.city            !== undefined) update.city            = body.city     || null;
    if (body.customer_group  !== undefined) update.customer_group  = body.customer_group;
    if (body.credit_limit    !== undefined) update.credit_limit    = parseFloat(body.credit_limit)    || 0;
    if (body.current_balance !== undefined) update.current_balance = parseFloat(body.current_balance) || 0;
    if (body.loyalty_points  !== undefined) update.loyalty_points  = parseInt(body.loyalty_points, 10) || 0;
    if (body.notes           !== undefined) update.notes           = body.notes    || null;
    if (body.is_active       !== undefined) update.is_active       = body.is_active !== false && body.is_active !== 'false';

    const updated = await Customer.findByIdAndUpdate(req.params.id, { ...update, updated_at: new Date() }, { new: true }).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'customers', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Customer updated.');
  } catch (err) { next(err); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const cid      = req.companyId;
    const customer = await Customer.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!customer) return error(res, 'Customer not found.', 404);

    const hasSales = await Sale.findOne({ company_id: cid, customer_id: customer._id }, { _id: 1 }).lean();
    if (hasSales) return error(res, 'Cannot delete customer with sales history. Deactivate instead.', 409);

    await Customer.findByIdAndDelete(req.params.id);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'customers', req.params.id);
    return success(res, null, 'Customer deleted.');
  } catch (err) { next(err); }
};

const getLedger = async (req, res, next) => {
  try {
    const cid      = req.companyId;
    const customer = await Customer.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!customer) return error(res, 'Customer not found.', 404);

    const sales = await Sale.find({ company_id: cid, customer_id: customer._id }, { reference: 1, sale_date: 1, total_amount: 1, paid_amount: 1, due_amount: 1, status: 1 }).sort({ sale_date: 1 }).lean();

    return success(res, {
      customer: { ...customer, id: customer._id.toString() },
      ledger: sales.map(s => ({ ...s, id: s._id.toString() })),
    });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, createCustomer, updateCustomer, deleteCustomer, getLedger };
