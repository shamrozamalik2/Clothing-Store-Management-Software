'use strict';

const { validationResult }            = require('express-validator');
const Brand    = require('../models/Brand');
const Product  = require('../models/Product');
const { AUDIT_ACTIONS }               = require('../config/constants');
const { success, created, error }     = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit }                    = require('../utils/audit');

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;

    if (req.query.flat === '1') {
      const brands = await Brand.find({ company_id: cid, is_active: true }, { name: 1 }).sort({ name: 1 }).lean();
      return success(res, brands.map(b => ({ id: b._id.toString(), name: b.name })));
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', status = '' } = req.query;

    const filter = { company_id: cid };
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (status !== '') filter.is_active = status === 'active';

    const [total, brands] = await Promise.all([
      Brand.countDocuments(filter),
      Brand.find(filter).sort({ name: 1 }).skip(offset).limit(limit).lean(),
    ]);

    const brandIds = brands.map(b => b._id);
    const prodCounts = await Product.aggregate([
      { $match: { company_id: cid, brand_id: { $in: brandIds }, is_active: true } },
      { $group: { _id: '$brand_id', count: { $sum: 1 } } },
    ]);
    const cntMap = Object.fromEntries(prodCounts.map(r => [r._id.toString(), r.count]));

    const rows = brands.map(b => ({ ...b, id: b._id.toString(), product_count: cntMap[b._id.toString()] || 0 }));
    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!brand) return error(res, 'Brand not found.', 404);
    const product_count = await Product.countDocuments({ company_id: req.companyId, brand_id: brand._id });
    return success(res, { ...brand, id: brand._id.toString(), product_count });
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const { name, description = null } = req.body;
    const logo = req.file ? `/uploads/brands/${req.file.filename}` : null;

    const brand = await Brand.create({ company_id: cid, name: name.trim(), description, logo, is_active: true });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'brands', brand._id.toString(), { name: brand.name });
    return created(res, { ...brand.toJSON(), id: brand._id.toString() }, 'Brand created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const existing = await Brand.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!existing) return error(res, 'Brand not found.', 404);

    const { name, description, is_active } = req.body;
    const upd = {};
    if (name        !== undefined) upd.name        = name.trim();
    if (description !== undefined) upd.description = description;
    if (is_active   !== undefined) upd.is_active   = is_active !== false && is_active !== 'false';
    if (req.file)                  upd.logo         = `/uploads/brands/${req.file.filename}`;
    upd.updated_at = new Date();

    const updated = await Brand.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'brands', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Brand updated successfully.');
  } catch (err) { next(err); }
};

// ── remove ────────────────────────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const brand = await Brand.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!brand) return error(res, 'Brand not found.', 404);

    const cnt = await Product.countDocuments({ company_id: cid, brand_id: brand._id });
    if (cnt > 0) return error(res, `Cannot delete: ${cnt} product(s) use this brand.`, 409);

    await Brand.findByIdAndDelete(req.params.id);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'brands', req.params.id, { name: brand.name });
    return success(res, null, 'Brand deleted successfully.');
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
        const exists = await Brand.findOne({ company_id: cid, name });
        if (!exists) {
          await Brand.create({ company_id: cid, name, description: row.description || null, is_active: toBoolean(row.is_active, true) });
        }
        imported++;
      } catch (e) { errors.push({ row: line, message: e.message }); }
    }

    await logAudit(cid, req.user.id, 'IMPORT', 'brands', null, { imported, failed: errors.length });
    return success(res, { imported, failed: errors.length, errors }, `${imported} brands imported.`);
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove, importCsv };
