'use strict';

const bcrypt = require('bcryptjs');
const { validationResult }            = require('express-validator');
const { query }                       = require('../config/database');
const { BCRYPT_ROUNDS, AUDIT_ACTIONS } = require('../config/constants');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { success, created, paginated, error }   = require('../utils/response');
const { logAudit }                    = require('../utils/audit');

const SELECT_COLS = `
  u.id, u.name, u.email, u.phone, u.avatar, u.is_active,
  u.last_login, u.created_at, u.updated_at,
  r.id AS role_id, r.name AS role, r.label AS role_label
`;

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', role = '', status = '' } = req.query;

    const params = [cid];
    const where  = ['u.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      where.push(`r.name = $${params.length}`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`u.is_active = $${params.length}`);
    }

    const wStr = where.join(' AND ');

    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT ${SELECT_COLS}
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE ${wStr}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return paginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(`
      SELECT ${SELECT_COLS}
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.company_id = $2
    `, [req.params.id, req.companyId]);
    if (!user) return error(res, 'User not found.', 404);
    return success(res, user);
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const { name, email, password, role_id, phone = null } = req.body;

    const { rows: [roleRow] } = await query(
      'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
      [role_id, cid]
    );
    if (!roleRow) return error(res, 'Invalid role selected.', 400);

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows: [newUser] } = await query(`
      INSERT INTO users (company_id, role_id, name, email, password, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id
    `, [cid, role_id, name.trim(), email.toLowerCase().trim(), hashed, phone || null]);

    const { rows: [fullUser] } = await query(`
      SELECT ${SELECT_COLS}
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
    `, [newUser.id]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'users', fullUser.id,
      null, { name: fullUser.name, email: fullUser.email });

    return created(res, fullUser, 'User created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return error(res, 'Insufficient permissions.', 403);
    }

    const { rows: [existing] } = await query(
      'SELECT * FROM users WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'User not found.', 404);

    const { name, email, role_id, phone, is_active } = req.body;

    const isAdmin  = req.user.role === 'admin';
    const newName  = name ? name.trim() : existing.name;
    const newEmail = email ? email.toLowerCase().trim() : existing.email;
    const newPhone = phone !== undefined ? (phone || null) : existing.phone;
    const newRoleId = isAdmin ? (role_id ?? existing.role_id) : existing.role_id;
    const newActive = isAdmin ? (is_active !== undefined ? Boolean(is_active) : existing.is_active) : existing.is_active;

    if (newRoleId !== existing.role_id) {
      const { rows: [r] } = await query(
        'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
        [newRoleId, cid]
      );
      if (!r) return error(res, 'Invalid role selected.', 400);
    }

    const { rows: [updated] } = await query(`
      UPDATE users
      SET name=$3, email=$4, role_id=$5, phone=$6, is_active=$7, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING id
    `, [id, cid, newName, newEmail, newRoleId, newPhone, newActive]);

    const { rows: [fullUser] } = await query(`
      SELECT ${SELECT_COLS}
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
    `, [updated.id]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', id,
      { name: existing.name, email: existing.email },
      { name: fullUser.name, email: fullUser.email });

    return success(res, fullUser, 'User updated successfully.');
  } catch (err) { next(err); }
};

// ── remove (soft deactivate) ──────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    if (id === req.user.id) return error(res, 'You cannot deactivate your own account.', 400);

    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!user) return error(res, 'User not found.', 404);

    await query(
      'UPDATE users SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'users', id, { name: user.name });
    return success(res, null, 'User deactivated successfully.');
  } catch (err) { next(err); }
};

// ── resetPassword ─────────────────────────────────────────────────────────────

const resetPassword = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [user] } = await query(
      'SELECT id, name FROM users WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!user) return error(res, 'User not found.', 404);

    const hashed = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
    await query(
      'UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2',
      [hashed, id]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', id,
      null, { action: 'password_reset_by_admin' });

    return success(res, null, 'Password reset successfully.');
  } catch (err) { next(err); }
};

// ── toggleStatus ──────────────────────────────────────────────────────────────

const toggleStatus = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    if (id === req.user.id) return error(res, 'You cannot change your own status.', 400);

    const { rows: [user] } = await query(
      'SELECT id, is_active, name FROM users WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!user) return error(res, 'User not found.', 404);

    const newStatus = !user.is_active;
    await query(
      'UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2',
      [newStatus, id]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', id,
      { is_active: user.is_active }, { is_active: newStatus });

    return success(res, { is_active: newStatus }, `User ${newStatus ? 'activated' : 'deactivated'} successfully.`);
  } catch (err) { next(err); }
};

// ── updateAvatar ──────────────────────────────────────────────────────────────

const updateAvatar = async (req, res, next) => {
  try {
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!avatarPath) return error(res, 'No file uploaded.', 400);

    await query(
      'UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
      [avatarPath, req.user.id, req.companyId]
    );
    return success(res, { avatar: avatarPath }, 'Avatar updated.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove, resetPassword, toggleStatus, updateAvatar };
