'use strict';

const Expense         = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const User            = require('../models/User');
const { success, error } = require('../utils/response');
const { logAudit }       = require('../utils/audit');

async function generateReference(companyId) {
  const cnt = await Expense.countDocuments({ company_id: companyId });
  const seq  = String(cnt + 1).padStart(4, '0');
  const d    = new Date();
  const ym   = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `EXP-${ym}-${seq}`;
}

// GET /expenses
async function list(req, res, next) {
  try {
    const cid   = req.companyId;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '25', 10));
    const off   = (page - 1) * limit;
    const { from, to, category_id } = req.query;

    const filter = { company_id: cid };
    if (from) filter.expense_date = { ...filter.expense_date, $gte: new Date(from + 'T00:00:00.000Z') };
    if (to)   filter.expense_date = { ...filter.expense_date, $lte: new Date(to   + 'T23:59:59.999Z') };
    if (category_id) filter.category_id = category_id;

    const [total, expenses] = await Promise.all([
      Expense.countDocuments(filter),
      Expense.find(filter).sort({ expense_date: -1, _id: -1 }).skip(off).limit(limit).lean(),
    ]);

    const catIds  = [...new Set(expenses.map(e => e.category_id?.toString()).filter(Boolean))];
    const userIds = [...new Set(expenses.map(e => e.created_by?.toString()).filter(Boolean))];
    const [cats, users] = await Promise.all([
      ExpenseCategory.find({ _id: { $in: catIds } }, { name: 1 }).lean(),
      User.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
    ]);
    const catMap  = Object.fromEntries(cats.map(c => [c._id.toString(), c.name]));
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    const rows = expenses.map(e => ({
      ...e,
      id:               e._id.toString(),
      category_name:    e.category_id ? catMap[e.category_id.toString()]  || null : null,
      created_by_name:  e.created_by  ? userMap[e.created_by.toString()]  || null : null,
    }));

    return success(res, { expenses: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// GET /expenses/categories
async function listCategories(req, res, next) {
  try {
    const cats = await ExpenseCategory.find({ company_id: req.companyId }, { name: 1 }).sort({ name: 1 }).lean();
    return success(res, cats.map(c => ({ id: c._id.toString(), name: c.name })));
  } catch (err) { next(err); }
}

// POST /expenses
async function create(req, res, next) {
  try {
    const cid = req.companyId;
    const { category_id, amount, payment_method = 'cash', expense_date, description, notes, is_recurring, recurring_day } = req.body;

    const ref = await generateReference(cid);
    const exp = await Expense.create({
      company_id:     cid,
      category_id:    category_id || null,
      reference:      ref,
      title:          description?.trim() || 'Expense',
      amount:         parseFloat(amount),
      payment_method,
      expense_date:   expense_date ? new Date(expense_date) : new Date(),
      notes:          notes?.trim() || null,
      is_recurring:   !!is_recurring,
      recurring_day:  is_recurring ? (parseInt(recurring_day) || 1) : null,
      created_by:     req.user.id,
    });

    await logAudit(cid, req.user.id, 'create', 'expenses', exp._id.toString());
    return success(res, { id: exp._id.toString() }, 'Expense recorded.', 201);
  } catch (err) { next(err); }
}

// PATCH /expenses/:id
async function update(req, res, next) {
  try {
    const cid = req.companyId;
    const existing = await Expense.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!existing) return error(res, 'Expense not found.', 404);

    const { category_id, amount, payment_method, expense_date, description, notes } = req.body;
    const upd = {};
    if (category_id    !== undefined) upd.category_id    = category_id || null;
    if (amount         !== undefined) upd.amount         = parseFloat(amount);
    if (payment_method !== undefined) upd.payment_method = payment_method;
    if (expense_date   !== undefined) upd.expense_date   = new Date(expense_date);
    if (description    !== undefined) upd.title          = description?.trim() || existing.title;
    if (notes          !== undefined) upd.notes          = notes?.trim() || null;
    upd.updated_at = new Date();

    await Expense.findByIdAndUpdate(req.params.id, upd);
    await logAudit(cid, req.user.id, 'update', 'expenses', req.params.id);
    return success(res, null, 'Expense updated.');
  } catch (err) { next(err); }
}

// DELETE /expenses/:id
async function remove(req, res, next) {
  try {
    const cid = req.companyId;
    const deleted = await Expense.findOneAndDelete({ _id: req.params.id, company_id: cid });
    if (!deleted) return error(res, 'Expense not found.', 404);
    await logAudit(cid, req.user.id, 'delete', 'expenses', req.params.id);
    return success(res, null, 'Expense deleted.');
  } catch (err) { next(err); }
}

// importExpensesCsv
async function importExpensesCsv(req, res, next) {
  try {
    if (!req.file) return error(res, 'CSV file is required.', 400);
    const cid = req.companyId;
    const { parseCsvBuffer, toDecimal } = require('../utils/csv-parser');
    const { rows } = parseCsvBuffer(req.file.buffer);
    let imported = 0;
    const errors = [];
    const METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'other'];

    for (const row of rows) {
      const line = row._line;
      try {
        if (!row.title)  { errors.push({ row: line, message: 'Title is required' });  continue; }
        if (!row.amount) { errors.push({ row: line, message: 'Amount is required' }); continue; }

        let catId = null;
        if (row.category_name) {
          const cat = await ExpenseCategory.findOne({ company_id: cid, name: { $regex: `^${row.category_name}$`, $options: 'i' } }).lean();
          catId = cat?._id || null;
        }
        const method = METHODS.includes(row.payment_method) ? row.payment_method : 'cash';
        await Expense.create({
          company_id: cid, category_id: catId, title: row.title.trim(),
          amount: toDecimal(row.amount, 0), payment_method: method,
          expense_date: row.expense_date ? new Date(row.expense_date) : new Date(),
          notes: row.notes || null, created_by: req.user.id,
        });
        imported++;
      } catch (e) { errors.push({ row: line, message: e.message }); }
    }

    await logAudit(cid, req.user.id, 'IMPORT', 'expenses', null, { imported, failed: errors.length });
    return success(res, { imported, failed: errors.length, errors }, `${imported} expenses imported.`);
  } catch (err) { next(err); }
}

// importExpenseCategoriesCsv
async function importExpenseCategoriesCsv(req, res, next) {
  try {
    if (!req.file) return error(res, 'CSV file is required.', 400);
    const cid = req.companyId;
    const { parseCsvBuffer, toBoolean } = require('../utils/csv-parser');
    const { rows } = parseCsvBuffer(req.file.buffer);
    let imported = 0;
    const errors = [];

    for (const row of rows) {
      const line = row._line;
      try {
        if (!row.name) { errors.push({ row: line, message: 'Name is required' }); continue; }
        const exists = await ExpenseCategory.findOne({ company_id: cid, name: row.name.trim() });
        if (!exists) await ExpenseCategory.create({ company_id: cid, name: row.name.trim(), is_active: toBoolean(row.is_active, true) });
        imported++;
      } catch (e) { errors.push({ row: line, message: e.message }); }
    }

    await logAudit(cid, req.user.id, 'IMPORT', 'expense_categories', null, { imported, failed: errors.length });
    return success(res, { imported, failed: errors.length, errors }, `${imported} expense categories imported.`);
  } catch (err) { next(err); }
}

module.exports = { list, listCategories, create, update, remove, importExpensesCsv, importExpenseCategoriesCsv };
