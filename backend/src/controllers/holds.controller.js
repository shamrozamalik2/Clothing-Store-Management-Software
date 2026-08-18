'use strict';

const { query } = require('../config/database');
const { success, created, error } = require('../utils/response');

// GET /holds
exports.list = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT h.*, u.name AS user_name FROM cart_holds h
      LEFT JOIN users u ON u.id = h.user_id
      WHERE h.company_id=$1 ORDER BY h.created_at DESC
    `, [req.companyId]);
    return success(res, rows);
  } catch (err) { next(err); }
};

// POST /holds
exports.create = async (req, res, next) => {
  try {
    const { label, cart_data } = req.body;
    if (!cart_data) return error(res, 'cart_data is required.', 422);

    const { rows: [hold] } = await query(`
      INSERT INTO cart_holds (company_id, user_id, label, cart_data)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [req.companyId, req.user.id, label || null, typeof cart_data === 'string' ? cart_data : JSON.stringify(cart_data)]);

    return created(res, hold, 'Cart saved.');
  } catch (err) { next(err); }
};

// DELETE /holds/:id
exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM cart_holds WHERE id=$1 AND company_id=$2', [req.params.id, req.companyId]
    );
    if (!rowCount) return error(res, 'Hold not found.', 404);
    return success(res, null, 'Hold deleted.');
  } catch (err) { next(err); }
};
