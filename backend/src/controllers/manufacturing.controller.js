'use strict';

const { query, withTransaction, pool } = require('../config/database');
const { success, created, error }       = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../config/constants');

// ── helpers ────────────────────────────────────────────────────────────────────

async function genBatchRef(client, cid) {
  const d      = new Date();
  const prefix = `PRD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-`;
  const { rows: [last] } = await client.query(
    `SELECT reference FROM production_batches WHERE company_id=$1 AND reference LIKE $2 ORDER BY id DESC LIMIT 1`,
    [cid, `${prefix}%`]
  );
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── BOM endpoints ──────────────────────────────────────────────────────────────

// GET /manufacturing/bom?product_id=
exports.listBOM = async (req, res, next) => {
  try {
    const cid       = req.companyId;
    const productId = req.query.product_id;

    const { rows } = await query(`
      SELECT b.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit,
             rm.name AS raw_material_name, rm.sku AS raw_material_sku,
             rm.stock_quantity AS raw_material_stock, rm.unit AS raw_material_unit,
             rm.cost_price AS raw_material_cost
      FROM bill_of_materials b
      JOIN products p  ON p.id  = b.product_id
      JOIN products rm ON rm.id = b.raw_material_id
      WHERE b.company_id = $1 ${productId ? 'AND b.product_id = $2' : ''}
      ORDER BY p.name, rm.name
    `, productId ? [cid, productId] : [cid]);

    return success(res, rows);
  } catch (err) { next(err); }
};

// GET /manufacturing/bom/:id
exports.getBOM = async (req, res, next) => {
  try {
    const { rows: [bom] } = await query(`
      SELECT b.*, p.name AS product_name, rm.name AS raw_material_name,
             rm.stock_quantity AS raw_material_stock, rm.cost_price AS raw_material_cost
      FROM bill_of_materials b
      JOIN products p  ON p.id  = b.product_id
      JOIN products rm ON rm.id = b.raw_material_id
      WHERE b.id = $1 AND b.company_id = $2
    `, [req.params.id, req.companyId]);
    if (!bom) return error(res, 'BOM entry not found.', 404);
    return success(res, bom);
  } catch (err) { next(err); }
};

// POST /manufacturing/bom
exports.createBOM = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { product_id, raw_material_id, quantity_required, unit } = req.body;

    if (!product_id || !raw_material_id || !quantity_required) {
      return error(res, 'product_id, raw_material_id, quantity_required are required.', 422);
    }

    const { rows: [row] } = await query(`
      INSERT INTO bill_of_materials (company_id, product_id, raw_material_id, quantity_required, unit)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (company_id, product_id, raw_material_id) DO UPDATE
        SET quantity_required = EXCLUDED.quantity_required, unit = EXCLUDED.unit, updated_at = NOW()
      RETURNING *
    `, [cid, product_id, raw_material_id, quantity_required, unit || null]);

    return created(res, row, 'BOM entry saved.');
  } catch (err) { next(err); }
};

// DELETE /manufacturing/bom/:id
exports.deleteBOM = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM bill_of_materials WHERE id=$1 AND company_id=$2',
      [req.params.id, req.companyId]
    );
    if (!rowCount) return error(res, 'BOM entry not found.', 404);
    return success(res, null, 'BOM entry deleted.');
  } catch (err) { next(err); }
};

// GET /manufacturing/products  — finished goods + raw materials list
exports.listProducts = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const type = req.query.type; // 'finished' | 'raw' | undefined (all)

    const where = ['p.company_id = $1', 'p.is_active = TRUE'];
    if (type === 'finished') where.push('p.is_finished_good = TRUE');
    if (type === 'raw')      where.push('p.is_raw_material = TRUE');

    const { rows } = await query(`
      SELECT p.id, p.name, p.sku, p.unit, p.cost_price, p.stock_quantity,
             p.is_raw_material, p.is_finished_good,
             (SELECT COUNT(*) FROM bill_of_materials b WHERE b.product_id = p.id AND b.company_id = p.company_id) AS bom_count
      FROM products p
      WHERE ${where.join(' AND ')}
      ORDER BY p.name
    `, [cid]);
    return success(res, rows);
  } catch (err) { next(err); }
};

// ── Production Batches ─────────────────────────────────────────────────────────

// GET /manufacturing/batches
exports.listBatches = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', date_from = '', date_to = '' } = req.query;

    const params = [cid];
    const where  = ['pb.company_id = $1'];
    if (search) { params.push(`%${search}%`); where.push(`(pb.reference ILIKE $${params.length} OR p.name ILIKE $${params.length})`); }
    if (date_from) { params.push(date_from); where.push(`pb.batch_date >= $${params.length}`); }
    if (date_to)   { params.push(date_to);   where.push(`pb.batch_date <= $${params.length}`); }

    const w = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM production_batches pb JOIN products p ON p.id = pb.product_id WHERE ${w}`, params
    );

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT pb.*, p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit,
             u.name AS created_by_name
      FROM production_batches pb
      JOIN products p ON p.id = pb.product_id
      LEFT JOIN users u ON u.id = pb.created_by
      WHERE ${w}
      ORDER BY pb.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(parseInt(cnt, 10), page, limit) });
  } catch (err) { next(err); }
};

// GET /manufacturing/batches/:id
exports.getBatch = async (req, res, next) => {
  try {
    const { rows: [batch] } = await query(`
      SELECT pb.*, p.name AS product_name, p.sku AS product_sku, u.name AS created_by_name
      FROM production_batches pb
      JOIN products p ON p.id = pb.product_id
      LEFT JOIN users u ON u.id = pb.created_by
      WHERE pb.id = $1 AND pb.company_id = $2
    `, [req.params.id, req.companyId]);
    if (!batch) return error(res, 'Production batch not found.', 404);

    const { rows: materials } = await query(
      'SELECT * FROM production_batch_materials WHERE batch_id = $1 ORDER BY id', [batch.id]
    );
    return success(res, { ...batch, materials });
  } catch (err) { next(err); }
};

// POST /manufacturing/batches  — record a production run
exports.createBatch = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { product_id, quantity_produced, batch_date, notes } = req.body;
    const qty = parseFloat(quantity_produced) || 0;

    if (!product_id || qty <= 0) {
      return error(res, 'product_id and quantity_produced are required.', 422);
    }

    // Load BOM
    const { rows: bomRows } = await query(`
      SELECT b.raw_material_id, b.quantity_required,
             p.name AS raw_material_name, p.cost_price, p.stock_quantity, p.track_inventory
      FROM bill_of_materials b
      JOIN products p ON p.id = b.raw_material_id
      WHERE b.product_id = $1 AND b.company_id = $2
    `, [product_id, cid]);

    if (!bomRows.length) {
      return error(res, 'No BOM defined for this product. Add raw materials first.', 422);
    }

    // Validate stock
    for (const bom of bomRows) {
      const needed = parseFloat(bom.quantity_required) * qty;
      if (bom.track_inventory && parseFloat(bom.stock_quantity) < needed) {
        return error(res, `Insufficient stock for "${bom.raw_material_name}" (need ${needed}, have ${bom.stock_quantity}).`, 422);
      }
    }

    let batchId;
    try {
      batchId = await withTransaction(async (client) => {
        const reference    = await genBatchRef(client, cid);
        let productionCost = 0;

        // Deduct raw materials & calculate cost
        for (const bom of bomRows) {
          const needed   = parseFloat(bom.quantity_required) * qty;
          const lineCost = needed * parseFloat(bom.cost_price || 0);
          productionCost += lineCost;

          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
            [needed, bom.raw_material_id, cid]
          );

          await client.query(`
            INSERT INTO production_batch_materials
              (company_id, batch_id, product_id, product_name, quantity_used, unit_cost, total_cost)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [cid, 0, bom.raw_material_id, bom.raw_material_name, needed, bom.cost_price, lineCost]);
        }

        const { rows: [batch] } = await client.query(`
          INSERT INTO production_batches
            (company_id, product_id, reference, quantity_produced, production_cost, batch_date, status, notes, created_by)
          VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8)
          RETURNING id
        `, [cid, product_id, reference, qty, productionCost, batch_date || new Date().toISOString().slice(0, 10), notes || null, req.user.id]);

        // Fix batch_id on materials (inserted with placeholder 0 above)
        await client.query(
          'UPDATE production_batch_materials SET batch_id=$1 WHERE batch_id=0 AND company_id=$2',
          [batch.id, cid]
        );

        // Add finished goods to inventory
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
          [qty, product_id, cid]
        );

        // Update product cost price based on production cost per unit
        const unitCost = productionCost / qty;
        await client.query(
          'UPDATE products SET cost_price=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
          [unitCost, product_id, cid]
        );

        return batch.id;
      });
    } catch (txErr) {
      return error(res, txErr.message, 422);
    }

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'production_batches', batchId, null, { product_id, qty });
    const { rows: [batch] } = await query('SELECT * FROM production_batches WHERE id=$1', [batchId]);
    return created(res, batch, 'Production batch recorded successfully.');
  } catch (err) { next(err); }
};
