'use strict';

const mongoose = require('mongoose');
const Sale     = require('../models/Sale');
const Product  = require('../models/Product');
const Customer = require('../models/Customer');
const User     = require('../models/User');
const Return   = require('../models/Return');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');
const { notifySale }    = require('../utils/fcm');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function generateReference(companyId, session) {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `SAL-${ymd}-`;
  const last = await Sale.findOne({ company_id: companyId, reference: { $regex: `^${prefix}` } }, { reference: 1 })
    .sort({ _id: -1 })
    .session(session)
    .lean();
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function populateSale(sale, customerMap, userMap) {
  const cust = sale.customer_id ? customerMap[sale.customer_id.toString()] : null;
  const usr  = sale.created_by  ? userMap[sale.created_by.toString()]     : null;
  return {
    ...sale,
    id:             sale._id.toString(),
    customer_name:  cust?.name  || null,
    customer_phone: cust?.phone || null,
    cashier_name:   usr?.name   || null,
  };
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', customer = '', status = '', payment_method = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filter = { company_id: cid };
    if (status)         filter.status         = status;
    if (payment_method) filter.payment_method = payment_method;
    if (customer)       filter.customer_id    = customer;
    if (date_from || date_to) {
      filter.sale_date = {};
      if (date_from) filter.sale_date.$gte = new Date(date_from);
      if (date_to)   filter.sale_date.$lte = new Date(date_to + 'T23:59:59.999Z');
    }

    let query = Sale.find(filter).select('-items').sort({ created_at: -1 });

    if (search) {
      // Reference search done via regex; customer name requires separate lookup
      const custIds = await Customer.find(
        { company_id: cid, $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }] },
        { _id: 1 }
      ).lean().then(r => r.map(c => c._id));
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { customer_id: { $in: custIds } },
      ];
    }

    const total = await Sale.countDocuments(filter);
    const sales = await Sale.find(filter).select('-items').sort({ created_at: -1 }).skip(offset).limit(limit).lean();

    // Populate customer + user names in batch
    const custIds = [...new Set(sales.map(s => s.customer_id?.toString()).filter(Boolean))];
    const userIds = [...new Set(sales.map(s => s.created_by?.toString()).filter(Boolean))];
    const [customers, users] = await Promise.all([
      Customer.find({ _id: { $in: custIds } }, { name: 1, phone: 1 }).lean(),
      User.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
    ]);
    const customerMap = Object.fromEntries(customers.map(c => [c._id.toString(), c]));
    const userMap     = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const rows = sales.map(s => populateSale(s, customerMap, userMap));

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!sale) return error(res, 'Sale not found.', 404);

    const [cust, usr] = await Promise.all([
      sale.customer_id ? Customer.findById(sale.customer_id, { name: 1, phone: 1 }).lean() : null,
      sale.created_by  ? User.findById(sale.created_by, { name: 1 }).lean() : null,
    ]);
    return success(res, {
      ...sale,
      id:             sale._id.toString(),
      customer_name:  cust?.name  || null,
      customer_phone: cust?.phone || null,
      cashier_name:   usr?.name   || null,
    });
  } catch (err) { next(err); }
};

// ─── create (POS transaction) ─────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const {
      customer_id,
      discount_type   = 'flat',
      discount_amount = 0,
      paid_amount     = 0,
      payment_method  = 'cash',
      card_amount     = 0,
      notes,
      items = [],
    } = req.body;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems?.length) return error(res, 'At least one item is required.', 422);

    // Credit limit check
    if (customer_id && payment_method === 'credit') {
      const cust = await Customer.findOne({ _id: customer_id, company_id: cid }).lean();
      if (cust && parseFloat(cust.credit_limit) > 0) {
        const projected = parseFloat(cust.current_balance) + parseFloat(paid_amount || 0);
        if (projected > parseFloat(cust.credit_limit)) {
          return error(res, `Credit limit exceeded. Customer limit: ₨${cust.credit_limit}, current balance: ₨${cust.current_balance}.`, 422);
        }
      }
    }

    let saleDoc;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const reference = await generateReference(cid, session);
        let subtotal    = 0;
        const lineItems = [];

        for (const item of parsedItems) {
          const productId = item.product_id;
          const variantId = item.variant_id || null;
          const qty       = parseFloat(item.quantity) || 0;

          const product = await Product.findOne({ _id: productId, company_id: cid, is_active: true })
            .session(session).lean();
          if (!product) throw new Error(`Product ${productId} not found or inactive.`);

          let price, cost, taxAmt, itemDisc, lineTot, productName, sku, resolvedVariantId;

          if (variantId) {
            const variant = product.variants?.find(v => v._id.toString() === variantId.toString());
            if (!variant) throw new Error(`Variant ${variantId} not found.`);
            if (product.track_inventory && !product.allow_negative && parseFloat(variant.stock_quantity) < qty) {
              throw new Error(`Insufficient stock for variant (${variant.size ?? ''} ${variant.color ?? ''}).`.trim());
            }
            price            = parseFloat(item.unit_price ?? variant.sale_price ?? 0);
            cost             = parseFloat(variant.cost_price ?? product.cost_price ?? 0);
            itemDisc         = Math.max(0, parseFloat(item.discount) || 0);
            taxAmt           = 0;
            lineTot          = Math.max(0, qty * price - itemDisc);
            productName      = product.name;
            sku              = variant.sku;
            resolvedVariantId = variant._id;
            subtotal += lineTot;

            await Product.updateOne(
              { _id: productId, company_id: cid, 'variants._id': variant._id },
              { $inc: { 'variants.$.stock_quantity': -qty }, $set: { updated_at: new Date() } },
              { session }
            );
          } else {
            if (product.track_inventory && !product.allow_negative && parseFloat(product.stock_quantity) < qty) {
              throw new Error(`Insufficient stock for "${product.name}".`);
            }
            price       = parseFloat(item.unit_price ?? product.sale_price);
            cost        = parseFloat(product.cost_price) || 0;
            const taxRate = parseFloat(product.tax_rate) || 0;
            itemDisc    = Math.max(0, parseFloat(item.discount) || 0);
            taxAmt      = qty * price * taxRate / 100;
            lineTot     = Math.max(0, qty * price - itemDisc);
            productName = product.name;
            sku         = product.sku;
            resolvedVariantId = null;
            subtotal += lineTot;

            if (product.track_inventory) {
              await Product.updateOne(
                { _id: productId, company_id: cid },
                { $inc: { stock_quantity: -qty }, $set: { updated_at: new Date() } },
                { session }
              );
            }
          }
          lineItems.push({ productId, variantId: resolvedVariantId, qty, price, cost, taxAmt, itemDisc, lineTot, productName, sku });
        }

        const discAmt  = discount_type === 'percent'
          ? subtotal * (parseFloat(discount_amount) || 0) / 100
          : parseFloat(discount_amount) || 0;
        const taxTotal = lineItems.reduce((s, i) => s + i.taxAmt, 0);
        const total    = Math.max(0, subtotal - discAmt + taxTotal);

        const paid = payment_method === 'card'   ? total
                   : payment_method === 'credit' ? 0
                   : payment_method === 'split'  ? Math.min(total, (parseFloat(paid_amount) || 0) + (parseFloat(card_amount) || 0))
                   : parseFloat(paid_amount) || 0;

        const change = Math.max(0, paid - total);
        const due    = Math.max(0, total - paid);

        const [newSale] = await Sale.create([{
          company_id:      cid,
          customer_id:     customer_id || null,
          created_by:      req.user.id,
          reference,
          status:          'completed',
          subtotal,
          discount_amount: discAmt,
          tax_amount:      taxTotal,
          total_amount:    total,
          paid_amount:     paid,
          change_amount:   change,
          due_amount:      due,
          payment_method,
          notes:           notes?.trim() || null,
          items: lineItems.map(li => ({
            product_id:   li.productId,
            variant_id:   li.variantId,
            product_name: li.productName,
            sku:          li.sku,
            quantity:     li.qty,
            unit_price:   li.price,
            cost_price:   li.cost,
            discount:     li.itemDisc,
            tax_amount:   li.taxAmt,
            total:        li.lineTot,
          })),
        }], { session });

        if (customer_id && due > 0) {
          await Customer.updateOne(
            { _id: customer_id, company_id: cid },
            { $inc: { current_balance: due }, $set: { updated_at: new Date() } },
            { session }
          );
        }

        saleDoc = newSale;
      });
    } catch (txErr) {
      session.endSession();
      return error(res, txErr.message, 422);
    }
    session.endSession();

    const sale = await Sale.findById(saleDoc._id).lean();
    const [cust, usr] = await Promise.all([
      sale.customer_id ? Customer.findById(sale.customer_id, { name: 1, phone: 1 }).lean() : null,
      User.findById(req.user.id, { name: 1 }).lean(),
    ]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'sales', saleDoc._id.toString(), null,
      { reference: sale.reference, total: sale.total_amount });

    const out = { ...sale, id: sale._id.toString(), customer_name: cust?.name || null, customer_phone: cust?.phone || null, cashier_name: usr?.name || null };

    notifySale(cid, {
      id:             sale._id.toString(),
      reference:      sale.reference,
      customer_name:  cust?.name || null,
      cashier_name:   usr?.name  || null,
      payment_method: sale.payment_method,
      total_amount:   sale.total_amount,
      items:          sale.items.length,
    });

    return created(res, out, 'Sale completed successfully.');
  } catch (err) { next(err); }
};

// ─── void (cancel) ────────────────────────────────────────────────────────────

const voidSale = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const sale = await Sale.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!sale) return error(res, 'Sale not found.', 404);
    if (sale.status === 'cancelled') return error(res, 'Sale is already cancelled.', 409);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of sale.items) {
          const product = await Product.findById(item.product_id, { track_inventory: 1 }).lean();
          if (!product?.track_inventory) continue;

          if (item.variant_id) {
            await Product.updateOne(
              { _id: item.product_id, company_id: cid, 'variants._id': item.variant_id },
              { $inc: { 'variants.$.stock_quantity': item.quantity } },
              { session }
            );
          } else {
            await Product.updateOne(
              { _id: item.product_id, company_id: cid },
              { $inc: { stock_quantity: item.quantity } },
              { session }
            );
          }
        }

        if (sale.customer_id && parseFloat(sale.due_amount) > 0) {
          await Customer.updateOne(
            { _id: sale.customer_id, company_id: cid },
            { $inc: { current_balance: -parseFloat(sale.due_amount) } },
            { session }
          );
        }

        await Sale.updateOne({ _id: sale._id }, { status: 'cancelled', updated_at: new Date() }, { session });
      });
    } finally {
      session.endSession();
    }

    const updated = await Sale.findById(sale._id).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'sales', sale._id.toString(),
      { status: sale.status }, { status: 'cancelled' });
    return success(res, { ...updated, id: updated._id.toString() }, 'Sale cancelled and stock restored.');
  } catch (err) { next(err); }
};

// ─── today's summary ──────────────────────────────────────────────────────────

const todaySummary = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const today = new Date();
    const start = new Date(today.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const end   = new Date(today.toISOString().slice(0, 10) + 'T23:59:59.999Z');

    const [salesAgg, cogsAgg, returnsAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { company_id: req.companyId, status: 'completed', sale_date: { $gte: start, $lte: end } } },
        { $group: {
          _id:           null,
          sale_count:    { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          total_paid:    { $sum: '$paid_amount' },
          total_due:     { $sum: '$due_amount' },
        }},
      ]),
      Sale.aggregate([
        { $match: { company_id: req.companyId, status: 'completed', sale_date: { $gte: start, $lte: end } } },
        { $unwind: '$items' },
        { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.cost_price', '$items.quantity'] } } } },
      ]),
      Return.aggregate([
        { $match: { company_id: req.companyId, return_date: { $gte: start, $lte: end } } },
        { $group: { _id: null, total_refunded: { $sum: { $cond: [{ $eq: ['$type', 'return'] }, '$refund_amount', 0] } } } },
      ]),
    ]);

    const s  = salesAgg[0]  || { sale_count: 0, total_revenue: 0, total_paid: 0, total_due: 0 };
    const refunded = returnsAgg[0]?.total_refunded || 0;
    const revenue  = Math.max(0, s.total_revenue - refunded);
    const paid     = Math.max(0, s.total_paid    - refunded);

    return success(res, {
      sale_count:     s.sale_count,
      total_revenue:  revenue,
      total_paid:     paid,
      total_due:      s.total_due,
      total_refunded: refunded,
    });
  } catch (err) { next(err); }
};

// ─── collect credit payment ───────────────────────────────────────────────────

const collectPayment = async (req, res, next) => {
  try {
    const cid    = req.companyId;
    const amount = parseFloat(req.body.amount);
    const method = req.body.payment_method || 'cash';

    if (!amount || amount <= 0) return error(res, 'Amount must be greater than 0.', 400);

    const sale = await Sale.findOne({ _id: req.params.id, company_id: cid }, { customer_id: 1, due_amount: 1 }).lean();
    if (!sale) return error(res, 'Sale not found.', 404);

    const due = parseFloat(sale.due_amount);
    if (due <= 0) return error(res, 'This sale has no outstanding balance.', 409);

    const pay       = Math.min(amount, due);
    const remaining = parseFloat((due - pay).toFixed(4));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Sale.updateOne(
          { _id: sale._id },
          {
            $inc: { paid_amount: pay },
            $set: { due_amount: remaining, status: remaining === 0 ? 'completed' : undefined, updated_at: new Date() },
          },
          { session }
        );
        if (sale.customer_id) {
          await Customer.updateOne(
            { _id: sale.customer_id, company_id: cid },
            { $inc: { current_balance: -pay } },
            { session }
          );
        }
      });
    } finally {
      session.endSession();
    }

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'sales', sale._id.toString(),
      { due_amount: due }, { due_amount: remaining, payment_collected: pay });

    return success(res, { collected: pay, remaining }, 'Payment recorded.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, voidSale, todaySummary, collectPayment };
