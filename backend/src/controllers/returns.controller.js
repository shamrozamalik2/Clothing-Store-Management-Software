'use strict';

const mongoose = require('mongoose');
const Return   = require('../models/Return');
const Sale     = require('../models/Sale');
const Product  = require('../models/Product');
const Customer = require('../models/Customer');
const User     = require('../models/User');
const { success, error } = require('../utils/response');
const { logAudit }       = require('../utils/audit');

async function generateReference(companyId, session) {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `RET-${ymd}-`;
  const last = await Return.findOne({ company_id: companyId, reference: { $regex: `^${prefix}` } }, { reference: 1 })
    .sort({ _id: -1 }).session(session).lean();
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── POST /returns ─────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const {
      sale_id,
      type           = 'return',
      reason         = '',
      refund_method  = 'cash',
      return_items   = [],
      exchange_items = [],
    } = req.body;

    if (!sale_id)                return error(res, 'sale_id is required.', 422);
    if (!return_items.length)    return error(res, 'At least one return item is required.', 422);

    let returnDoc;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Validate original sale
        const sale = await Sale.findOne({ _id: sale_id, company_id: cid }).session(session).lean();
        if (!sale)                       throw new Error('Original sale not found.');
        if (sale.status === 'cancelled') throw new Error('Cannot return a cancelled sale.');

        // 2. Process return items
        let returnTotal = 0;
        const resolvedReturn = [];

        for (const ri of return_items) {
          const qty = parseFloat(ri.quantity);
          if (!qty || qty <= 0) throw new Error('Return quantity must be greater than 0.');

          // Find original sale item in embedded array
          const saleItem = sale.items.find(si => si._id.toString() === ri.sale_item_id);
          if (!saleItem) throw new Error(`Sale item ${ri.sale_item_id} not found in this sale.`);

          // Count already returned quantity for this sale item
          const alreadyReturnedAgg = await Return.aggregate([
            { $match: { company_id: cid } },
            { $unwind: '$items' },
            { $match: { 'items.sale_item_id': saleItem._id } },
            { $group: { _id: null, already: { $sum: '$items.quantity' } } },
          ]).session(session);
          const already = parseFloat(alreadyReturnedAgg[0]?.already || 0);

          const maxReturnable = parseFloat(saleItem.quantity) - already;
          if (qty > maxReturnable + 0.0001) {
            throw new Error(`Cannot return ${qty} of "${saleItem.product_name}" — only ${maxReturnable} unit(s) are returnable.`);
          }

          // Restore stock
          const product = await Product.findOne({ _id: saleItem.product_id, company_id: cid }, { track_inventory: 1 }).session(session).lean();
          if (product?.track_inventory) {
            if (saleItem.variant_id) {
              await Product.updateOne(
                { _id: saleItem.product_id, company_id: cid, 'variants._id': saleItem.variant_id },
                { $inc: { 'variants.$.stock_quantity': qty } },
                { session }
              );
            } else {
              await Product.updateOne(
                { _id: saleItem.product_id, company_id: cid },
                { $inc: { stock_quantity: qty } },
                { session }
              );
            }
          }

          const lineTotal = qty * (parseFloat(saleItem.total) / parseFloat(saleItem.quantity));
          returnTotal += lineTotal;
          resolvedReturn.push({
            product_id:   saleItem.product_id,
            variant_id:   saleItem.variant_id || null,
            sale_item_id: saleItem._id,
            product_name: saleItem.product_name,
            sku:          saleItem.sku,
            quantity:     qty,
            unit_price:   saleItem.unit_price,
            total:        lineTotal,
          });
        }

        // 3. Process exchange items
        let exchangeTotal = 0;
        const resolvedExchange = [];

        if (type === 'exchange') {
          for (const ei of exchange_items) {
            const qty   = parseFloat(ei.quantity);
            const price = parseFloat(ei.unit_price);
            if (!qty || qty <= 0) throw new Error('Exchange quantity must be greater than 0.');

            const product = await Product.findOne({ _id: ei.product_id, company_id: cid }).session(session).lean();
            if (!product) throw new Error(`Product ${ei.product_id} not found.`);

            if (ei.variant_id) {
              const variant = product.variants?.find(v => v._id.toString() === ei.variant_id);
              if (!variant) throw new Error(`Variant ${ei.variant_id} not found.`);
              if (product.track_inventory && !product.allow_negative && parseFloat(variant.stock_quantity) < qty) {
                throw new Error(`Insufficient stock for "${product.name} (${[variant.size, variant.color].filter(Boolean).join(' ')})"`);
              }
              await Product.updateOne(
                { _id: product._id, company_id: cid, 'variants._id': ei.variant_id },
                { $inc: { 'variants.$.stock_quantity': -qty } },
                { session }
              );
              const total = qty * price;
              exchangeTotal += total;
              resolvedExchange.push({
                product_id: product._id, variant_id: variant._id,
                product_name: `${product.name} (${[variant.size, variant.color].filter(Boolean).join(' ')})`.trim(),
                sku: variant.sku, quantity: qty, unit_price: price, total,
              });
            } else {
              if (product.track_inventory && !product.allow_negative && parseFloat(product.stock_quantity) < qty) {
                throw new Error(`Insufficient stock for "${product.name}".`);
              }
              if (product.track_inventory) {
                await Product.updateOne({ _id: product._id, company_id: cid }, { $inc: { stock_quantity: -qty } }, { session });
              }
              const total = qty * price;
              exchangeTotal += total;
              resolvedExchange.push({ product_id: product._id, variant_id: null, product_name: product.name, sku: product.sku, quantity: qty, unit_price: price, total });
            }
          }
        }

        const refundAmount = returnTotal - exchangeTotal;
        const ref = await generateReference(cid, session);

        const [newReturn] = await Return.create([{
          company_id:     cid,
          sale_id,
          reference:      ref,
          return_date:    new Date(),
          type,
          reason:         reason?.trim() || null,
          refund_method,
          total_amount:   returnTotal,
          refund_amount:  refundAmount,
          exchange_total: exchangeTotal,
          items:          resolvedReturn,
          exchange_items: resolvedExchange,
          created_by:     req.user.id,
        }], { session });

        // 4. Update sale status
        if (type === 'exchange') {
          await Sale.updateOne({ _id: sale_id, company_id: cid }, { status: 'exchanged', updated_at: new Date() }, { session });
        } else {
          // Check if fully returned
          const fullyReturned = sale.items.every(si => {
            const returned = resolvedReturn.find(ri => ri.sale_item_id.toString() === si._id.toString());
            return returned && returned.quantity >= si.quantity - 0.0001;
          });
          if (fullyReturned) {
            await Sale.updateOne({ _id: sale_id, company_id: cid }, { status: 'refunded', updated_at: new Date() }, { session });
          }
        }

        returnDoc = newReturn;
      });
    } catch (txErr) {
      session.endSession();
      return error(res, txErr.message, 422);
    }
    session.endSession();

    await logAudit(cid, req.user.id, 'create', 'returns', returnDoc._id.toString());
    return success(res, { id: returnDoc._id.toString() }, 'Return processed and stock updated.', 201);
  } catch (err) { next(err); }
};

// ─── GET /returns ──────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '25', 10));
    const off   = (page - 1) * limit;

    const [total, returns] = await Promise.all([
      Return.countDocuments({ company_id: cid }),
      Return.find({ company_id: cid }).select('-items -exchange_items').sort({ return_date: -1, _id: -1 }).skip(off).limit(limit).lean(),
    ]);

    // Populate sale references and customer names
    const saleIds = [...new Set(returns.map(r => r.sale_id?.toString()).filter(Boolean))];
    const userIds = [...new Set(returns.map(r => r.created_by?.toString()).filter(Boolean))];
    const [sales, users] = await Promise.all([
      Sale.find({ _id: { $in: saleIds } }, { reference: 1, customer_id: 1 }).lean(),
      User.find({ _id: { $in: userIds } }, { name: 1 }).lean(),
    ]);
    const saleMap = Object.fromEntries(sales.map(s => [s._id.toString(), s]));
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    const custIds = [...new Set(sales.map(s => s.customer_id?.toString()).filter(Boolean))];
    const customers = await Customer.find({ _id: { $in: custIds } }, { name: 1 }).lean();
    const custMap   = Object.fromEntries(customers.map(c => [c._id.toString(), c.name]));

    const rows = returns.map(r => {
      const sale = r.sale_id ? saleMap[r.sale_id.toString()] : null;
      return {
        ...r,
        id:               r._id.toString(),
        sale_reference:   sale?.reference || null,
        customer_name:    sale?.customer_id ? custMap[sale.customer_id.toString()] || null : null,
        created_by_name:  r.created_by ? userMap[r.created_by.toString()] || null : null,
      };
    });

    return success(res, { returns: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ─── GET /returns/:id ─────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const ret = await Return.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!ret) return error(res, 'Return not found.', 404);

    const [sale, user] = await Promise.all([
      Sale.findById(ret.sale_id, { reference: 1, customer_id: 1 }).lean(),
      User.findById(ret.created_by, { name: 1 }).lean(),
    ]);
    const customer = sale?.customer_id ? await Customer.findById(sale.customer_id, { name: 1 }).lean() : null;

    return success(res, {
      ...ret,
      id:               ret._id.toString(),
      sale_reference:   sale?.reference || null,
      customer_name:    customer?.name  || null,
      created_by_name:  user?.name      || null,
      return_items:     ret.items,
      exchange_items:   ret.exchange_items,
    });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne };
