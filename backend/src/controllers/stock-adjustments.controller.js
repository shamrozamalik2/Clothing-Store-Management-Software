'use strict';

const { query, withTransaction } = require('../config/database');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function generateReference(client, companyId) {
  const date = new Date();
  const ymd  = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = `ADJ-${ymd}-`;
  const { rows: [last] } = await client.query(
    `SELECT reference FROM stock_adjustments WHERE company_id=$1 AND reference LIKE $2 ORDER BY id DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const ADJ_SELECT = `
  SELECT sa.*, u.name AS created_by_name
  FROM stock_adjustments sa
  LEFT JOIN users u ON u.id = sa.created_by
`;

async function getItems(adjustmentId) {
  const { rows } = await query(`
    SELECT sai.*,
           pr.name AS product_name_live, pr.sku AS product_sku_live,
           pv.size, pv.color
    FROM stock_adjustment_items sai
    LEFT JOIN products         pr ON pr.id = sai.product_id
    LEFT JOIN product_variants pv ON pv.id = sai.variant_id
    WHERE sai.adjustment_id = $1
  `, [adjustmentId]);
  return rows;
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', type = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const params = [cid];
    const where  = ['sa.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(sa.reference ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }
    if (type) {
      params.push(type);
      where.push(`sa.type = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      where.push(`sa.created_at::date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      where.push(`sa.created_at::date <= $${params.length}`);
    }

    const wStr = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM stock_adjustments sa LEFT JOIN users u ON u.id = sa.created_by WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${ADJ_SELECT} WHERE ${wStr} ORDER BY sa.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [adj] } = await query(
      `${ADJ_SELECT} WHERE sa.id = $1 AND sa.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (!adj) return error(res, 'Adjustment not found.', 404);
    const items = await getItems(adj.id);
    return success(res, { ...adj, items });
  } catch (err) { next(err); }
};

// ─── create ───────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { type = 'adjustment', reason, notes, items = [] } = req.body;

    const VALID_TYPES = ['adjustment', 'damage', 'loss', 'return'];
    if (!VALID_TYPES.includes(type)) {
      return error(res, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}.`, 422);
    }

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems?.length) return error(res, 'At least one item is required.', 422);

    const adjId = await withTransaction(async (client) => {
      const reference = await generateReference(client, cid);

      const { rows: [adjRow] } = await client.query(`
        INSERT INTO stock_adjustments (company_id, reference, type, reason, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id
      `, [cid, reference, type, reason?.trim() || null, notes?.trim() || null, req.user.id]);

      const aid = adjRow.id;

      for (const item of parsedItems) {
        const productId = parseInt(item.product_id, 10);
        const variantId = item.variant_id ? parseInt(item.variant_id, 10) : null;
        const qty       = parseFloat(item.quantity) || 0;

        let currentStock;
        let productName;
        let productSku;

        if (variantId) {
          const { rows: [v] } = await client.query(
            'SELECT pv.stock_quantity, p.name, p.sku FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = $1 AND pv.company_id = $2',
            [variantId, cid]
          );
          if (!v) throw new Error(`Variant ID ${variantId} not found.`);
          currentStock = parseFloat(v.stock_quantity);
          productName  = v.name;
          productSku   = v.sku;
        } else {
          const { rows: [p] } = await client.query(
            'SELECT stock_quantity, name, sku FROM products WHERE id = $1 AND company_id = $2',
            [productId, cid]
          );
          if (!p) throw new Error(`Product ID ${productId} not found.`);
          currentStock = parseFloat(p.stock_quantity);
          productName  = p.name;
          productSku   = p.sku;
        }

        const newQty = Math.max(0, currentStock + qty);

        await client.query(`
          INSERT INTO stock_adjustment_items
            (company_id, adjustment_id, product_id, variant_id, product_name, sku,
             quantity_before, quantity_adjusted, quantity_after)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [cid, aid, productId, variantId, productName, productSku,
            currentStock, qty, newQty]);

        if (variantId) {
          await client.query(
            'UPDATE product_variants SET stock_quantity=$1, updated_at=NOW() WHERE id=$2',
            [newQty, variantId]
          );
        } else {
          await client.query(
            'UPDATE products SET stock_quantity=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
            [newQty, productId, cid]
          );
        }
      }

      return aid;
    });

    const { rows: [adj] } = await query(
      `${ADJ_SELECT} WHERE sa.id = $1 AND sa.company_id = $2`,
      [adjId, cid]
    );
    const items_out = await getItems(adjId);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'stock_adjustments', adjId, null, { reference: adj.reference });
    return created(res, { ...adj, items: items_out }, 'Stock adjustment created successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create };
