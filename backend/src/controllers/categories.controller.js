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
   WHERE category_id = c.id AND is_active = TRUE AND company_id = c.company_id)
`;
const SELECT_COLS = `
  c.*, p.name AS parent_name, ${PRODUCT_COUNT_SUB} AS product_count
`;

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;

    if (req.query.flat === '1') {
      const { rows } = await query(`
        SELECT c.id, c.name, c.parent_id, c.is_active, p.name AS parent_name
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        WHERE c.company_id = $1 AND c.is_active = TRUE
        ORDER BY COALESCE(p.name,'') ASC, c.name ASC
      `, [cid]);
      return success(res, rows);
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', status = '', parent = '' } = req.query;

    const params = [cid];
    const where  = ['c.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`c.is_active = $${params.length}`);
    }
    if (parent !== '') {
      if (parent === 'root') {
        where.push('c.parent_id IS NULL');
      } else {
        params.push(parseInt(parent, 10));
        where.push(`c.parent_id = $${params.length}`);
      }
    }

    const wStr = where.join(' AND ');

    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM categories c WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT ${SELECT_COLS}
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
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
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [row] } = await query(`
      SELECT ${SELECT_COLS}
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
      WHERE c.id = $1 AND c.company_id = $2
    `, [id, cid]);
    if (!row) return error(res, 'Category not found.', 404);

    const { rows: children } = await query(
      'SELECT id, name FROM categories WHERE parent_id = $1 AND company_id = $2',
      [id, cid]
    );
    return success(res, { ...row, children });
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const { name, description = null, parent_id = null } = req.body;

    if (parent_id) {
      const { rows } = await query(
        'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
        [parent_id, cid]
      );
      if (!rows[0]) return error(res, 'Parent category not found.', 400);
    }

    const slug  = await uniqueSlug('categories', cid, toSlug(name.trim()));
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const { rows: [row] } = await query(`
      INSERT INTO categories (company_id, name, slug, description, parent_id, image, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `, [cid, name.trim(), slug, description, parent_id || null, image]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'categories', row.id, { name: row.name });
    return created(res, row, 'Category created successfully.');
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
      'SELECT * FROM categories WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Category not found.', 404);

    const { name, description, parent_id, is_active } = req.body;

    if (parent_id && parseInt(parent_id, 10) === id) {
      return error(res, 'A category cannot be its own parent.', 400);
    }

    const newName  = name ? name.trim() : existing.name;
    const newSlug  = name ? await uniqueSlug('categories', cid, toSlug(newName), id) : existing.slug;
    const newImage = req.file ? `/uploads/categories/${req.file.filename}` : existing.image;
    const newActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;
    const newParent = parent_id !== undefined ? (parent_id || null) : existing.parent_id;

    const { rows: [updated] } = await query(`
      UPDATE categories
      SET name=$3, slug=$4, description=$5, parent_id=$6, image=$7, is_active=$8, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [id, cid, newName, newSlug,
        description !== undefined ? description : existing.description,
        newParent, newImage, newActive]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'categories', id,
      { name: existing.name }, { name: updated.name });
    return success(res, updated, 'Category updated successfully.');
  } catch (err) { next(err); }
};

// ── remove ────────────────────────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [cat] } = await query(
      'SELECT * FROM categories WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!cat) return error(res, 'Category not found.', 404);

    const { rows: [{ p }] } = await query(
      'SELECT COUNT(*) AS p FROM products WHERE category_id = $1 AND company_id = $2',
      [id, cid]
    );
    const { rows: [{ c }] } = await query(
      'SELECT COUNT(*) AS c FROM categories WHERE parent_id = $1 AND company_id = $2',
      [id, cid]
    );

    if (parseInt(p, 10) > 0) return error(res, `Cannot delete: ${p} product(s) use this category.`, 409);
    if (parseInt(c, 10) > 0) return error(res, `Cannot delete: ${c} subcategorie(s) exist here.`, 409);

    await query('DELETE FROM categories WHERE id = $1 AND company_id = $2', [id, cid]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'categories', id, { name: cat.name });
    return success(res, null, 'Category deleted successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };
