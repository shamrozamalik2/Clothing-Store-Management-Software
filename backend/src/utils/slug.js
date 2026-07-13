'use strict';

const { query } = require('../config/database');

function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(table, companyId, slug, excludeId = null) {
  let candidate = slug;
  let counter   = 1;
  while (true) {
    const sql    = excludeId
      ? `SELECT id FROM ${table} WHERE company_id = $1 AND slug = $2 AND id != $3`
      : `SELECT id FROM ${table} WHERE company_id = $1 AND slug = $2`;
    const params = excludeId ? [companyId, candidate, excludeId] : [companyId, candidate];
    const { rows } = await query(sql, params);
    if (!rows[0]) return candidate;
    counter++;
    candidate = `${slug}-${counter}`;
  }
}

module.exports = { toSlug, uniqueSlug };
