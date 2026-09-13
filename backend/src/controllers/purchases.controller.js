'use strict';

const mongoose  = require('mongoose');
const Purchase  = require('../models/Purchase');
const PurchasePayment = require('../models/PurchasePayment');
const Product   = require('../models/Product');
const Supplier  = require('../models/Supplier');
const User      = require('../models/User');
const { success, created, error }   = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

async function generateReference(companyId, session) {
  const now    = new Date();
  const ymd    = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `PUR-${ymd}-`;
  const last   = await Purchase.findOne({ company_id: companyId, reference: { $regex: `^${prefix}` } }, { reference: 1 })
    .sort({ _id: -1 }).session(session).lean();
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function populatePurchases(purchases) {
  const suppIds = [...new Set(purchases.map(p => p.supplier_id?.toString()).filter(Boolean))];
  const userIds = [...new Set(purchases.map(p => p.created_by?.toString()).filter(Boolean))];
  const [supps, users] = await Promise.all([
    Supplier.find({ _id: { $in: suppIds } }, { name: 1, phone: 1 }).lean(),
    User.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
  ]);
  const sMap = Object.fromEntries(supps.map(s => [s._id.toString(), s]));
  const uMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
  return purchases.map(p => ({
    ...p,
    id:               p._id.toString(),
    supplier_name:    p.supplier_id ? sMap[p.supplier_id.toString()]?.name  : null,
    supplier_phone:   p.supplier_id ? sMap[p.supplier_id.toString()]?.phone : null,
    created_by_name:  p.created_by  ? uMap[p.created_by.toString()]?.name   : null,
  }));
}

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', supplier = '', status = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filter = { company_id: cid };
    if (status)   filter.status      = status;
    if (supplier) filter.supplier_id = supplier;
    if (date_from || date_to) {
      filter.purchase_date = {};
      if (date_from) filter.purchase_date.$gte = new Date(date_from);
      if (date_to)   filter.purchase_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    if (search) {
      const suppIds = await Supplier.find({ company_id: cid, name: { $regex: search, $options: 'i' } }, { _id: 1 }).lean().then(r => r.map(s => s._id));
      filter.$or = [{ reference: { $regex: search, $options: 'i' } }, { supplier_id: { $in: suppIds } }];
    }

    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(filter),
      Purchase.find(filter).select('-items').sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);

    const rows = await populatePurchases(purchases);
    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!purchase) return error(res, 'Purchase not found.', 404);
    const [populated] = await populatePurchases([purchase]);
    const payments = await PurchasePayment.find({ purchase_id: purchase._id }).lean();
    return success(res, { ...populated, payments: payments.map(p => ({ ...p, id: p._id.toString() })) });
  } catch (err) { next(err); }
};

const createPurchase = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const body = req.body;
    const parsedItems = typeof body.items === 'string' ? JSON.parse(body.items) : (body.items || []);
    if (!parsedItems.length) return error(res, 'At least one item is required.', 422);

    let purchaseDoc;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const reference = await generateReference(cid, session);
        let subtotal = 0, taxTotal = 0, discTotal = 0;
        const lineItems = [];

        for (const item of parsedItems) {
          const product = await Product.findOne({ _id: item.product_id, company_id: cid }).session(session).lean();
          if (!product) throw new Error(`Product ${item.product_id} not found.`);
          const qty  = parseFloat(item.quantity)  || 0;
          const cost = parseFloat(item.unit_cost)  || 0;
          const disc = parseFloat(item.discount)   || 0;
          const tax  = parseFloat(item.tax_amount) || 0;
          const tot  = qty * cost - disc + tax;
          subtotal  += qty * cost;
          taxTotal  += tax;
          discTotal += disc;
          lineItems.push({ product_id: product._id, variant_id: item.variant_id || null, product_name: product.name, sku: product.sku, quantity: qty, unit_cost: cost, discount: disc, tax_amount: tax, total: tot });
        }

        const total  = subtotal - discTotal + taxTotal;
        const paid   = parseFloat(body.paid_amount) || 0;
        const status = body.status || 'ordered';

        const [newPurchase] = await Purchase.create([{
          company_id:      cid,
          branch_id:       body.branch_id   || null,
          supplier_id:     body.supplier_id  || null,
          reference,
          status,
          purchase_date:   body.purchase_date ? new Date(body.purchase_date) : new Date(),
          due_date:        body.due_date      ? new Date(body.due_date)      : null,
          subtotal,
          tax_amount:      taxTotal,
          discount_amount: discTotal,
          total_amount:    total,
          paid_amount:     paid,
          due_amount:      Math.max(0, total - paid),
          notes:           body.notes || null,
          created_by:      req.user.id,
          items:           lineItems,
        }], { session });

        // Update stock if received
        if (status === 'received') {
          for (const li of lineItems) {
            if (li.variant_id) {
              await Product.updateOne(
                { _id: li.product_id, company_id: cid, 'variants._id': li.variant_id },
                { $inc: { 'variants.$.stock_quantity': li.quantity, cost_price: 0 }, $set: { updated_at: new Date() } },
                { session }
              );
            } else {
              await Product.updateOne(
                { _id: li.product_id, company_id: cid },
                { $inc: { stock_quantity: li.quantity }, $set: { cost_price: li.unit_cost, updated_at: new Date() } },
                { session }
              );
            }
          }
        }

        purchaseDoc = newPurchase;
      });
    } catch (txErr) {
      session.endSession();
      return error(res, txErr.message, 422);
    }
    session.endSession();

    const purchase = await Purchase.findById(purchaseDoc._id).lean();
    const [populated] = await populatePurchases([purchase]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'purchases', purchaseDoc._id.toString());
    return created(res, populated, 'Purchase created.');
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const cid      = req.companyId;
    const purchase = await Purchase.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!purchase) return error(res, 'Purchase not found.', 404);

    const { status } = req.body;
    if (!status) return error(res, 'Status is required.', 422);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const wasReceived  = purchase.status === 'received';
        const nowReceived  = status === 'received';

        if (!wasReceived && nowReceived) {
          for (const li of purchase.items) {
            if (li.variant_id) {
              await Product.updateOne(
                { _id: li.product_id, company_id: cid, 'variants._id': li.variant_id },
                { $inc: { 'variants.$.stock_quantity': li.quantity } },
                { session }
              );
            } else {
              await Product.updateOne(
                { _id: li.product_id, company_id: cid },
                { $inc: { stock_quantity: li.quantity }, $set: { cost_price: li.unit_cost } },
                { session }
              );
            }
          }
        }

        await Purchase.updateOne({ _id: purchase._id }, { status, updated_at: new Date() }, { session });
      });
    } finally {
      session.endSession();
    }

    const updated = await Purchase.findById(req.params.id).lean();
    const [populated] = await populatePurchases([updated]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'purchases', req.params.id, { status: purchase.status }, { status });
    return success(res, populated, 'Purchase status updated.');
  } catch (err) { next(err); }
};

const addPayment = async (req, res, next) => {
  try {
    const cid      = req.companyId;
    const purchase = await Purchase.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!purchase) return error(res, 'Purchase not found.', 404);

    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) return error(res, 'Amount must be > 0.', 422);

    const due = parseFloat(purchase.due_amount);
    if (due <= 0) return error(res, 'No outstanding balance.', 409);

    const pay       = Math.min(amount, due);
    const remaining = parseFloat((due - pay).toFixed(4));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await PurchasePayment.create([{
          company_id:     cid,
          purchase_id:    purchase._id,
          amount:         pay,
          payment_method: req.body.payment_method || 'cash',
          reference:      req.body.reference || null,
          notes:          req.body.notes     || null,
          created_by:     req.user.id,
        }], { session });

        await Purchase.updateOne(
          { _id: purchase._id },
          { $inc: { paid_amount: pay }, $set: { due_amount: remaining, updated_at: new Date() } },
          { session }
        );
      });
    } finally {
      session.endSession();
    }

    return success(res, { collected: pay, remaining }, 'Payment recorded.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, createPurchase, updateStatus, addPayment };
