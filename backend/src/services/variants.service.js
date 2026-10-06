'use strict';

// Clothing variants: one row per size and colour of a product. Each variant has its own
// SKU, optional barcode, cost and sale price, and stock. This file checks a submitted
// variant list against the product, and plans what to save.

const mongoose = require('mongoose');
const Product      = require('../models/Product');
const Sale         = require('../models/Sale');
const Purchase     = require('../models/Purchase');
const StockAdj     = require('../models/StockAdjustment');
const Return       = require('../models/Return');
const featureSvc   = require('./features.service');
const { BarcodeError, prepareExternalBarcode, normalizeBarcode } = require('./barcode.service');
const { BatchError } = require('./stockBatch.service');

class VariantError extends Error {
  constructor(message, status = 422, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
const label = (v) => [v.size, v.color].filter(Boolean).join(' / ') || 'Variant';

function parseInput(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not a list');
    return parsed;
  } catch {
    throw new VariantError('Variants must be a list.');
  }
}

function nonNegative(value, name) {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) throw new VariantError(`${name} must be 0 or more.`);
  return n;
}

// True when another product or variant already uses this SKU in the company.
async function skuTaken(companyId, sku, excludeVariantId = null) {
  if (await Product.exists({ company_id: companyId, sku })) return true;
  const match = { sku };
  if (excludeVariantId) match._id = { $ne: excludeVariantId };
  return !!(await Product.exists({ company_id: companyId, variants: { $elemMatch: match } }));
}

// True when the variant appears on any sale, purchase, stock adjustment or return.
async function hasHistory(companyId, variantId) {
  const [sale, purchase, adj, ret] = await Promise.all([
    Sale.exists({ company_id: companyId, 'items.variant_id': variantId }),
    Purchase.exists({ company_id: companyId, 'items.variant_id': variantId }),
    StockAdj.exists({ company_id: companyId, 'items.variant_id': variantId }),
    Return.exists({ company_id: companyId, $or: [{ 'items.variant_id': variantId }, { 'exchange_items.variant_id': variantId }] }),
  ]);
  return !!(sale || purchase || adj || ret);
}

// Checks a submitted variant list and returns the variant list to save.
//  - existing variants keep their stock and barcode unless the input changes them
//  - a new variant with no barcode gets an internal PBC code after saving, when the company has INTERNAL_BARCODE
//  - a variant that is left out is removed, unless it has history (then it must be set inactive)
async function planVariants({ companyId, productSku, input, existing = [] }) {
  const list = parseInput(input);
  const internalOn = await featureSvc.isFeatureEnabled(companyId, 'INTERNAL_BARCODE');
  // Adding variants needs the VARIANTS module. Editing or removing existing ones doesn't, so
  // products created before a module was switched off can still be maintained.
  let variantsOn = null;
  const combos = new Set();
  const skus = new Set();
  const out = [];
  const internalNeeded = [];

  for (const raw of list) {
    const rawId = text(raw._id || raw.id);
    const current = rawId ? existing.find(v => String(v._id) === rawId) : null;
    if (rawId && !current) throw new VariantError('A variant in this list no longer exists. Reload the page and try again.');
    if (!current) {
      if (variantsOn === null) variantsOn = await featureSvc.isFeatureEnabled(companyId, 'VARIANTS');
      if (!variantsOn) {
        throw new VariantError('Variants are not enabled for your business.', 403, { code: 'FEATURE_DISABLED', feature: 'VARIANTS' });
      }
    }

    const size  = text(raw.size);
    const color = text(raw.color);
    if (!size && !color) throw new VariantError('Each variant needs a size or a colour.');

    const combo = `${size.toLowerCase()}|${color.toLowerCase()}`;
    if (combos.has(combo)) throw new VariantError(`${label({ size, color })} is listed more than once.`);
    combos.add(combo);

    const sku = text(raw.sku).toUpperCase() || [productSku, color, size].filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
    if (skus.has(sku)) throw new VariantError(`SKU "${sku}" is used by two variants.`);
    skus.add(sku);
    if ((!current || current.sku !== sku) && await skuTaken(companyId, sku, current?._id ?? null)) {
      throw new VariantError(`SKU "${sku}" is already used.`);
    }

    // Barcode: only checked when it changes, so existing barcodes are never re-validated.
    const incoming = normalizeBarcode(raw.barcode);
    let barcode = current ? (current.barcode || null) : null;
    let barcodeType = current ? (current.barcode_type || null) : null;
    if (incoming !== barcode) {
      if (incoming) {
        barcode = await prepareExternalBarcode(companyId, incoming, { excludeVariantId: current?._id ?? null });
        barcodeType = 'external';
      } else {
        barcode = null;
        barcodeType = null;
      }
    }

    const isActive = raw.is_active === undefined
      ? (current ? current.is_active !== false : true)
      : !(raw.is_active === false || raw.is_active === 'false' || raw.is_active === '0');

    const id = current ? current._id : new mongoose.Types.ObjectId();
    out.push({
      _id: id,
      company_id: companyId,
      sku,
      size: size || null,
      color: color || null,
      barcode,
      barcode_type: barcodeType,
      cost_price: nonNegative(raw.cost_price, 'Cost price'),
      sale_price: nonNegative(raw.sale_price, 'Sale price'),
      // Stock on existing variants changes only through stock adjustments, so the audit trail stays complete.
      stock_quantity: current ? current.stock_quantity : nonNegative(raw.stock_quantity, 'Opening stock'),
      is_active: isActive,
    });
    if (!current && !barcode && internalOn) internalNeeded.push(String(id));
  }

  const keep = new Set(out.map(v => String(v._id)));
  const removed = existing.filter(v => !keep.has(String(v._id)));
  for (const v of removed) {
    if (await hasHistory(companyId, v._id)) {
      throw new VariantError(`"${label(v)}" has sales or stock history, so it can't be removed. Set it inactive instead.`);
    }
  }

  return { variants: out, internalNeeded, removedIds: removed.map(v => String(v._id)) };
}

// Maps this module's errors and the barcode and batch errors to an HTTP response.
// Returns true when a response was sent.
function sendError(res, err) {
  if (err instanceof VariantError || err instanceof BarcodeError || err instanceof BatchError) {
    const body = { success: false, message: err.message };
    if (err.code) { body.code = err.code; body.feature = err.feature; }
    res.status(err.status || 422).json(body);
    return true;
  }
  return false;
}

module.exports = { VariantError, parseInput, planVariants, hasHistory, sendError };
