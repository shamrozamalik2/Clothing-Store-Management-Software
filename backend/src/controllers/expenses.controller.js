'use strict';

const { query, withTransaction } = require('../config/database');
const { success, error } = require('../utils/response');
const { logAudit }       = require('../utils/audit');

async function generateReference(client, companyId) {
  const { rows: [row] } = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM expenses WHERE company_id = $1`,
    [companyId]
  );
  const seq = String(row.cnt + 1).padStart(4, '0');
  const d   = new Date();
  const ym  = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `EXP-${ym}-${seq}`;
}

// GET /expenses
async function list(req, res, next) {
  try {
    const cid  = req.companyId;
    const page = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit= Math.min(100, parseInt(req.query.limit || '25', 10));
    const off  = (page - 1) * limit;

    const { from, to, category_id } = req.query;

    const params = [cid];
    const where  = ['e.company_id = $1'];

    if (from) { params.push(from); where.push(`e.expense_date >= $${params.length}::date`); }
    if (to)   { params.push(to);   where.push(`e.expense_date <= $${params.length}::date`); }
    if (category_id) { params.push(category_id); where.push(`e.category_id = $${params.length}`); }

    const whereStr = where.join(' AND ');

    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*)::int AS total FROM expenses e WHERE ${whereStr}`,
      params
    );

    params.push(limit, off);
    const { rows } = await query(`
      SELECT e.*,
             ec.name AS category_name,
             u.name  AS created_by_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN users              u  ON u.id  = e.created_by
      WHERE ${whereStr}
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return success(res, {
      expenses: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// GET /expenses/categories
async function listCategories(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, name FROM expense_categories WHERE company_id = $1 ORDER BY name`,
      [req.companyId]
    );
    return success(res, rows);
  } catch (err) { next(err); }
}

// POST /expenses
async function create(req, res, next) {
  try {
    const cid = req.companyId;
    const { category_id, amount, payment_method = 'cash', expense_date, description, notes } = req.body;

    const id = await withTransaction(async (client) => {
      const ref = await generateReference(client, cid);
      const { rows: [row] } = await client.query(`
        INSERT INTO expenses
          (company_id, category_id, reference, title, amount, payment_method, expense_date, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
      `, [
        cid,
        category_id || null,
        ref,
        description?.trim() || 'Expense',
        parseFloat(amount),
        payment_method,
        expense_date || new Date().toISOString().slice(0, 10),
        notes?.trim() || null,
        req.user.id,
      ]);
      return row.id;
    });

    await logAudit(cid, req.user.id, 'create', 'expenses', id);
    return success(res, { id }, 'Expense recorded.', 201);
  } catch (err) { next(err); }
}

// PATCH /expenses/:id
async function update(req, res, next) {
  try {
    const cid = req.companyId;
    const { id } = req.params;
    const { category_id, amount, payment_method, expense_date, description, notes } = req.body;

    const { rows: [existing] } = await query(
      'SELECT id FROM expenses WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Expense not found.', 404);

    await query(`
      UPDATE expenses SET
        category_id    = COALESCE($1, category_id),
        amount         = COALESCE($2, amount),
        payment_method = COALESCE($3, payment_method),
        expense_date   = COALESCE($4::date, expense_date),
        title          = COALESCE($5, title),
        notes          = COALESCE($6, notes),
        updated_at     = NOW()
      WHERE id = $7 AND company_id = $8
    `, [
      category_id || null,
      amount ? parseFloat(amount) : null,
      payment_method || null,
      expense_date   || null,
      description?.trim() || null,
      notes?.trim()       || null,
      id, cid,
    ]);

    await logAudit(cid, req.user.id, 'update', 'expenses', id);
    return success(res, null, 'Expense updated.');
  } catch (err) { next(err); }
}

// DELETE /expenses/:id
async function remove(req, res, next) {
  try {
    const cid = req.companyId;
    const { id } = req.params;

    const { rowCount } = await query(
      'DELETE FROM expenses WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!rowCount) return error(res, 'Expense not found.', 404);

    await logAudit(cid, req.user.id, 'delete', 'expenses', id);
    return success(res, null, 'Expense deleted.');
  } catch (err) { next(err); }
}

module.exports = { list, listCategories, create, update, remove };
