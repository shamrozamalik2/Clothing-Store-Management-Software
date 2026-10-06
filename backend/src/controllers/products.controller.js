'use strict';

const mongoose  = require('mongoose');
const { validationResult }          = require('express-validator');
const Product   = require('../models/Product');
const Category  = require('../models/Category');
const Brand     = require('../models/Brand');
const Sale      = require('../models/Sale');
const Purchase  = require('../models/Purchase');
const StockAdj  = require('../models/StockAdjustment');
const { generateSku, uniqueSku }    = require('../utils/sku');
const { AUDIT_ACTIONS }             = require('../config/constants');
const { success, created, error }   = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit }                  = require('../utils/audit');
const { prepareExternalBarcode, normalizeBarcode, assignInternalBarcode, sendBarcodeError } = require('../services/barcode.service');
const featureSvc  = require('../services/features.service');
const stockBatch  = require('../services/stockBatch.service');
const StockBatch  = require('../models/StockBatch');
const Setting     = require('../models/Setting');

async function generateAdjReference(companyId, session) {
  const date   = new Date();
  const ymd    = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
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
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', category = '', brand = '', stock_status = '', status = '', sort = 'name', order = 'asc' } = req.query;

    const filter = { company_id: cid };
    if (search)   filter.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }, { barcode: { $regex: search, $options: 'i' } }];
    if (category) { try { filter.category_id = new mongoose.Types.ObjectId(category); } catch {} }
    if (brand)    { try { filter.brand_id    = new mongoose.Types.ObjectId(brand);    } catch {} }
    if (status !== '') filter.is_active = status === 'active';
    if (stock_status === 'out_of_stock') { filter.stock_quantity = { $lte: 0 }; }
    else if (stock_status === 'low_stock')    { filter.stock_quantity = { $gt: 0, $lte: mongoose.Types.Decimal128.fromString ? undefined : undefined }; /* handled below */ }
    else if (stock_status === 'in_stock')     { /* handled below */ }

    const SORT_MAP = { name: 'name', sku: 'sku', stock: 'stock_quantity', price: 'sale_price', created: 'created_at' };
    const sortField = SORT_MAP[sort] || 'name';
    const sortDir   = order === 'desc' ? -1 : 1;

    let pipeline = [
      { $match: filter },
      { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: '_cat' } },
      { $lookup: { from: 'brands',     localField: 'brand_id',    foreignField: '_id', as: '_br'  } },
      { $addFields: {
        category_name: { $arrayElemAt: ['$_cat.name', 0] },
        brand_name:    { $arrayElemAt: ['$_br.name',  0] },
        stock_status: {
          $switch: {
            branches: [
              { case: { $lte: ['$stock_quantity', 0] }, then: 'out_of_stock' },
              { case: { $and: [{ $gt: ['$stock_quantity', 0] }, { $lte: ['$stock_quantity', '$low_stock_alert'] }] }, then: 'low_stock' },
            ],
            default: 'in_stock',
          },
        },
        total_sold: 0,
        has_transactions: false,
      }},
    ];

    // Apply computed stock_status filter
    if (stock_status === 'low_stock')    pipeline.push({ $match: { stock_status: 'low_stock' } });
    else if (stock_status === 'in_stock') pipeline.push({ $match: { stock_status: 'in_stock' } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline  = [...pipeline,
      { $sort: { [sortField]: sortDir } },
      { $skip: offset },
      { $limit: limit },
      { $project: { _cat: 0, _br: 0, __v: 0 } },
    ];

    const [countResult, products] = await Promise.all([
      Product.aggregate(countPipeline),
      Product.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const rows  = products.map(p => ({ ...p, id: p._id.toString() }));

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company_id: req.companyId })
      .populate('category_id', 'name')
      .populate('brand_id', 'name')
      .lean();
    if (!product) return error(res, 'Product not found.', 404);

    const totalSold = await Sale.aggregate([
      { $match: { company_id: req.companyId } },
      { $unwind: '$items' },
      { $match: { 'items.product_id': product._id } },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } },
    ]).then(r => r[0]?.total || 0);

    const [hasSale, hasPurchase, hasAdj] = await Promise.all([
      Sale.findOne({ company_id: req.companyId, 'items.product_id': product._id }, { _id: 1 }).lean(),
      Purchase.findOne({ company_id: req.companyId, 'items.product_id': product._id }, { _id: 1 }).lean(),
      StockAdj.findOne({ company_id: req.companyId, 'items.product_id': product._id }, { _id: 1 }).lean(),
    ]);

    return success(res, {
      ...product,
      id:               product._id.toString(),
      category_name:    product.category_id?.name,
      brand_name:       product.brand_id?.name,
      category_id:      product.category_id?._id?.toString() || null,
      brand_id:         product.brand_id?._id?.toString()    || null,
      has_transactions: !!(hasSale || hasPurchase || hasAdj),
      total_sold:       totalSold,
      stock_status:     product.stock_quantity <= 0 ? 'out_of_stock'
                      : product.stock_quantity <= product.low_stock_alert ? 'low_stock'
                      : 'in_stock',
    });
  } catch (err) { next(err); }
};

// ─── create ───────────────────────────────────────────────────────────────────

const createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 422);

    const cid  = req.companyId;
    const body = req.body;
    const image = req.file?.filename ? `/uploads/products/${req.file.filename}` : null;

    let sku = body.sku?.trim();
    if (!sku) sku = await generateSku(body.name, cid);
    sku = await uniqueSku(sku, cid);

    const existing = await Product.findOne({ company_id: cid, sku }).lean();
    if (existing) return error(res, `SKU "${sku}" already exists.`, 409);

    const barcode = await prepareExternalBarcode(cid, body.barcode);

    // Batch tracking on create: the opening stock becomes one lot with the batch and expiry given.
    const trackBatches = body.track_batches === '1' || body.track_batches === 'true' || body.track_batches === true;
    const trackInv     = body.track_inventory !== 'false' && body.track_inventory !== false;
    const negative     = body.allow_negative === 'true' || body.allow_negative === true;
    const stockQty     = parseFloat(body.stock_quantity) || 0;
    let lot = {};
    if (trackBatches) {
      if (!(await featureSvc.isFeatureEnabled(cid, 'BATCH_TRACKING'))) {
        return error(res, 'Batch tracking is not available for your business.', 403);
      }
      if (!trackInv || negative) {
        return error(res, 'Batch tracking needs inventory tracking on and negative stock off.', 422);
      }
      lot = stockBatch.normalizeLot({ batch_no: body.batch_no, expiry_date: body.expiry_date });
      const expiryOn = await featureSvc.isFeatureEnabled(cid, 'EXPIRY');
      if (lot.expiry_date && !expiryOn) return error(res, 'Expiry dates are not enabled for your business.', 403);
      if (expiryOn && stockQty > 0 && !lot.expiry_date) {
        return error(res, 'Expiry date is required for batch-tracked stock.', 422);
      }
    } else if (body.batch_no || body.expiry_date) {
      return error(res, 'Turn on batch tracking to record a batch or expiry date.', 422);
    }

    const session = await mongoose.startSession();
    let product;
    try {
      await session.withTransaction(async () => {
        [product] = await Product.create([{
          company_id:      cid,
          category_id:     body.category_id || null,
          brand_id:        body.brand_id    || null,
          name:            body.name,
          sku,
          barcode,
          barcode_type:    barcode ? 'external' : null,
          description:     body.description || null,
          image,
          unit:            body.unit || 'pcs',
          cost_price:      parseFloat(body.cost_price) || 0,
          sale_price:      parseFloat(body.sale_price) || 0,
          wholesale_price: parseFloat(body.wholesale_price) || 0,
          tax_rate:        parseFloat(body.tax_rate) || 0,
          stock_quantity:  stockQty,
          low_stock_alert: parseInt(body.low_stock_alert, 10) || 5,
          track_inventory: trackInv,
          track_batches:   trackBatches,
          allow_negative:  negative,
          is_active:       body.is_active !== 'false' && body.is_active !== false,
          is_raw_material:  body.is_raw_material  === 'true' || body.is_raw_material === true,
          is_finished_good: body.is_finished_good === 'true' || body.is_finished_good === true,
        }], { session });
        if (trackBatches && stockQty > 0) {
          await stockBatch.receiveLot(session, cid, product._id, lot, stockQty);
        }
      });
    } finally {
      session.endSession();
    }

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'products', product._id.toString(), null, { sku, name: body.name });
    return created(res, { ...product.toJSON() }, 'Product created.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

// ─── update ───────────────────────────────────────────────────────────────────

const updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 422);

    const cid  = req.companyId;
    const product = await Product.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!product) return error(res, 'Product not found.', 404);

    const body   = req.body;
    const image  = req.file?.filename ? `/uploads/products/${req.file.filename}` : product.image;
    const update = {};

    if (body.name !== undefined)            update.name            = body.name;
    if (body.category_id !== undefined)     update.category_id     = body.category_id || null;
    if (body.brand_id    !== undefined)     update.brand_id        = body.brand_id    || null;
    if (body.barcode     !== undefined) {
      const incoming = normalizeBarcode(body.barcode);
      if (incoming !== (product.barcode || null)) {
        update.barcode      = await prepareExternalBarcode(cid, incoming, { excludeProductId: product._id });
        update.barcode_type = update.barcode ? 'external' : null;
      }
    }
    if (body.description !== undefined)     update.description     = body.description || null;
    if (body.unit        !== undefined)     update.unit            = body.unit;
    if (body.cost_price  !== undefined)     update.cost_price      = parseFloat(body.cost_price);
    if (body.sale_price  !== undefined)     update.sale_price      = parseFloat(body.sale_price);
    if (body.wholesale_price !== undefined) update.wholesale_price = parseFloat(body.wholesale_price);
    if (body.tax_rate    !== undefined)     update.tax_rate        = parseFloat(body.tax_rate);
    if (body.low_stock_alert !== undefined) update.low_stock_alert = parseInt(body.low_stock_alert, 10);
    if (body.track_inventory !== undefined) update.track_inventory = body.track_inventory !== 'false' && body.track_inventory !== false;
    if (body.allow_negative  !== undefined) update.allow_negative  = body.allow_negative === 'true' || body.allow_negative === true;
    if (body.is_active       !== undefined) update.is_active       = body.is_active !== 'false' && body.is_active !== false;
    if (body.is_raw_material  !== undefined) update.is_raw_material  = body.is_raw_material === 'true'  || body.is_raw_material === true;
    if (body.is_finished_good !== undefined) update.is_finished_good = body.is_finished_good === 'true' || body.is_finished_good === true;
    if (req.file?.filename) update.image = image;

    // Batch and expiry tracking. Turning it on needs the BATCH_TRACKING module; turning it
    // off needs every lot emptied first, so no stock is left outside the lots.
    const wantsBatches = body.track_batches !== undefined
      ? (body.track_batches === true || body.track_batches === 'true' || body.track_batches === '1')
      : undefined;
    // A batch-tracked product must keep inventory tracking on and negative stock off.
    if (product.track_batches && wantsBatches !== false) {
      if (update.track_inventory === false || update.allow_negative === true) {
        return error(res, 'Batch-tracked products need inventory tracking on and negative stock off.', 422);
      }
    }
    if (wantsBatches !== undefined && wantsBatches !== !!product.track_batches) {
      if (wantsBatches) {
        if (!(await featureSvc.isFeatureEnabled(cid, 'BATCH_TRACKING'))) {
          return error(res, 'Batch tracking is not available for your business.', 403);
        }
        const trackInv = update.track_inventory ?? product.track_inventory;
        const negative = update.allow_negative ?? product.allow_negative;
        if (!trackInv || negative) {
          return error(res, 'Batch tracking needs inventory tracking on and negative stock off.', 422);
        }
        if (product.variants?.length) {
          return error(res, 'Batch tracking is not available for products with variants.', 422);
        }
      } else if (await stockBatch.hasLotStock(cid, product._id)) {
        return error(res, 'Clear the stock held in batches before turning off batch tracking.', 422);
      }
      update.track_batches = wantsBatches;
    }

    // A direct stock_quantity edit here bypasses every other stock-changing
    // path's audit trail (sales, returns, purchases, and the dedicated Stock
    // Adjust feature all record a StockAdjustment of what changed and why).
    // When the value actually changes, route it through the same record,
    // atomically with the rest of the update, clamped at 0 like every other
    // stock-adjusting path already does.
    const requestedStock = body.stock_quantity !== undefined ? parseFloat(body.stock_quantity) : undefined;
    const stockChanged   = requestedStock !== undefined && !Number.isNaN(requestedStock) && requestedStock !== product.stock_quantity;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (stockChanged) {
          const quantityAfter = Math.max(0, requestedStock);
          update.stock_quantity = quantityAfter;

          const reference = await generateAdjReference(cid, session);
          await StockAdj.create([{
            company_id: cid,
            reference,
            type:       'adjustment',
            reason:     'Direct product edit',
            created_by: req.user.id,
            items: [{
              product_id:        product._id,
              variant_id:        null,
              product_name:      product.name,
              sku:               product.sku,
              quantity_before:   product.stock_quantity,
              quantity_adjusted: quantityAfter - product.stock_quantity,
              quantity_after:    quantityAfter,
              unit_cost:         product.cost_price || 0,
            }],
          }], { session });
        }
        // Batch-tracked products: keep the lots in step with the stock figure.
        if (update.track_batches === true) {
          const finalStock = stockChanged ? Math.max(0, requestedStock) : product.stock_quantity;
          if (finalStock > 0) await stockBatch.receiveLot(session, cid, product._id, {}, finalStock);
        } else if (product.track_batches && update.track_batches !== false && stockChanged) {
          await stockBatch.applyStockDelta(session, cid, product, Math.max(0, requestedStock) - product.stock_quantity);
        }
        await Product.findByIdAndUpdate(req.params.id, { ...update, updated_at: new Date() }, { session });
      });
    } finally {
      session.endSession();
    }

    const updated = await Product.findById(req.params.id).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'products', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Product updated.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

// ─── delete ───────────────────────────────────────────────────────────────────

const deleteProduct = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const product = await Product.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!product) return error(res, 'Product not found.', 404);

    const [hasSale, hasPurchase, hasAdj] = await Promise.all([
      Sale.findOne({ company_id: cid, 'items.product_id': product._id }, { _id: 1 }).lean(),
      Purchase.findOne({ company_id: cid, 'items.product_id': product._id }, { _id: 1 }).lean(),
      StockAdj.findOne({ company_id: cid, 'items.product_id': product._id }, { _id: 1 }).lean(),
    ]);

    if (hasSale || hasPurchase || hasAdj) {
      return error(res, 'Cannot delete product with transaction history. Deactivate it instead.', 409);
    }

    await Product.findByIdAndDelete(req.params.id);
    await StockBatch.deleteMany({ company_id: cid, product_id: product._id });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'products', req.params.id);
    return success(res, null, 'Product deleted.');
  } catch (err) { next(err); }
};

// ─── variants ─────────────────────────────────────────────────────────────────

const listVariants = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company_id: req.companyId }, { variants: 1 }).lean();
    if (!product) return error(res, 'Product not found.', 404);
    const variants = (product.variants || []).map(v => ({ ...v, id: v._id.toString() }));
    return success(res, variants);
  } catch (err) { next(err); }
};

const addVariant = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const product = await Product.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!product) return error(res, 'Product not found.', 404);

    if (product.track_batches) return error(res, 'Variants cannot be added to a batch-tracked product.', 422);

    const { sku, size, color, cost_price, sale_price, stock_quantity, barcode } = req.body;
    if (!sku) return error(res, 'SKU is required.', 422);

    const variantBarcode = await prepareExternalBarcode(cid, barcode);

    const dupSku = await Product.findOne({ company_id: cid, 'variants.sku': sku }).lean();
    if (dupSku) return error(res, `Variant SKU "${sku}" already exists.`, 409);

    const variant = {
      company_id:     cid,
      sku,
      barcode:        variantBarcode,
      barcode_type:   variantBarcode ? 'external' : null,
      size:           size    || null,
      color:          color   || null,
      cost_price:     parseFloat(cost_price) || 0,
      sale_price:     parseFloat(sale_price) || 0,
      stock_quantity: parseFloat(stock_quantity) || 0,
      is_active:      true,
    };

    await Product.findByIdAndUpdate(req.params.id, { $push: { variants: variant } });
    const updated = await Product.findById(req.params.id, { variants: 1 }).lean();
    const added   = updated.variants[updated.variants.length - 1];
    return created(res, { ...added, id: added._id.toString() }, 'Variant added.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

const updateVariant = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { id: productId, variantId } = req.params;
    const { size, color, cost_price, sale_price, stock_quantity, barcode, is_active } = req.body;

    const product = await Product.findOne({ _id: productId, company_id: cid }).lean();
    if (!product) return error(res, 'Product not found.', 404);
    const existingVariant = product.variants?.find(v => v._id.toString() === variantId);
    if (!existingVariant) return error(res, 'Variant not found.', 404);

    const update = {};
    if (size           !== undefined) update['variants.$.size']           = size;
    if (color          !== undefined) update['variants.$.color']          = color;
    if (barcode        !== undefined) {
      const incoming = normalizeBarcode(barcode);
      if (incoming !== (existingVariant.barcode || null)) {
        const code = await prepareExternalBarcode(cid, incoming, { excludeVariantId: existingVariant._id });
        update['variants.$.barcode']      = code;
        update['variants.$.barcode_type'] = code ? 'external' : null;
      }
    }
    if (cost_price     !== undefined) update['variants.$.cost_price']     = parseFloat(cost_price);
    if (sale_price     !== undefined) update['variants.$.sale_price']     = parseFloat(sale_price);
    if (is_active      !== undefined) update['variants.$.is_active']      = is_active !== 'false' && is_active !== false;

    // Same audit-trail requirement as the base product: a direct stock edit
    // must go through a StockAdjustment record, atomically, clamped at 0.
    const requestedStock = stock_quantity !== undefined ? parseFloat(stock_quantity) : undefined;
    const stockChanged   = requestedStock !== undefined && !Number.isNaN(requestedStock) && requestedStock !== existingVariant.stock_quantity;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (stockChanged) {
          const quantityAfter = Math.max(0, requestedStock);
          update['variants.$.stock_quantity'] = quantityAfter;

          const reference = await generateAdjReference(cid, session);
          await StockAdj.create([{
            company_id: cid,
            reference,
            type:       'adjustment',
            reason:     'Direct product edit',
            created_by: req.user.id,
            items: [{
              product_id:        product._id,
              variant_id:        existingVariant._id,
              product_name:      product.name,
              sku:               existingVariant.sku,
              quantity_before:   existingVariant.stock_quantity,
              quantity_adjusted: quantityAfter - existingVariant.stock_quantity,
              quantity_after:    quantityAfter,
              unit_cost:         existingVariant.cost_price || 0,
            }],
          }], { session });
        }
        await Product.updateOne(
          { _id: productId, company_id: cid, 'variants._id': variantId },
          { $set: { ...update, updated_at: new Date() } },
          { session }
        );
      });
    } finally {
      session.endSession();
    }

    const updated = await Product.findOne({ _id: productId, company_id: cid }, { variants: 1 }).lean();
    const variant = updated?.variants?.find(v => v._id.toString() === variantId);
    return success(res, { ...variant, id: variant._id.toString() }, 'Variant updated.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

// ─── stats ────────────────────────────────────────────────────────────────────

const stats = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const [total, active, outOfStock, lowStockCount, valueAgg] = await Promise.all([
      Product.countDocuments({ company_id: cid }),
      Product.countDocuments({ company_id: cid, is_active: true }),
      Product.countDocuments({ company_id: cid, stock_quantity: { $lte: 0 } }),
      Product.countDocuments({ company_id: cid, is_active: true, $expr: { $and: [{ $gt: ['$stock_quantity', 0] }, { $lte: ['$stock_quantity', '$low_stock_alert'] }] } }),
      Product.aggregate([{ $match: { company_id: cid, is_active: true } }, { $group: { _id: null, total_value: { $sum: { $multiply: ['$cost_price', '$stock_quantity'] } }, total_sale_value: { $sum: { $multiply: ['$sale_price', '$stock_quantity'] } } } }]),
    ]);
    const vals = valueAgg[0] || { total_value: 0, total_sale_value: 0 };
    return success(res, {
      total,
      active,
      inactive:        total - active,
      out_of_stock:    outOfStock,
      low_stock:       lowStockCount,
      stock_value:     vals.total_value,
      sale_value:      vals.total_sale_value,
      inventory_cost:  vals.total_value,
      inventory_value: vals.total_sale_value,
    });
  } catch (err) { next(err); }
};

// ─── low-stock ────────────────────────────────────────────────────────────────

const lowStock = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { limit: lim = 50 } = req.query;
    const products = await Product.find({
      company_id: cid,
      is_active: true,
      track_inventory: true,
      $expr: { $lte: ['$stock_quantity', '$low_stock_alert'] },
    })
      .sort({ stock_quantity: 1 })
      .limit(parseInt(lim, 10))
      .populate('category_id', 'name')
      .lean();
    return success(res, products.map(p => ({ ...p, id: p._id.toString(), category_name: p.category_id?.name })));
  } catch (err) { next(err); }
};

// ─── getByBarcode ─────────────────────────────────────────────────────────────

// ─── expiryAlerts ─────────────────────────────────────────────────────────────

// Lots that are expired, expire today, or expire within the company's warning window.
const expiryAlerts = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const setting = await Setting.findOne({ company_id: cid, key: 'expiry_warning_days' }, { value: 1 }).lean();
    const parsed  = parseInt(setting?.value, 10);
    const days    = Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;

    const rows = await StockBatch.find({
      company_id:  cid,
      quantity:    { $gt: 0 },
      expiry_date: { $ne: null, $lt: stockBatch.warningHorizon(new Date(), days) },
    }).lean();

    const productIds = [...new Set(rows.map(r => String(r.product_id)))];
    const products   = await Product.find({ company_id: cid, _id: { $in: productIds } }, { name: 1, sku: 1 }).lean();
    const byId       = new Map(products.map(p => [String(p._id), p]));

    const grouped = stockBatch.classifyLots(rows, days);
    const shape = (r) => ({
      batch_id:     String(r._id),
      product_id:   String(r.product_id),
      product_name: byId.get(String(r.product_id))?.name || '',
      sku:          byId.get(String(r.product_id))?.sku  || '',
      batch_no:     r.batch_no,
      expiry_date:  r.expiry_date,
      quantity:     r.quantity,
    });
    return success(res, {
      warning_days:  days,
      expired:       grouped.expired.map(shape),
      expires_today: grouped.expires_today.map(shape),
      expires_soon:  grouped.expires_soon.map(shape),
    });
  } catch (err) { next(err); }
};

const getByBarcode = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const code = String(req.params.code).replace(/\s+/g, '');
    let product = await Product.findOne({ company_id: cid, barcode: code }).populate('category_id', 'name').populate('brand_id', 'name').lean();
    let variant = null;
    if (!product) {
      product = await Product.findOne({ company_id: cid, 'variants.barcode': code }).populate('category_id', 'name').populate('brand_id', 'name').lean();
      if (product) variant = product.variants.find(v => v.barcode === code);
    }
    if (!product) return error(res, 'Product not found.', 404);
    return success(res, { ...product, id: product._id.toString(), matched_variant: variant || null });
  } catch (err) { next(err); }
};

// ─── updateBarcode ────────────────────────────────────────────────────────────

const updateBarcode = async (req, res, next) => {
  try {
    const cid     = req.companyId;
    const incoming = normalizeBarcode(req.body.barcode);
    const product  = await Product.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!product) return error(res, 'Product not found.', 404);
    if (incoming !== (product.barcode || null)) {
      const code = await prepareExternalBarcode(cid, incoming, { excludeProductId: product._id });
      await Product.updateOne(
        { _id: product._id, company_id: cid },
        { $set: { barcode: code, barcode_type: code ? 'external' : null, updated_at: new Date() } }
      );
    }
    return success(res, null, 'Barcode updated.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

// ─── generateInternalBarcode ──────────────────────────────────────────────────

const generateInternalBarcode = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const code = await assignInternalBarcode(cid, { productId: req.params.id });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'products', req.params.id, null, { barcode: code, barcode_type: 'internal' });
    return success(res, { barcode: code, barcode_type: 'internal' }, 'Internal barcode generated.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

const generateVariantInternalBarcode = async (req, res, next) => {
  try {
    const cid  = req.companyId;
    const { id: productId, variantId } = req.params;
    const code = await assignInternalBarcode(cid, { productId, variantId });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'products', productId, null, { variant_id: variantId, barcode: code, barcode_type: 'internal' });
    return success(res, { barcode: code, barcode_type: 'internal' }, 'Internal barcode generated.');
  } catch (err) { if (!sendBarcodeError(res, err)) next(err); }
};

// ─── deleteVariant ────────────────────────────────────────────────────────────

const deleteVariant = async (req, res, next) => {
  try {
    const { id: productId, variantId } = req.params;
    const cid = req.companyId;
    const product = await Product.findOne({ _id: productId, company_id: cid, 'variants._id': variantId }).lean();
    if (!product) return error(res, 'Variant not found.', 404);
    await Product.findByIdAndUpdate(productId, { $pull: { variants: { _id: variantId } }, $set: { updated_at: new Date() } });
    return success(res, null, 'Variant deleted.');
  } catch (err) { next(err); }
};

// ─── importCsv ────────────────────────────────────────────────────────────────

const importCsv = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded.', 422);
    const cid  = req.companyId;
    const rows = req.file.buffer.toString('utf8').split('\n').filter(Boolean);
    const headers = rows.shift().split(',').map(h => h.trim().toLowerCase());
    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const cols = row.split(',');
      const data = Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim()]));
      if (!data.name) continue;
      try {
        let sku = data.sku || await generateSku(data.name, cid);
        sku = await uniqueSku(sku, cid);
        const exists = await Product.findOne({ company_id: cid, sku }).lean();
        if (exists) { results.skipped++; continue; }
        await Product.create({
          company_id: cid, name: data.name, sku,
          barcode: data.barcode || null,
          sale_price: parseFloat(data.sale_price) || 0,
          cost_price: parseFloat(data.cost_price) || 0,
          stock_quantity: parseFloat(data.stock_quantity) || 0,
          unit: data.unit || 'pcs',
        });
        results.created++;
      } catch (e) { results.errors.push({ row: data.name, error: e.message }); }
    }
    return success(res, results, `Import complete. ${results.created} created, ${results.skipped} skipped.`);
  } catch (err) { next(err); }
};

module.exports = {
  list, getOne,
  create: createProduct,
  update: updateProduct,
  remove: deleteProduct,
  stats, lowStock, getByBarcode, updateBarcode,
  generateInternalBarcode, generateVariantInternalBarcode, expiryAlerts,
  listVariants,
  upsertVariant: addVariant,
  updateVariant,
  deleteVariant,
  importCsv,
};
