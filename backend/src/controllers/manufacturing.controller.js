'use strict';

const mongoose        = require('mongoose');
const BOM             = require('../models/BillOfMaterials');
const ProductionBatch = require('../models/ProductionBatch');
const Product         = require('../models/Product');
const User            = require('../models/User');
const { success, created, error }       = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../config/constants');

async function genBatchRef(companyId, session) {
  const d      = new Date();
  const prefix = `PRD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-`;
  const last   = await ProductionBatch.findOne({ company_id: companyId, reference: { $regex: `^${prefix}` } }, { reference: 1 })
    .sort({ _id: -1 }).session(session).lean();
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── BOM endpoints ──────────────────────────────────────────────────────────────

exports.listBOM = async (req, res, next) => {
  try {
    const cid       = req.companyId;
    const productId = req.query.product_id;

    const filter = { company_id: cid };
    if (productId) filter.product_id = productId;

    const boms = await BOM.find(filter)
      .populate('product_id', 'name sku unit')
      .populate('raw_material_id', 'name sku unit stock_quantity cost_price')
      .lean();

    const data = boms.map(b => ({
      id:                    b._id.toString(),
      product_id:            b.product_id?._id?.toString(),
      product_name:          b.product_id?.name,
      product_sku:           b.product_id?.sku,
      product_unit:          b.product_id?.unit,
      raw_material_id:       b.raw_material_id?._id?.toString(),
      raw_material_name:     b.raw_material_id?.name,
      raw_material_sku:      b.raw_material_id?.sku,
      raw_material_stock:    b.raw_material_id?.stock_quantity,
      raw_material_unit:     b.raw_material_id?.unit,
      raw_material_cost:     b.raw_material_id?.cost_price,
      quantity_required:     b.quantity_required,
      unit:                  b.unit,
    }));

    return success(res, data);
  } catch (err) { next(err); }
};

exports.getBOM = async (req, res, next) => {
  try {
    const bom = await BOM.findOne({ _id: req.params.id, company_id: req.companyId })
      .populate('product_id', 'name')
      .populate('raw_material_id', 'name stock_quantity cost_price')
      .lean();
    if (!bom) return error(res, 'BOM entry not found.', 404);
    return success(res, { ...bom, id: bom._id.toString() });
  } catch (err) { next(err); }
};

exports.createBOM = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { product_id, raw_material_id, quantity_required, unit } = req.body;
    if (!product_id || !raw_material_id || !quantity_required) {
      return error(res, 'product_id, raw_material_id, quantity_required are required.', 422);
    }

    const bom = await BOM.findOneAndUpdate(
      { company_id: cid, product_id, raw_material_id },
      { quantity_required, unit: unit || null, updated_at: new Date() },
      { upsert: true, new: true }
    ).lean();

    return created(res, { ...bom, id: bom._id.toString() }, 'BOM entry saved.');
  } catch (err) { next(err); }
};

exports.deleteBOM = async (req, res, next) => {
  try {
    const deleted = await BOM.findOneAndDelete({ _id: req.params.id, company_id: req.companyId });
    if (!deleted) return error(res, 'BOM entry not found.', 404);
    return success(res, null, 'BOM entry deleted.');
  } catch (err) { next(err); }
};

exports.listProducts = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const type = req.query.type;

    const filter = { company_id: cid, is_active: true };
    if (type === 'finished') filter.is_finished_good = true;
    if (type === 'raw')      filter.is_raw_material  = true;

    const products = await Product.find(filter, { name: 1, sku: 1, unit: 1, cost_price: 1, stock_quantity: 1, is_raw_material: 1, is_finished_good: 1 }).sort({ name: 1 }).lean();

    const productIds = products.map(p => p._id);
    const bomCounts  = await BOM.aggregate([
      { $match: { company_id: cid, product_id: { $in: productIds } } },
      { $group: { _id: '$product_id', count: { $sum: 1 } } },
    ]);
    const bomMap = Object.fromEntries(bomCounts.map(b => [b._id.toString(), b.count]));

    return success(res, products.map(p => ({ ...p, id: p._id.toString(), bom_count: bomMap[p._id.toString()] || 0 })));
  } catch (err) { next(err); }
};

// ── Production Batches ─────────────────────────────────────────────────────────

exports.listBatches = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', date_from = '', date_to = '' } = req.query;

    const filter = { company_id: cid };
    if (date_from || date_to) {
      filter.batch_date = {};
      if (date_from) filter.batch_date.$gte = new Date(date_from);
      if (date_to)   filter.batch_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    let productFilter = null;
    if (search) {
      const matchProds = await Product.find({ company_id: cid, name: { $regex: search, $options: 'i' } }, { _id: 1 }).lean();
      const prodIds    = matchProds.map(p => p._id);
      filter.$or = [{ reference: { $regex: search, $options: 'i' } }, { product_id: { $in: prodIds } }];
    }

    const [total, batches] = await Promise.all([
      ProductionBatch.countDocuments(filter),
      ProductionBatch.find(filter).select('-materials').sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);

    const prodIds = [...new Set(batches.map(b => b.product_id?.toString()).filter(Boolean))];
    const userIds = [...new Set(batches.map(b => b.created_by?.toString()).filter(Boolean))];
    const [prods, users] = await Promise.all([
      Product.find({ _id: { $in: prodIds } }, { name: 1, sku: 1, unit: 1 }).lean(),
      User.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
    ]);
    const prodMap = Object.fromEntries(prods.map(p => [p._id.toString(), p]));
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    const rows = batches.map(b => {
      const p = b.product_id ? prodMap[b.product_id.toString()] : null;
      return {
        ...b, id: b._id.toString(),
        product_name: p?.name || null, product_sku: p?.sku || null, product_unit: p?.unit || null,
        created_by_name: b.created_by ? userMap[b.created_by.toString()] || null : null,
      };
    });

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

exports.getBatch = async (req, res, next) => {
  try {
    const batch = await ProductionBatch.findOne({ _id: req.params.id, company_id: req.companyId })
      .populate('product_id', 'name sku')
      .populate('created_by', 'name')
      .lean();
    if (!batch) return error(res, 'Production batch not found.', 404);

    return success(res, {
      ...batch,
      id:              batch._id.toString(),
      product_name:    batch.product_id?.name,
      product_sku:     batch.product_id?.sku,
      created_by_name: batch.created_by?.name,
    });
  } catch (err) { next(err); }
};

exports.createBatch = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { product_id, quantity_produced, batch_date, notes } = req.body;
    const qty = parseFloat(quantity_produced) || 0;

    if (!product_id || qty <= 0) return error(res, 'product_id and quantity_produced are required.', 422);

    const boms = await BOM.find({ company_id: cid, product_id })
      .populate('raw_material_id', 'name cost_price stock_quantity track_inventory')
      .lean();

    if (!boms.length) return error(res, 'No BOM defined for this product. Add raw materials first.', 422);

    // Validate stock before starting transaction
    for (const bom of boms) {
      const needed = parseFloat(bom.quantity_required) * qty;
      const rm     = bom.raw_material_id;
      if (rm?.track_inventory && parseFloat(rm.stock_quantity) < needed) {
        return error(res, `Insufficient stock for "${rm.name}" (need ${needed}, have ${rm.stock_quantity}).`, 422);
      }
    }

    let batchDoc;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const reference    = await genBatchRef(cid, session);
        let productionCost = 0;
        const materials    = [];

        for (const bom of boms) {
          const rm     = bom.raw_material_id;
          const needed = parseFloat(bom.quantity_required) * qty;
          const cost   = needed * parseFloat(rm?.cost_price || 0);
          productionCost += cost;

          await Product.updateOne({ _id: rm._id, company_id: cid }, { $inc: { stock_quantity: -needed }, $set: { updated_at: new Date() } }, { session });
          materials.push({ product_id: rm._id, product_name: rm.name, quantity_used: needed, unit_cost: parseFloat(rm.cost_price || 0), total_cost: cost });
        }

        const unitCost = productionCost / qty;

        const [newBatch] = await ProductionBatch.create([{
          company_id:       cid,
          product_id,
          reference,
          quantity_produced: qty,
          production_cost:   productionCost,
          batch_date:        batch_date ? new Date(batch_date) : new Date(),
          status:            'completed',
          notes:             notes || null,
          created_by:        req.user.id,
          materials,
        }], { session });

        // Add finished goods, update cost price
        await Product.updateOne({ _id: product_id, company_id: cid }, { $inc: { stock_quantity: qty }, $set: { cost_price: unitCost, updated_at: new Date() } }, { session });

        batchDoc = newBatch;
      });
    } catch (txErr) {
      session.endSession();
      return error(res, txErr.message, 422);
    }
    session.endSession();

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'production_batches', batchDoc._id.toString(), null, { product_id, qty });
    return created(res, { ...batchDoc.toJSON(), id: batchDoc._id.toString() }, 'Production batch recorded successfully.');
  } catch (err) { next(err); }
};
