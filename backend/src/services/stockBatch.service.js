'use strict';

// Lot-level stock for batch-tracked products (Product.track_batches).
//
// Rules this file keeps:
//  - Product.stock_quantity is still the total. For a batch-tracked product the
//    StockBatch rows add up to that total, so every stock change calls in here.
//  - Sales take stock first-expiry-first-out (FEFO). Expired lots are never sold.
//  - Returns and voids put units back into the lots the sale took them from,
//    up to what each lot gave, so an expiry date is never lost.
//  - Write-offs and consumption that aren't sales may still take expired stock.

const StockBatch = require('../models/StockBatch');
const Sale       = require('../models/Sale');

const EPS = 1e-9;

class BatchError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

// Calendar day in UTC, so the same expiry date always matches the same instant.
function dayStart(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeLot({ batch_no, expiry_date, mfg_date } = {}) {
  const exp = expiry_date ? dayStart(expiry_date) : null;
  const mfg = mfg_date ? dayStart(mfg_date) : null;
  if ((exp && Number.isNaN(exp.getTime())) || (mfg && Number.isNaN(mfg.getTime()))) {
    throw new BatchError('Batch dates must be valid dates.');
  }
  if (exp && mfg && mfg > exp) throw new BatchError('Manufacturing date cannot be after the expiry date.');
  const no = typeof batch_no === 'string' && batch_no.trim() ? batch_no.trim() : null;
  return { batch_no: no, expiry_date: exp, mfg_date: mfg };
}

// Dated lots first, earliest expiry first; undated lots last; then oldest receipt.
function fefoOrder(a, b) {
  if (!!a.expiry_date !== !!b.expiry_date) return a.expiry_date ? -1 : 1;
  if (a.expiry_date && b.expiry_date && a.expiry_date - b.expiry_date !== 0) return a.expiry_date - b.expiry_date;
  return new Date(a.created_at) - new Date(b.created_at);
}

// Adds units to the lot for this batch number and expiry (creating it if needed).
async function receiveLot(session, companyId, productId, lot, quantity) {
  const { batch_no, expiry_date, mfg_date } = normalizeLot(lot);
  const filter = { company_id: companyId, product_id: productId, batch_no, expiry_date };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const row = await StockBatch.findOneAndUpdate(
        filter,
        { $inc: { quantity }, $setOnInsert: { mfg_date } },
        { upsert: true, returnDocument: 'after', session }
      ).lean();
      return { batch_id: row._id, batch_no, expiry_date, quantity };
    } catch (err) {
      // Two requests created the same lot at once. The second upsert now finds it.
      if (err.code !== 11000) throw err;
    }
  }
  throw new BatchError('Could not record the batch. Try again.', 409);
}

// Takes `quantity` from the lots in FEFO order. Returns the allocations, which the
// caller stores on the sale line so a later return can go back to the same lots.
async function allocateFEFO(session, companyId, productId, quantity, { productName = 'this product', allowExpired = false, now = new Date() } = {}) {
  const today = dayStart(now);
  const rows  = await StockBatch.find({ company_id: companyId, product_id: productId, quantity: { $gt: 0 } })
    .session(session).lean();
  const usable = rows
    .filter(r => allowExpired || !r.expiry_date || r.expiry_date >= today)
    .sort(fefoOrder);

  const available = usable.reduce((sum, r) => sum + r.quantity, 0);
  if (available + EPS < quantity) {
    const note = allowExpired ? '' : ' Expired stock cannot be sold.';
    throw new BatchError(`Not enough stock in batches for "${productName}". Available: ${available}.${note}`);
  }

  let remaining = quantity;
  const allocations = [];
  for (const row of usable) {
    if (remaining <= EPS) break;
    const take = Math.min(remaining, row.quantity);
    // The conditional update fails if another request took these units first.
    const res = await StockBatch.updateOne(
      { _id: row._id, company_id: companyId, quantity: { $gte: take } },
      { $inc: { quantity: -take } },
      { session }
    );
    if (res.matchedCount !== 1) {
      throw new BatchError(`Stock for "${productName}" changed while this was being processed. Try again.`, 409);
    }
    allocations.push({ batch_id: row._id, batch_no: row.batch_no, expiry_date: row.expiry_date, quantity: take, restored: 0 });
    remaining -= take;
  }
  return allocations;
}

// Puts back units a sale line took, into the same lots, up to what each lot gave.
// Anything beyond that (for example a line sold before tracking was turned on) goes
// into an undated lot. Returns the restores so the caller can record them on the line.
async function restoreToAllocations(session, companyId, productId, allocations, quantity) {
  let remaining = quantity;
  const restores = [];
  for (const alloc of allocations || []) {
    if (remaining <= EPS) break;
    const capacity = (alloc.quantity || 0) - (alloc.restored || 0);
    const take = Math.min(remaining, capacity);
    if (take <= EPS) continue;
    const res = await StockBatch.updateOne(
      { _id: alloc.batch_id, company_id: companyId },
      { $inc: { quantity: take } },
      { session }
    );
    if (res.matchedCount !== 1) throw new BatchError('A batch for this sale line no longer exists.', 409);
    restores.push({ batch_id: alloc.batch_id, quantity: take, unallocated: false });
    remaining -= take;
  }
  if (remaining > EPS) {
    const lot = await receiveLot(session, companyId, productId, {}, remaining);
    restores.push({ batch_id: lot.batch_id, quantity: remaining, unallocated: true });
  }
  return restores;
}

// Records restored units on the sale line, so later returns and voids don't restore them twice.
// `pairs`: [{ itemId, batchId, quantity }], built from restoreToAllocations results.
async function recordRestored(session, companyId, saleId, pairs) {
  const incs = {};
  const arrayFilters = [];
  const byKey = new Map();
  for (const p of pairs) {
    const key = `${String(p.itemId)}|${String(p.batchId)}`;
    byKey.set(key, { ...p, quantity: (byKey.get(key)?.quantity || 0) + p.quantity });
  }
  let i = 0;
  for (const p of byKey.values()) {
    incs[`items.$[it${i}].batch_allocations.$[al${i}].restored`] = p.quantity;
    arrayFilters.push({ [`it${i}._id`]: p.itemId }, { [`al${i}.batch_id`]: p.batchId });
    i++;
  }
  if (!i) return;
  await Sale.updateOne({ _id: saleId, company_id: companyId }, { $inc: incs }, { session, arrayFilters });
}

// Takes back units that a purchase line put into a lot. Refuses if they were sold.
async function consumeFromLot(session, companyId, batchId, quantity, productName) {
  const res = await StockBatch.updateOne(
    { _id: batchId, company_id: companyId, quantity: { $gte: quantity - EPS } },
    { $inc: { quantity: -quantity } },
    { session }
  );
  if (res.matchedCount !== 1) {
    throw new BatchError(`Cannot un-receive ${quantity} of "${productName}": units from that batch have already been sold or adjusted.`);
  }
}

// Keeps lots in step with a stock change made outside sales and returns (adjustments,
// direct stock edits, manufacturing). Products without batch tracking are left alone.
async function applyStockDelta(session, companyId, product, delta, { allowExpired = true } = {}) {
  if (!product?.track_batches || Math.abs(delta) <= EPS) return;
  if (delta > 0) {
    await receiveLot(session, companyId, product._id, {}, delta);
  } else {
    await allocateFEFO(session, companyId, product._id, -delta, { productName: product.name, allowExpired });
  }
}

async function hasLotStock(companyId, productId) {
  return !!(await StockBatch.exists({ company_id: companyId, product_id: productId, quantity: { $gt: EPS } }));
}

// First instant that is outside the warning window: lots expiring on day `warningDays`
// from today are still inside it.
function warningHorizon(now, warningDays) {
  return new Date(dayStart(now).getTime() + (warningDays + 1) * 86400000);
}

// Lots that are expired, expire today, or expire within `warningDays` (inclusive).
// Days are UTC calendar days.
function classifyLots(rows, warningDays, now = new Date()) {
  const today    = dayStart(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const horizon  = warningHorizon(now, warningDays);
  const out = { expired: [], expires_today: [], expires_soon: [] };
  for (const r of rows) {
    if (!r.expiry_date || r.quantity <= EPS || r.expiry_date >= horizon) continue;
    const status = r.expiry_date < today ? 'expired'
                 : r.expiry_date < tomorrow ? 'expires_today'
                 : 'expires_soon';
    out[status].push(r);
  }
  for (const key of Object.keys(out)) out[key].sort((a, b) => a.expiry_date - b.expiry_date);
  return out;
}

module.exports = {
  BatchError,
  normalizeLot,
  receiveLot,
  allocateFEFO,
  restoreToAllocations,
  recordRestored,
  consumeFromLot,
  applyStockDelta,
  hasLotStock,
  classifyLots,
  warningHorizon,
  dayStart,
};
