'use strict';

const { query } = require('../config/database');
const logger    = require('../config/logger');

const RETENTION_DAYS   = 90;
const INTERVAL_MS      = 24 * 60 * 60 * 1000; // 24 hours
const STARTUP_DELAY_MS = 3  * 60 * 1000;       // wait 3 min after boot (after backup scheduler)

async function runAuditCleanup() {
  try {
    const { rowCount } = await query(
      `DELETE FROM audit_logs
       WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [RETENTION_DAYS]
    );
    if (rowCount > 0) {
      logger.info(`[AuditCleanup] Deleted ${rowCount} audit log rows older than ${RETENTION_DAYS} days.`);
    }
  } catch (err) {
    logger.error(`[AuditCleanup] Error: ${err.message}`);
  }
}

function startAuditCleanupScheduler() {
  setTimeout(() => {
    runAuditCleanup();
    setInterval(runAuditCleanup, INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  logger.info(`[AuditCleanup] Scheduler started — logs older than ${RETENTION_DAYS} days will be pruned daily.`);
}

module.exports = { startAuditCleanupScheduler };
