'use strict';

const Product = require('../models/Product');

function generateSku(name) {
  const words = name.toUpperCase().trim().split(/\s+/);
  const abbr  = words.slice(0, 3).map(w => w.replace(/[^A-Z0-9]/g, '').slice(0, 3)).join('-');
  const num   = String(Date.now()).slice(-4);
  return `${abbr}-${num}`;
}

// base: candidate SKU string, companyId: ObjectId or string
async function uniqueSku(base, companyId, excludeId = null) {
  let candidate = base;
  let counter   = 1;
  while (true) {
    const filter = { company_id: companyId, sku: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Product.findOne(filter, { _id: 1 }).lean();
    if (!exists) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

module.exports = { generateSku, uniqueSku };
