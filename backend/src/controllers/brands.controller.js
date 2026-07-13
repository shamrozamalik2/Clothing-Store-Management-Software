'use strict';

const { validationResult }            = require('express-validator');
const { query }                       = require('../config/database');
const { toSlug, uniqueSlug }          = require('../utils/slug');
const { AUDIT_ACTIONS }               = require('../config/constants');
const { success, created, error }     = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit }                    = require('../utils/audit');

const PRODUCT_COUNT_SUB = `
  (SELECT COUNT(*) FROM products
   WHERE brand_id = b.id AND is_active = TRUE AND company_id = b.company_id)
`;

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;

    if (req.query.flat === '1') {
      const { rows } = await query(
        'SELECT id, name, slug FROM brands WHERE company_id = $1 AND is_active = TRUE ORDER BY name ASC',
        [cid]
      );
      return success(res, rows);
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', status = '' } = req.query;

    const params = [cid];
    const where  = ['b.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`b.name ILIKE $${params.length}`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`b.is_active = $${params.length}`);
    }

    const wStr = where.join(' AND ');

    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM brands b WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT b.*, ${PRODUCT_COUNT_SUB} AS product_count
      FROM brands b
      WHERE ${wStr}
      ORDER BY b.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [row] } = await query(`
      SELECT b.*, ${PRODUCT_COUNT_SUB} AS product_count
      FROM brands b
      WHERE b.id = $1 AND b.company_id = $2
    `, [req.params.id, req.companyId]);
    if (!row) return error(res, 'Brand not found.', 404);
    return success(res, row);
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid  = req.companyId;
    const { name, description = null } = req.body;
    const slug = await uniqueSlug('brands', cid, toSlug(name.trim()));
    const logo = req.file ? `/uploads/brands/${req.file.filename}` : null;

    const { rows: [row] } = await query(`
      INSERT INTO brands (company_id, name, slug, description, logo, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `, [cid, name.trim(), slug, description, logo]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'brands', row.id, { name: row.name });
    return created(res, row, 'Brand created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT * FROM brands WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Brand not found.', 404);

    const { name, description, is_active } = req.body;
    const newName  = name ? name.trim() : existing.name;
    const newSlug  = name ? await uniqueSlug('brands', cid, toSlug(newName), id) : existing.slug;
    const newLogo  = req.file ? `/uploads/brands/${req.file.filename}` : existing.logo;
    const newActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;

    const { rows: [updated] } = await query(`
      UPDATE brands
      SET name=$3, slug=$4, description=$5, logo=$6, is_active=$7, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [id, cid, newName, newSlug,
        description !== undefined ? description : existing.description,
        newLogo, newActive]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'brands', id,
      { name: existing.name }, { name: updated.name });
    return success(res, updated, 'Brand updated successfully.');
  } catch (err) { next(err); }
};

// ── remove ────────────────────────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [brand] } = await query(
      'SELECT * FROM brands WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!brand) return error(res, 'Brand not found.', 404);

    const { rows: [{ cnt }] } = await query(
      'SELECT COUNT(*) AS cnt FROM products WHERE brand_id = $1 AND company_id = $2',
      [id, cid]
    );
    if (parseInt(cnt, 10) > 0) return error(res, `Cannot delete: ${cnt} product(s) use this brand.`, 409);

    await query('DELETE FROM brands WHERE id = $1 AND company_id = $2', [id, cid]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'brands', id, { name: brand.name });
    return success(res, null, 'Brand deleted successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };
