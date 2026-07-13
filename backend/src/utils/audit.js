'use strict';

const { query } = require('../config/database');

async function logAudit(companyId, userId, action, entity = null, entityId = null, extra = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity, entity_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [companyId, userId, action, entity, entityId, JSON.stringify(extra)]
    );
  } catch { /* audit is non-critical */ }
}

module.exports = { logAudit };
