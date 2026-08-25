'use strict';

const { query } = require('../config/database');
const logger    = require('../config/logger');

const INTERVAL_MS      = 24 * 60 * 60 * 1000; // 24 hours
const STARTUP_DELAY_MS = 2  * 60 * 1000;       // wait 2 min after boot
const MAX_SNAPSHOTS    = 10;
const CONCURRENCY      = 5;                     // companies backed up in parallel

async function backupOneCompany(cid) {
  const [
    { rows: categories },
    { rows: brands },
    { rows: suppliers },
    { rows: products },
    { rows: productVariants },
    { rows: customers },
    { rows: sales },
    { rows: saleItems },
    { rows: purchases },
    { rows: purchaseItems },
    { rows: purchasePayments },
    { rows: returns },
    { rows: returnItems },
    { rows: exchangeItems },
    { rows: expenseCategories },
    { rows: expenses },
    { rows: stockAdjustments },
    { rows: stockAdjustmentItems },
    { rows: settings },
  ] = await Promise.all([
    query(`SELECT * FROM categories             WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM brands                 WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM suppliers              WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM products               WHERE company_id=$1`, [cid]),
    query(`SELECT pv.* FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.company_id=$1`, [cid]),
    query(`SELECT * FROM customers              WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM sales                  WHERE company_id=$1`, [cid]),
    query(`SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.company_id=$1`, [cid]),
    query(`SELECT * FROM purchases              WHERE company_id=$1`, [cid]),
    query(`SELECT pi.* FROM purchase_items pi JOIN purchases p ON p.id=pi.purchase_id WHERE p.company_id=$1`, [cid]),
    query(`SELECT * FROM purchase_payments      WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM returns                WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM return_items           WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM exchange_items         WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM expense_categories     WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM expenses               WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM stock_adjustments      WHERE company_id=$1`, [cid]),
    query(`SELECT * FROM stock_adjustment_items WHERE company_id=$1`, [cid]),
    query(`SELECT key,value,type,group_name,label FROM settings WHERE company_id=$1`, [cid]),
  ]);

  const counts = {
    categories: categories.length, brands: brands.length,
    suppliers: suppliers.length, products: products.length,
    product_variants: productVariants.length, customers: customers.length,
    sales: sales.length, sale_items: saleItems.length,
    purchases: purchases.length, purchase_items: purchaseItems.length,
    purchase_payments: purchasePayments.length,
    returns: returns.length, return_items: returnItems.length,
    exchange_items: exchangeItems.length,
    expense_categories: expenseCategories.length, expenses: expenses.length,
    stock_adjustments: stockAdjustments.length,
    stock_adjustment_items: stockAdjustmentItems.length,
  };

  const data = {
    settings, categories, brands, suppliers,
    products, product_variants: productVariants, customers,
    sales, sale_items: saleItems,
    purchases, purchase_items: purchaseItems, purchase_payments: purchasePayments,
    returns, return_items: returnItems, exchange_items: exchangeItems,
    expense_categories: expenseCategories, expenses,
    stock_adjustments: stockAdjustments, stock_adjustment_items: stockAdjustmentItems,
  };

  const filename = `auto-backup-company-${cid}-${new Date().toISOString().slice(0, 10)}.json`;

  // Warn if product count dropped sharply vs previous snapshot
  try {
    const { rows: [prev] } = await query(
      `SELECT row_counts->>'products' AS prev_products
       FROM company_backups WHERE company_id=$1
       ORDER BY created_at DESC LIMIT 1`,
      [cid]
    );
    const prevCount = Number(prev?.prev_products ?? 0);
    if (prevCount > 0 && counts.products === 0) {
      logger.warn(
        `[AutoBackup] ALERT company ${cid}: previous snapshot had ${prevCount} products ` +
        `but DB now has 0 — investigate data loss immediately.`
      );
    } else if (prevCount > 10 && counts.products < prevCount * 0.5) {
      logger.warn(
        `[AutoBackup] WARN company ${cid}: products dropped from ${prevCount} to ${counts.products}.`
      );
    }
  } catch (_) { /* comparison is best-effort */ }

  await query(
    `INSERT INTO company_backups (company_id, created_by, file_name, version, row_counts, data)
     VALUES ($1, NULL, $2, '2.0', $3::jsonb, $4::jsonb)`,
    [cid, filename, JSON.stringify(counts), JSON.stringify(data)]
  );

  // Prune to keep only the last MAX_SNAPSHOTS per company
  await query(
    `DELETE FROM company_backups
     WHERE company_id=$1
       AND id NOT IN (
         SELECT id FROM company_backups WHERE company_id=$1
         ORDER BY created_at DESC LIMIT $2
       )`,
    [cid, MAX_SNAPSHOTS]
  );

  logger.info(`[AutoBackup] Company ${cid}: ${counts.products} products, ${counts.sales} sales saved.`);
}

async function runAutoBackup() {
  try {
    const { rows: companies } = await query(
      `SELECT id FROM companies WHERE is_active = TRUE OR is_active IS NULL`
    );

    let saved = 0;
    let failed = 0;

    // Process in batches of CONCURRENCY to avoid overwhelming the DB
    for (let i = 0; i < companies.length; i += CONCURRENCY) {
      const batch = companies.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(({ id: cid }) => backupOneCompany(cid))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') saved++;
        else {
          failed++;
          logger.error(`[AutoBackup] Company backup failed: ${r.reason?.message}`);
        }
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
