'use strict';

const { query } = require('../config/database');
const { success } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// GET /audit
exports.list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { action = '', entity = '', user_id = '', date_from = '', date_to = '' } = req.query;

    const params = [cid];
    const where  = ['a.company_id = $1'];
    if (action)    { params.push(`%${action}%`);    where.push(`a.action ILIKE $${params.length}`); }
    if (entity)    { params.push(entity);            where.push(`a.entity = $${params.length}`); }
    if (user_id)   { params.push(parseInt(user_id)); where.push(`a.user_id = $${params.length}`); }
    if (date_from) { params.push(date_from);         where.push(`a.created_at::date >= $${params.length}`); }
    if (date_to)   { params.push(date_to);           where.push(`a.created_at::date <= $${params.length}`); }

    const w = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM audit_logs a WHERE ${w}`, params
    );

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id AND u.company_id = a.company_id
      WHERE ${w}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(parseInt(cnt, 10), page, limit) });
  } catch (err) { next(err); }
};
