'use strict';

const { query, withTransaction } = require('../config/database');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

// ─── reference generator ──────────────────────────────────────────────────────

async function generateReference(client, companyId) {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `PUR-${ymd}-`;
  const { rows: [last] } = await client.query(
    `SELECT reference FROM purchases WHERE company_id=$1 AND reference LIKE $2 ORDER BY id DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_SELECT = `
  SELECT p.*,
         s.name  AS supplier_name,  s.phone AS supplier_phone,
         u.name  AS created_by_name
  FROM purchases p
  LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.company_id = p.company_id
  LEFT JOIN users     u ON u.id = p.created_by
`;

async function getItems(purchaseId) {
  const { rows } = await query(`
    SELECT pi.*,
           pr.name AS product_name_live, pr.sku AS product_sku_live,
           pv.size, pv.color
    FROM purchase_items pi
    LEFT JOIN products         pr ON pr.id = pi.product_id
    LEFT JOIN product_variants pv ON pv.id = pi.variant_id
    WHERE pi.purchase_id = $1
  `, [purchaseId]);
  return rows;
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', supplier = '', status = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const params = [cid];
    const where  = ['p.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.reference ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
    }
    if (supplier) {
      params.push(parseInt(supplier, 10));
      where.push(`p.supplier_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      where.push(`p.purchase_date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      where.push(`p.purchase_date <= $${params.length}`);
    }

    const wStr = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt
       FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id AND s.company_id = p.company_id
       WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${PURCHASE_SELECT} WHERE ${wStr} ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [purchase] } = await query(
      `${PURCHASE_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (!purchase) return error(res, 'Purchase not found.', 404);
    const items = await getItems(purchase.id);
    return success(res, { ...purchase, items });
  } catch (err) { next(err); }
};

// ─── create ───────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const {
      supplier_id, purchase_date, status = 'received',
      discount_amount = 0, tax_amount = 0,
      paid_amount = 0, payment_method = 'cash', notes,
      items = [],
    } = req.body;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems?.length) return error(res, 'At least one item is required.', 422);

    const purchaseId = await withTransaction(async (client) => {
      const reference = await generateReference(client, cid);

      let subtotal = 0;
      const itemRows = parsedItems.map(item => {
        const qty  = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.unit_cost) || 0;
        const tot  = qty * cost;
        subtotal  += tot;
        return { ...item, quantity: qty, unit_cost: cost, total: tot };
      });

      const discAmt = parseFloat(discount_amount) || 0;
      const taxAmt  = parseFloat(tax_amount)      || 0;
      const total   = subtotal - discAmt + taxAmt;
      const paid    = parseFloat(paid_amount)     || 0;
      const due     = Math.max(0, total - paid);

      const { rows: [pur] } = await client.query(`
        INSERT INTO purchases
          (company_id, supplier_id, created_by, reference, purchase_date, status,
           subtotal, discount_amount, tax_amount, total_amount, paid_amount, due_amount, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id
      `, [
        cid, supplier_id || null, req.user.id,
        reference,
        purchase_date || new Date().toISOString().split('T')[0],
        status,
        subtotal, discAmt, taxAmt, total, paid, due,
        notes?.trim() || null,
      ]);

      const pid = pur.id;

      for (const item of itemRows) {
        const productId = parseInt(item.product_id, 10);
        const variantId = item.variant_id ? parseInt(item.variant_id, 10) : null;

        const { rows: [product] } = await client.query(
          'SELECT id, name, sku, track_inventory FROM products WHERE id = $1 AND company_id = $2',
          [productId, cid]
        );
        if (!product) throw new Error(`Product ID ${productId} not found.`);

        await client.query(`
          INSERT INTO purchase_items
            (company_id, purchase_id, product_id, variant_id, product_name, sku, quantity, unit_cost, total)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [cid, pid, productId, variantId, product.name, product.sku, item.quantity, item.unit_cost, item.total]);

        if (status === 'received' && product.track_inventory) {
          if (variantId) {
            await client.query(
              'UPDATE product_variants SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2',
              [item.quantity, variantId]
            );
          } else {
            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2',
              [item.quantity, productId]
            );
          }
        }
      }

      if (supplier_id && due > 0) {
        await client.query(
          'UPDATE suppliers SET current_balance = current_balance + $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
          [due, supplier_id, cid]
        );
      }

      return pid;
    });

    const { rows: [purchase] } = await query(
      `${PURCHASE_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [purchaseId, cid]
    );
    const items_out = await getItems(purchaseId);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'purchases', purchaseId, null, { reference: purchase.reference });
    return created(res, { ...purchase, items: items_out }, 'Purchase created successfully.');
  } catch (err) { next(err); }
};

// ─── update status ────────────────────────────────────────────────────────────

const updateStatus = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);
    const { status } = req.body;

    const VALID = ['ordered', 'received', 'returned', 'cancelled'];
    if (!VALID.includes(status)) return error(res, `Invalid status. Must be one of: ${VALID.join(', ')}.`, 422);

    const { rows: [purchase] } = await query(
      `${PURCHASE_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [id, cid]
    );
    if (!purchase) return error(res, 'Purchase not found.', 404);
    if (purchase.status === status) return error(res, 'Purchase is already in that status.', 409);

    await withTransaction(async (client) => {
      const { rows: items } = await client.query(`
        SELECT pi.product_id, pi.variant_id, pi.quantity,
               pr.track_inventory
        FROM purchase_items pi
        JOIN products pr ON pr.id = pi.product_id
        WHERE pi.purchase_id = $1
      `, [id]);

      if (status === 'received' && purchase.status !== 'received') {
        for (const item of items) {
          if (!item.track_inventory) continue;
          if (item.variant_id) {
            await client.query(
              'UPDATE product_variants SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2',
              [item.quantity, item.variant_id]
            );
          } else {
            await client.query(
              'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
              [item.quantity, item.product_id, cid]
            );
          }
        }
      }

      if (status === 'cancelled' && purchase.status === 'received') {
        for (const item of items) {
          if (!item.track_inventory) continue;
          if (item.variant_id) {
            await client.query(
              'UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at=NOW() WHERE id = $2',
              [item.quantity, item.variant_id]
            );
          } else {
            await client.query(
              'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at=NOW() WHERE id = $2 AND company_id = $3',
              [item.quantity, item.product_id, cid]
            );
          }
        }
      }

      await client.query(
        'UPDATE purchases SET status=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3',
        [status, id, cid]
      );
    });

    const { rows: [updated] } = await query(
      `${PURCHASE_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'purchases', id,
      { status: purchase.status }, { status });
    return success(res, updated, `Purchase marked as ${status}.`);
  } catch (err) { next(err); }
};

// ─── record payment ───────────────────────────────────────────────────────────

const recordPayment = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);
    const { amount, method = 'cash', notes } = req.body;

    const { rows: [purchase] } = await query(
      'SELECT * FROM purchases WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!purchase) return error(res, 'Purchase not found.', 404);

    const pay = parseFloat(amount) || 0;
    if (pay <= 0) return error(res, 'Payment amount must be greater than 0.', 422);
    if (pay > parseFloat(purchase.due_amount)) {
      return error(res, `Payment exceeds due amount of ${parseFloat(purchase.due_amount).toFixed(2)}.`, 422);
    }

    const newPaid = parseFloat(purchase.paid_amount) + pay;
    const newDue  = Math.max(0, parseFloat(purchase.total_amount) - newPaid);

    await withTransaction(async (client) => {
      await client.query(
        'UPDATE purchases SET paid_amount=$1, due_amount=$2, updated_at=NOW() WHERE id=$3 AND company_id=$4',
        [newPaid, newDue, id, cid]
      );
      await client.query(`
        INSERT INTO purchase_payments (company_id, purchase_id, amount, payment_method, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [cid, id, pay, method, notes?.trim() || null, req.user.id]);

      if (purchase.supplier_id) {
        await client.query(
          'UPDATE suppliers SET current_balance = GREATEST(0, current_balance - $1), updated_at=NOW() WHERE id=$2 AND company_id=$3',
          [pay, purchase.supplier_id, cid]
        );
      }
    });

    const { rows: [updated] } = await query(
      `${PURCHASE_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [id, cid]
    );
    return success(res, updated, 'Payment recorded successfully.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, updateStatus, recordPayment };
