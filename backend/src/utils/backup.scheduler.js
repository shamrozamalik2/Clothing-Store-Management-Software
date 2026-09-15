'use strict';

const mongoose   = require('mongoose');
const logger     = require('../config/logger');

const INTERVAL_MS      = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 2  * 60 * 1000;
const MAX_SNAPSHOTS    = 10;
const CONCURRENCY      = 5;

function getModel(name) {
  try { return mongoose.model(name); } catch { return null; }
}

async function countDocs(model, filter) {
  try { return model ? await model.countDocuments(filter) : 0; } catch { return 0; }
}

async function backupOneCompany(cid) {
  const Company      = getModel('Company');
  const CompanyBackup = getModel('CompanyBackup');
  if (!CompanyBackup) return;

  const filter = { company_id: cid };

  const [
    categories, brands, suppliers, products, customers,
    sales, purchases, purchasePayments, returns, expenses,
    stockAdjustments,
  ] = await Promise.all([
    countDocs(getModel('Category'),       filter),
    countDocs(getModel('Brand'),          filter),
    countDocs(getModel('Supplier'),       filter),
    countDocs(getModel('Product'),        filter),
    countDocs(getModel('Customer'),       filter),
    countDocs(getModel('Sale'),           filter),
    countDocs(getModel('Purchase'),       filter),
    countDocs(getModel('PurchasePayment'),filter),
    countDocs(getModel('Return'),         filter),
    countDocs(getModel('Expense'),        filter),
    countDocs(getModel('StockAdjustment'),filter),
  ]);

  const counts = { categories, brands, suppliers, products, customers, sales, purchases, purchase_payments: purchasePayments, returns, expenses, stock_adjustments: stockAdjustments };

  const prev = await CompanyBackup.findOne({ company_id: cid }, { row_counts: 1 }).sort({ created_at: -1 }).lean();
  const prevProducts = Number(prev?.row_counts?.products ?? 0);
  if (prevProducts > 0 && counts.products === 0) {
    logger.warn(`[AutoBackup] ALERT company ${cid}: previous snapshot had ${prevProducts} products but DB now has 0.`);
  } else if (prevProducts > 10 && counts.products < prevProducts * 0.5) {
    logger.warn(`[AutoBackup] WARN company ${cid}: products dropped from ${prevProducts} to ${counts.products}.`);
  }

  const filename = `auto-backup-company-${cid}-${new Date().toISOString().slice(0, 10)}.json`;
  await CompanyBackup.create({ company_id: cid, created_by: null, file_name: filename, version: '3.0', row_counts: counts, data: {} });

  // Prune to keep only the last MAX_SNAPSHOTS per company
  const old = await CompanyBackup.find({ company_id: cid }, { _id: 1 }).sort({ created_at: -1 }).skip(MAX_SNAPSHOTS).lean();
  if (old.length) await CompanyBackup.deleteMany({ _id: { $in: old.map(o => o._id) } });

  logger.info(`[AutoBackup] Company ${cid}: ${counts.products} products, ${counts.sales} sales recorded.`);
}

async function runAutoBackup() {
  try {
    const Company = getModel('Company');
    if (!Company) return;
    const companies = await Company.find({ $or: [{ is_active: true }, { is_active: null }] }, { _id: 1 }).lean();

    let saved = 0, failed = 0;
    for (let i = 0; i < companies.length; i += CONCURRENCY) {
      const batch = companies.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(c => backupOneCompany(c._id)));
      for (const r of results) {
        if (r.status === 'fulfilled') saved++;
        else { failed++; logger.error(`[AutoBackup] Company backup failed: ${r.reason?.message}`); }
      }
    }
    logger.info(`[AutoBackup] Done — ${saved} saved, ${failed} failed out of ${companies.length} companies.`);
  } catch (err) {
    logger.error(`[AutoBackup] Fatal error: ${err.message}`);
  }
}

function startAutoBackupScheduler() {
  setTimeout(() => {
    runAutoBackup();
    setInterval(runAutoBackup, INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  logger.info('[AutoBackup] Scheduler started — first backup in 2 min, then every 24 h.');
}

module.exports = { startAutoBackupScheduler };
