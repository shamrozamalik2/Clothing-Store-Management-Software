'use strict';

const { query }            = require('../config/database');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS }    = require('../config/constants');
const { logAudit }         = require('../utils/audit');

const PURCHASE_COUNT = `(SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id AND company_id = s.company_id)`;

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', status = '' } = req.query;

    if (req.query.flat === '1') {
      const { rows } = await query(
        `SELECT id, name, phone, current_balance FROM suppliers WHERE company_id=$1 AND is_active=TRUE ORDER BY name ASC`,
        [cid]
      );
      return success(res, rows);
    }

    const { page, limit, offset } = parsePagination(req.query);
    const params = [cid];
    const where  = ['s.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.name ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.email ILIKE $${params.length})`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`s.is_active = $${params.length}`);
    }

    const wStr = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM suppliers s WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT s.*, ${PURCHASE_COUNT} AS purchase_count
      FROM suppliers s
      WHERE ${wStr}
      ORDER BY s.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [row] } = await query(`
      SELECT s.*, ${PURCHASE_COUNT} AS purchase_count
      FROM suppliers s
      WHERE s.id = $1 AND s.company_id = $2
    `, [req.params.id, req.companyId]);
    if (!row) return error(res, 'Supplier not found.', 404);
    return success(res, row);
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, city, opening_balance = 0, notes } = req.body;

    if (!name?.trim()) return error(res, 'Supplier name is required.', 422);

    const bal = parseFloat(opening_balance) || 0;
    const { rows: [row] } = await query(`
      INSERT INTO suppliers (company_id, name, email, phone, address, city, opening_balance, current_balance, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8)
      RETURNING *
    `, [cid, name.trim(), email?.trim() || null, phone?.trim() || null,
        address?.trim() || null, city?.trim() || null, bal, notes?.trim() || null]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'suppliers', row.id, null, { name: row.name });
    return created(res, row, 'Supplier created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT * FROM suppliers WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Supplier not found.', 404);

    const { name, email, phone, address, city, notes, is_active } = req.body;

    const newName    = name    !== undefined ? name.trim()           : existing.name;
    const newEmail   = email   !== undefined ? (email?.trim() || null) : existing.email;
    const newPhone   = phone   !== undefined ? (phone?.trim() || null) : existing.phone;
    const newAddress = address !== undefined ? (address?.trim() || null) : existing.address;
    const newCity    = city    !== undefined ? (city?.trim() || null)   : existing.city;
    const newNotes   = notes   !== undefined ? (notes?.trim() || null)  : existing.notes;
    const newActive  = is_active !== undefined ? Boolean(is_active)    : existing.is_active;

    const { rows: [updated] } = await query(`
      UPDATE suppliers
      SET name=$3, email=$4, phone=$5, address=$6, city=$7, notes=$8, is_active=$9, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [id, cid, newName, newEmail, newPhone, newAddress, newCity, newNotes, newActive]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'suppliers', id, { name: existing.name }, { name: updated.name });
    return success(res, updated, 'Supplier updated successfully.');
  } catch (err) { next(err); }
};

// ── remove (soft deactivate) ──────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT id, name FROM suppliers WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Supplier not found.', 404);

    const { rows: [{ cnt }] } = await query(
      'SELECT COUNT(*) AS cnt FROM purchases WHERE supplier_id = $1 AND company_id = $2',
      [id, cid]
    );
    if (parseInt(cnt, 10) > 0) return error(res, 'Cannot delete supplier with existing purchases.', 409);

    await query(
      'UPDATE suppliers SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'suppliers', id, { name: existing.name });
    return success(res, null, 'Supplier deactivated successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };
