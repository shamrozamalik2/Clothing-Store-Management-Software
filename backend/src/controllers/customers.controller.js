'use strict';

const { query }            = require('../config/database');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS }    = require('../config/constants');
const { logAudit }         = require('../utils/audit');

const SALE_COUNT = `(SELECT COUNT(*) FROM sales WHERE customer_id = c.id AND company_id = c.company_id)`;

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', status = '', group = '' } = req.query;

    if (req.query.flat === '1') {
      const q = req.query.q || '';
      if (q) {
        const { rows } = await query(`
          SELECT id, name, phone, email, current_balance, loyalty_points
          FROM customers
          WHERE company_id=$1 AND is_active=TRUE AND (name ILIKE $2 OR phone ILIKE $2)
          ORDER BY name ASC LIMIT 10
        `, [cid, `%${q}%`]);
        return success(res, rows);
      }
      const { rows } = await query(`
        SELECT id, name, phone, email, current_balance, loyalty_points
        FROM customers WHERE company_id=$1 AND is_active=TRUE ORDER BY name ASC LIMIT 20
      `, [cid]);
      return success(res, rows);
    }

    const { page, limit, offset } = parsePagination(req.query);
    const params = [cid];
    const where  = ['c.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`c.is_active = $${params.length}`);
    }
    if (group) {
      params.push(group);
      where.push(`c.customer_group = $${params.length}`);
    }

    const wStr = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM customers c WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT c.*, ${SALE_COUNT} AS sale_count
      FROM customers c
      WHERE ${wStr}
      ORDER BY c.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [row] } = await query(`
      SELECT c.*, ${SALE_COUNT} AS sale_count
      FROM customers c
      WHERE c.id=$1 AND c.company_id=$2
    `, [req.params.id, req.companyId]);
    if (!row) return error(res, 'Customer not found.', 404);
    return success(res, row);
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, city, customer_group = 'general', opening_balance = 0, notes } = req.body;

    if (!name?.trim()) return error(res, 'Customer name is required.', 422);

    const bal = parseFloat(opening_balance) || 0;
    const { rows: [row] } = await query(`
      INSERT INTO customers
        (company_id, name, email, phone, address, city, customer_group, current_balance, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [cid, name.trim(), email?.trim() || null, phone?.trim() || null,
        address?.trim() || null, city?.trim() || null,
        customer_group || 'general', bal, notes?.trim() || null]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'customers', row.id, null, { name: row.name });
    return created(res, row, 'Customer created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT * FROM customers WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    if (!existing) return error(res, 'Customer not found.', 404);

    const { name, email, phone, address, city, customer_group, notes, is_active } = req.body;

    const { rows: [updated] } = await query(`
      UPDATE customers
      SET name=$3, email=$4, phone=$5, address=$6, city=$7,
          customer_group=$8, notes=$9, is_active=$10, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [id, cid,
        name    !== undefined ? name.trim()              : existing.name,
        email   !== undefined ? (email?.trim() || null)  : existing.email,
        phone   !== undefined ? (phone?.trim() || null)  : existing.phone,
        address !== undefined ? (address?.trim() || null): existing.address,
        city    !== undefined ? (city?.trim() || null)   : existing.city,
        customer_group        !== undefined ? customer_group : existing.customer_group,
        notes   !== undefined ? (notes?.trim() || null)  : existing.notes,
        is_active !== undefined ? Boolean(is_active)     : existing.is_active]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'customers', id, { name: existing.name }, { name: updated.name });
    return success(res, updated, 'Customer updated successfully.');
  } catch (err) { next(err); }
};

// ── remove (soft deactivate) ──────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT id, name FROM customers WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    if (!existing) return error(res, 'Customer not found.', 404);

    await query(
      'UPDATE customers SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'customers', id, { name: existing.name });
    return success(res, null, 'Customer deactivated successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };
