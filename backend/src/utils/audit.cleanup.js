'use strict';

const AuditLog = require('../models/AuditLog');
const logger   = require('../config/logger');

const RETENTION_DAYS   = 90;
const INTERVAL_MS      = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 3  * 60 * 1000;

async function runAuditCleanup() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await AuditLog.deleteMany({ created_at: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      logger.info(`[AuditCleanup] Deleted ${result.deletedCount} audit log entries older than ${RETENTION_DAYS} days.`);
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
