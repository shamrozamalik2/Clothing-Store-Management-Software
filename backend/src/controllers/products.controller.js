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

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', category = '', brand = '', stock_status = '', status = '', sort = 'name', order = 'asc' } = req.query;

    const filter = { company_id: cid };
    if (search)   filter.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }, { barcode: { $regex: search, $options: 'i' } }];
    if (category) filter.category_id = category;
    if (brand)    filter.brand_id    = brand;
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
    const image = req.file?.filename ? `${req.file.filename}` : null;

    let sku = body.sku?.trim();
    if (!sku) sku = await generateSku(body.name, cid);
    sku = await uniqueSku(sku, cid);

    const existing = await Product.findOne({ company_id: cid, sku }).lean();
    if (existing) return error(res, `SKU "${sku}" already exists.`, 409);

    const product = await Product.create({
      company_id:      cid,
      category_id:     body.category_id || null,
      brand_id:        body.brand_id    || null,
      name:            body.name,
      sku,
      barcode:         body.barcode || null,
      description:     body.description || null,
      image,
      unit:            body.unit || 'pcs',
      cost_price:      parseFloat(body.cost_price) || 0,
      sale_price:      parseFloat(body.sale_price) || 0,
      wholesale_price: parseFloat(body.wholesale_price) || 0,
      tax_rate:        parseFloat(body.tax_rate) || 0,
      stock_quantity:  parseFloat(body.stock_quantity) || 0,
      low_stock_alert: parseInt(body.low_stock_alert, 10) || 5,
      track_inventory: body.track_inventory !== 'false' && body.track_inventory !== false,
      allow_negative:  body.allow_negative  === 'true'  || body.allow_negative === true,
      is_active:       body.is_active !== 'false' && body.is_active !== false,
      is_raw_material:  body.is_raw_material  === 'true' || body.is_raw_material === true,
      is_finished_good: body.is_finished_good === 'true' || body.is_finished_good === true,
    });

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'products', product._id.toString(), null, { sku, name: body.name });
    return created(res, { ...product.toJSON() }, 'Product created.');
  } catch (err) { next(err); }
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
    const image  = req.file?.filename || product.image;
    const update = {};

    if (body.name !== undefined)            update.name            = body.name;
    if (body.category_id !== undefined)     update.category_id     = body.category_id || null;
    if (body.brand_id    !== undefined)     update.brand_id        = body.brand_id    || null;
    if (body.barcode     !== undefined)     update.barcode         = body.barcode     || null;
    if (body.description !== undefined)     update.description     = body.description || null;
    if (body.unit        !== undefined)     update.unit            = body.unit;
    if (body.cost_price  !== undefined)     update.cost_price      = parseFloat(body.cost_price);
    if (body.sale_price  !== undefined)     update.sale_price      = parseFloat(body.sale_price);
    if (body.wholesale_price !== undefined) update.wholesale_price = parseFloat(body.wholesale_price);
    if (body.tax_rate    !== undefined)     update.tax_rate        = parseFloat(body.tax_rate);
    if (body.stock_quantity  !== undefined) update.stock_quantity  = parseFloat(body.stock_quantity);
    if (body.low_stock_alert !== undefined) update.low_stock_alert = parseInt(body.low_stock_alert, 10);
    if (body.track_inventory !== undefined) update.track_inventory = body.track_inventory !== 'false' && body.track_inventory !== false;
    if (body.allow_negative  !== undefined) update.allow_negative  = body.allow_negative === 'true' || body.allow_negative === true;
    if (body.is_active       !== undefined) update.is_active       = body.is_active !== 'false' && body.is_active !== false;
    if (body.is_raw_material  !== undefined) update.is_raw_material  = body.is_raw_material === 'true'  || body.is_raw_material === true;
    if (body.is_finished_good !== undefined) update.is_finished_good = body.is_finished_good === 'true' || body.is_finished_good === true;
    if (req.file?.filename) update.image = image;

    await Product.findByIdAndUpdate(req.params.id, { ...update, updated_at: new Date() });
    const updated = await Product.findById(req.params.id).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'products', req.params.id);
    return success(res, { ...updated, id: updated._id.toString() }, 'Product updated.');
  } catch (err) { next(err); }
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

    const { sku, size, color, cost_price, sale_price, stock_quantity, barcode } = req.body;
    if (!sku) return error(res, 'SKU is required.', 422);

    const dupSku = await Product.findOne({ company_id: cid, 'variants.sku': sku }).lean();
    if (dupSku) return error(res, `Variant SKU "${sku}" already exists.`, 409);

    const variant = {
      company_id:     cid,
      sku,
      barcode:        barcode || null,
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
  } catch (err) { next(err); }
};

const updateVariant = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { id: productId, variantId } = req.params;
    const { size, color, cost_price, sale_price, stock_quantity, barcode, is_active } = req.body;

    const update = {};
    if (size           !== undefined) update['variants.$.size']           = size;
    if (color          !== undefined) update['variants.$.color']          = color;
    if (barcode        !== undefined) update['variants.$.barcode']        = barcode;
    if (cost_price     !== undefined) update['variants.$.cost_price']     = parseFloat(cost_price);
    if (sale_price     !== undefined) update['variants.$.sale_price']     = parseFloat(sale_price);
    if (stock_quantity !== undefined) update['variants.$.stock_quantity'] = parseFloat(stock_quantity);
    if (is_active      !== undefined) update['variants.$.is_active']      = is_active !== 'false' && is_active !== false;

    await Product.updateOne(
      { _id: productId, company_id: cid, 'variants._id': variantId },
      { $set: { ...update, updated_at: new Date() } }
    );
    const product = await Product.findOne({ _id: productId, company_id: cid }, { variants: 1 }).lean();
    const variant = product?.variants?.find(v => v._id.toString() === variantId);
    if (!variant) return error(res, 'Variant not found.', 404);
    return success(res, { ...variant, id: variant._id.toString() }, 'Variant updated.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, createProduct, updateProduct, deleteProduct, listVariants, addVariant, updateVariant };
