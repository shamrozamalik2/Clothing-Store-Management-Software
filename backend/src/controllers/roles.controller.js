'use strict';

const { validationResult } = require('express-validator');
const { query }            = require('../config/database');
const { AUDIT_ACTIONS }    = require('../config/constants');
const { success, error }   = require('../utils/response');
const { logAudit }         = require('../utils/audit');

const list = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT r.id, r.name, r.label, r.permissions, r.is_system,
             COUNT(u.id) AS user_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id AND u.is_active = TRUE
      WHERE r.company_id = $1
      GROUP BY r.id
      ORDER BY r.id
    `, [req.companyId]);
    // permissions is JSONB — pg returns it already parsed
    return success(res, rows);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const { rows: [role] } = await query(
      'SELECT * FROM roles WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!role) return error(res, 'Role not found.', 404);
    return success(res, role);
  } catch (err) { next(err); }
};

const updatePermissions = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [role] } = await query(
      'SELECT * FROM roles WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!role) return error(res, 'Role not found.', 404);
    if (role.name === 'admin') return error(res, 'Admin permissions cannot be modified.', 403);

    const { permissions } = req.body;
    const oldPerms = role.permissions;

    const { rows: [updated] } = await query(`
      UPDATE roles SET permissions=$3::jsonb, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [id, cid, JSON.stringify(permissions)]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'roles', id, oldPerms, permissions);
    return success(res, updated, 'Permissions updated.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, updatePermissions };
