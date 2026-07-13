'use strict';

const { query } = require('../config/database');

function generateSku(name) {
  const words = name.toUpperCase().trim().split(/\s+/);
  const abbr  = words.slice(0, 3).map(w => w.replace(/[^A-Z0-9]/g, '').slice(0, 3)).join('-');
  const num   = String(Date.now()).slice(-4);
  return `${abbr}-${num}`;
}

async function uniqueSku(companyId, base, excludeId = null) {
  let candidate = base;
  let counter   = 1;
  while (true) {
    const sql    = excludeId
      ? 'SELECT id FROM products WHERE company_id = $1 AND sku = $2 AND id != $3'
      : 'SELECT id FROM products WHERE company_id = $1 AND sku = $2';
    const params = excludeId ? [companyId, candidate, excludeId] : [companyId, candidate];
    const { rows } = await query(sql, params);
    if (!rows[0]) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

module.exports = { generateSku, uniqueSku };
