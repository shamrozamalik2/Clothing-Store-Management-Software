'use strict';

const mongoose     = require('mongoose');
const StockAdj     = require('../models/StockAdjustment');
const Product      = require('../models/Product');
const User         = require('../models/User');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

async function generateReference(companyId, session) {
  const date = new Date();
  const ymd  = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = `ADJ-${ymd}-`;
  const last = await StockAdj.findOne({ company_id: companyId, reference: { $regex: `^${prefix}` } }, { reference: 1 })
    .sort({ _id: -1 }).session(session).lean();
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', type = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filter = { company_id: cid };
    if (type) filter.type = type;
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) filter.created_at.$gte = new Date(date_from + 'T00:00:00.000Z');
      if (date_to)   filter.created_at.$lte = new Date(date_to   + 'T23:59:59.999Z');
    }

    // If searching by user name, find matching user IDs first
    let userFilter = null;
    if (search) {
      const matchUsers = await User.find({ company_id: cid, name: { $regex: search, $options: 'i' } }, { _id: 1 }).lean();
      const userIds    = matchUsers.map(u => u._id);
      filter.$or = [{ reference: { $regex: search, $options: 'i' } }, { created_by: { $in: userIds } }];
    }

    const [total, adjustments] = await Promise.all([
      StockAdj.countDocuments(filter),
      StockAdj.find(filter).select('-items').sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);

    const userIds = [...new Set(adjustments.map(a => a.created_by?.toString()).filter(Boolean))];
    const users   = await User.find({ _id: { $in: userIds } }, { name: 1 }).lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    const rows = adjustments.map(a => ({ ...a, id: a._id.toString(), created_by_name: a.created_by ? userMap[a.created_by.toString()] || null : null }));
    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const adj = await StockAdj.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!adj) return error(res, 'Adjustment not found.', 404);

    const user = await User.findById(adj.created_by, { name: 1 }).lean();
    return success(res, { ...adj, id: adj._id.toString(), created_by_name: user?.name || null });
  } catch (err) { next(err); }
};

// ─── create ───────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { type = 'adjustment', reason, notes, items = [] } = req.body;

    const VALID_TYPES = ['adjustment', 'damage', 'loss', 'return'];
    if (!VALID_TYPES.includes(type)) return error(res, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}.`, 422);

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems?.length) return error(res, 'At least one item is required.', 422);

    let adjDoc;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const reference = await generateReference(cid, session);
        const lineItems = [];

        for (const item of parsedItems) {
          const productId = item.product_id;
          const variantId = item.variant_id || null;
          const qty       = parseFloat(item.quantity) || 0;

          let currentStock, productName, productSku;

          const product = await Product.findOne({ _id: productId, company_id: cid }).session(session).lean();
          if (!product) throw new Error(`Product ID ${productId} not found.`);

          if (variantId) {
            const variant = product.variants?.find(v => v._id.toString() === variantId);
            if (!variant) throw new Error(`Variant ID ${variantId} not found.`);
            currentStock = parseFloat(variant.stock_quantity);
            productName  = product.name;
            productSku   = variant.sku;
          } else {
            currentStock = parseFloat(product.stock_quantity);
            productName  = product.name;
            productSku   = product.sku;
          }

          const newQty = Math.max(0, currentStock + qty);

          lineItems.push({
            product_id:        product._id,
            variant_id:        variantId || null,
            product_name:      productName,
            sku:               productSku,
            quantity_before:   currentStock,
            quantity_adjusted: qty,
            quantity_after:    newQty,
            unit_cost:         item.unit_cost ? parseFloat(item.unit_cost) : 0,
          });

          if (variantId) {
            await Product.updateOne(
              { _id: product._id, company_id: cid, 'variants._id': variantId },
              { $set: { 'variants.$.stock_quantity': newQty, updated_at: new Date() } },
              { session }
            );
          } else {
            await Product.updateOne(
              { _id: product._id, company_id: cid },
              { $set: { stock_quantity: newQty, updated_at: new Date() } },
              { session }
            );
          }
        }

        const [newAdj] = await StockAdj.create([{
          company_id: cid,
          reference,
          type,
          reason:     reason?.trim() || null,
          notes:      notes?.trim()  || null,
          created_by: req.user.id,
          items:      lineItems,
        }], { session });

        adjDoc = newAdj;
      });
    } catch (txErr) {
      session.endSession();
      return error(res, txErr.message, 422);
    }
    session.endSession();

    const user = await User.findById(req.user.id, { name: 1 }).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'stock_adjustments', adjDoc._id.toString(), null, { reference: adjDoc.reference });
    return created(res, { ...adjDoc.toJSON(), id: adjDoc._id.toString(), created_by_name: user?.name || null }, 'Stock adjustment created successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create };
