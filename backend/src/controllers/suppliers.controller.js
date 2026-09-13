'use strict';

const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', status = '' } = req.query;

    if (req.query.flat === '1') {
      const suppliers = await Supplier.find({ company_id: cid, is_active: true }, { name: 1, phone: 1, current_balance: 1 }).sort({ name: 1 }).lean();
      return success(res, suppliers.map(s => ({ id: s._id.toString(), name: s.name, phone: s.phone, current_balance: s.current_balance })));
    }

    const { page, limit, offset } = parsePagination(req.query);
    const filter = { company_id: cid };
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status !== '') filter.is_active = status === 'active';

    const [total, suppliers] = await Promise.all([
      Supplier.countDocuments(filter),
      Supplier.find(filter).sort({ name: 1 }).skip(offset).limit(limit).lean(),
    ]);

    const suppIds = suppliers.map(s => s._id);
    const purchCounts = await Purchase.aggregate([
      { $match: { company_id: cid, supplier_id: { $in: suppIds } } },
      { $group: { _id: '$supplier_id', count: { $sum: 1 } } },
    ]);
    const cntMap = Object.fromEntries(purchCounts.map(r => [r._id.toString(), r.count]));

    const rows = suppliers.map(s => ({ ...s, id: s._id.toString(), purchase_count: cntMap[s._id.toString()] || 0 }));
    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!supplier) return error(res, 'Supplier not found.', 404);
    const purchase_count = await Purchase.countDocuments({ company_id: req.companyId, supplier_id: supplier._id });
    return success(res, { ...supplier, id: supplier._id.toString(), purchase_count });
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, city, opening_balance = 0, notes } = req.body;
    if (!name?.trim()) return error(res, 'Supplier name is required.', 422);

    const bal = parseFloat(opening_balance) || 0;
    const supplier = await Supplier.create({
      company_id:      cid,
      name:            name.trim(),
      email:           email?.trim() || null,
      phone:           phone?.trim() || null,
      address:         address?.trim() || null,
      city:            city?.trim() || null,
      opening_balance: bal,
      current_balance: bal,
      notes:           notes?.trim() || null,
    });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'suppliers', supplier._id.toString(), null, { name: supplier.name });
    return created(res, { ...supplier.toJSON(), id: supplier._id.toString() }, 'Supplier created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const existing = await Supplier.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!existing) return error(res, 'Supplier not found.', 404);

    const { name, email, phone, address, city, notes, is_active } = req.body;
    const upd = {};
    if (name      !== undefined) upd.name      = name.trim();
    if (email     !== undefined) upd.email     = email?.trim() || null;
    if (phone     !== undefined) upd.phone     = phone?.trim() || null;
    if (address   !== undefined) upd.address   = address?.trim() || null;
    if (city      !== undefined) upd.city      = city?.trim() || null;
    if (notes     !== undefined) upd.notes     = notes?.trim() || null;
    if (is_active !== undefined) upd.is_active = is_active !== false && is_active !== 'false';
    upd.updated_at = new Date();

    const updated = await Supplier.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'suppliers', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Supplier updated successfully.');
  } catch (err) { next(err); }
};

// ── remove (soft deactivate) ──────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const existing = await Supplier.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!existing) return error(res, 'Supplier not found.', 404);

    const cnt = await Purchase.countDocuments({ company_id: cid, supplier_id: existing._id });
    if (cnt > 0) return error(res, 'Cannot delete supplier with existing purchases.', 409);

    await Supplier.findByIdAndUpdate(req.params.id, { is_active: false, updated_at: new Date() });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'suppliers', req.params.id, { name: existing.name });
    return success(res, null, 'Supplier deactivated successfully.');
  } catch (err) { next(err); }
};

// ── importCsv ─────────────────────────────────────────────────────────────────

const importCsv = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'CSV file is required.', 400);
    const cid = req.companyId;
    const { parseCsvBuffer, toBoolean, toDecimal } = require('../utils/csv-parser');
    const { rows } = parseCsvBuffer(req.file.buffer);
    let imported = 0;
    const errors = [];

    for (const row of rows) {
      const line = row._line;
      try {
        if (!row.name) { errors.push({ row: line, message: 'Name is required' }); continue; }
        const ob = toDecimal(row.opening_balance, 0);
        const exists = await Supplier.findOne({ company_id: cid, name: row.name.trim() });
        if (!exists) {
          await Supplier.create({
            company_id: cid, name: row.name.trim(),
            email: row.email || null, phone: row.phone || null,
            address: row.address || null, city: row.city || null,
            opening_balance: ob, current_balance: ob,
            is_active: toBoolean(row.is_active, true), notes: row.notes || null,
          });
        }
        imported++;
      } catch (e) { errors.push({ row: line, message: e.message }); }
    }

    await logAudit(cid, req.user.id, 'IMPORT', 'suppliers', null, { imported, failed: errors.length });
    return success(res, { imported, failed: errors.length, errors }, `${imported} suppliers imported.`);
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove, importCsv };
