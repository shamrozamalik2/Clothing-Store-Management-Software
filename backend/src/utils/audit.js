'use strict';

const AuditLog = require('../models/AuditLog');

async function logAudit(companyId, userId, action, entity = null, entityId = null, extra = {}) {
  try {
    await AuditLog.create({
      company_id: companyId,
      user_id:    userId || null,
      action,
      entity,
      entity_id:  entityId ? String(entityId) : null,
      new_values: Object.keys(extra).length ? extra : undefined,
    });
  } catch { /* audit is non-critical */ }
}

module.exports = { logAudit };
