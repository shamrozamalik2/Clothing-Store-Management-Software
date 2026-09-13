'use strict';

const { validationResult }            = require('express-validator');
const Category  = require('../models/Category');
const Product   = require('../models/Product');
const { AUDIT_ACTIONS }               = require('../config/constants');
const { success, created, error }     = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit }                    = require('../utils/audit');

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;

    if (req.query.flat === '1') {
      const cats = await Category.find({ company_id: cid, is_active: true }, { name: 1, parent_id: 1 })
        .populate('parent_id', 'name').sort({ name: 1 }).lean();
      return success(res, cats.map(c => ({ id: c._id.toString(), name: c.name, parent_id: c.parent_id?._id?.toString() || null, parent_name: c.parent_id?.name || null, is_active: c.is_active })));
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', status = '', parent = '' } = req.query;

    const filter = { company_id: cid };
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }];
    if (status !== '') filter.is_active = status === 'active';
    if (parent === 'root')    filter.parent_id = null;
    else if (parent)          filter.parent_id = parent;

    const [total, categories] = await Promise.all([
      Category.countDocuments(filter),
      Category.find(filter).populate('parent_id', 'name').sort({ name: 1 }).skip(offset).limit(limit).lean(),
    ]);

    // Get product counts
    const catIds = categories.map(c => c._id);
    const prodCounts = await Product.aggregate([
      { $match: { company_id: cid, category_id: { $in: catIds }, is_active: true } },
      { $group: { _id: '$category_id', count: { $sum: 1 } } },
    ]);
    const cntMap = Object.fromEntries(prodCounts.map(r => [r._id.toString(), r.count]));

    const rows = categories.map(c => ({
      id:            c._id.toString(),
      name:          c.name,
      description:   c.description,
      parent_id:     c.parent_id?._id?.toString() || null,
      parent_name:   c.parent_id?.name || null,
      is_active:     c.is_active,
      product_count: cntMap[c._id.toString()] || 0,
      created_at:    c.created_at,
      updated_at:    c.updated_at,
    }));

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const cat = await Category.findOne({ _id: req.params.id, company_id: cid }).populate('parent_id', 'name').lean();
    if (!cat) return error(res, 'Category not found.', 404);

    const [productCount, children] = await Promise.all([
      Product.countDocuments({ company_id: cid, category_id: cat._id, is_active: true }),
      Category.find({ company_id: cid, parent_id: cat._id }, { name: 1 }).lean(),
    ]);

    return success(res, {
      id:            cat._id.toString(),
      name:          cat.name,
      description:   cat.description,
      is_active:     cat.is_active,
      parent_id:     cat.parent_id?._id?.toString() || null,
      parent_name:   cat.parent_id?.name || null,
      product_count: productCount,
      children:      children.map(ch => ({ id: ch._id.toString(), name: ch.name })),
    });
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const { name, description = null, parent_id = null } = req.body;
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const cat = await Category.create({ company_id: cid, name: name.trim(), description, parent_id: parent_id || null, image, is_active: true });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'categories', cat._id.toString(), { name: cat.name });
    return created(res, { ...cat.toJSON(), id: cat._id.toString() }, 'Category created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const existing = await Category.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!existing) return error(res, 'Category not found.', 404);

    const { name, description, parent_id, is_active } = req.body;

    if (parent_id && parent_id === req.params.id) return error(res, 'A category cannot be its own parent.', 400);

    const upd = {};
    if (name        !== undefined) upd.name        = name.trim();
    if (description !== undefined) upd.description = description;
    if (parent_id   !== undefined) upd.parent_id   = parent_id || null;
    if (is_active   !== undefined) upd.is_active   = is_active !== false && is_active !== 'false';
    if (req.file)                  upd.image        = `/uploads/categories/${req.file.filename}`;
    upd.updated_at = new Date();

    const updated = await Category.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'categories', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Category updated successfully.');
  } catch (err) { next(err); }
};

// ── remove ────────────────────────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const cat = await Category.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!cat) return error(res, 'Category not found.', 404);

    const [prodCnt, childCnt] = await Promise.all([
      Product.countDocuments({ company_id: cid, category_id: cat._id }),
      Category.countDocuments({ company_id: cid, parent_id: cat._id }),
    ]);

    if (prodCnt > 0)  return error(res, `Cannot delete: ${prodCnt} product(s) use this category.`, 409);
    if (childCnt > 0) return error(res, `Cannot delete: ${childCnt} subcategory(ies) exist here.`, 409);

    await Category.findByIdAndDelete(req.params.id);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'categories', req.params.id, { name: cat.name });
    return success(res, null, 'Category deleted successfully.');
  } catch (err) { next(err); }
};

// ── importCsv ─────────────────────────────────────────────────────────────────

const importCsv = async (req, res, next) => {
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
        const name = row.name.trim();
        const exists = await Category.findOne({ company_id: cid, name });
        if (!exists) {
          await Category.create({ company_id: cid, name, description: row.description || null, is_active: toBoolean(row.is_active, true) });
        }
        imported++;
      } catch (e) { errors.push({ row: line, message: e.message }); }
    }

    await logAudit(cid, req.user.id, 'IMPORT', 'categories', null, { imported, failed: errors.length });
    return success(res, { imported, failed: errors.length, errors }, `${imported} categories imported.`);
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove, importCsv };
