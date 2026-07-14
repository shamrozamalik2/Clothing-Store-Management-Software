'use strict';

const { query, withTransaction } = require('../config/database');
const { success, error }         = require('../utils/response');
const { logAudit }               = require('../utils/audit');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function generateReference(client, companyId) {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `RET-${ymd}-`;
  const { rows: [last] } = await client.query(
    `SELECT reference FROM returns WHERE company_id=$1 AND reference LIKE $2 ORDER BY id DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── POST /returns ─────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const {
      sale_id,
      type           = 'return',   // 'return' | 'exchange'
      reason         = '',
      refund_method  = 'cash',
      return_items   = [],
      exchange_items = [],
    } = req.body;

    if (!sale_id)           return error(res, 'sale_id is required.', 422);
    if (!return_items.length) return error(res, 'At least one return item is required.', 422);

    let returnId;
    try {
      returnId = await withTransaction(async (client) => {
        // 1. Validate original sale
        const { rows: [sale] } = await client.query(
          `SELECT * FROM sales WHERE id = $1 AND company_id = $2`,
          [sale_id, cid]
        );
        if (!sale)                     throw new Error('Original sale not found.');
        if (sale.status === 'cancelled') throw new Error('Cannot return a cancelled sale.');

        // 2. Process return items — validate qty and restore stock
        let returnTotal = 0;
        const resolvedReturn = [];

        for (const ri of return_items) {
          const qty = parseFloat(ri.quantity);
          if (!qty || qty <= 0) throw new Error('Return quantity must be greater than 0.');

          // Fetch the original sale_item with its product's track_inventory flag
          const { rows: [saleItem] } = await client.query(`
            SELECT si.*, pr.track_inventory
            FROM sale_items si
            JOIN products pr ON pr.id = si.product_id
            WHERE si.id = $1 AND si.sale_id = $2 AND si.company_id = $3
          `, [ri.sale_item_id, sale_id, cid]);
          if (!saleItem) throw new Error(`Sale item ${ri.sale_item_id} not found in this sale.`);

          // Check how much has already been returned for this item
          const { rows: [{ already }] } = await client.query(`
            SELECT COALESCE(SUM(ri2.quantity), 0) AS already
            FROM return_items ri2
            JOIN returns r ON r.id = ri2.return_id
            WHERE ri2.sale_item_id = $1 AND r.company_id = $2
          `, [ri.sale_item_id, cid]);

          const maxReturnable = parseFloat(saleItem.quantity) - parseFloat(already);
          if (qty > maxReturnable + 0.0001) {
            throw new Error(
              `Cannot return ${qty} of "${saleItem.product_name}" — only ${maxReturnable} unit(s) are returnable.`
            );
          }

          // Restore stock
          if (saleItem.track_inventory) {
            if (saleItem.variant_id) {
              await client.query(
                'UPDATE product_variants SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2',
                [qty, saleItem.variant_id]
              );
            } else {
              await client.query(
                'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
                [qty, saleItem.product_id, cid]
              );
            }
          }

          const lineTotal = qty * parseFloat(saleItem.unit_price);
          returnTotal += lineTotal;
          resolvedReturn.push({ ...saleItem, returnQty: qty, lineTotal });
        }

        // 3. Process exchange items — deduct stock for items given out
        let exchangeTotal = 0;
        const resolvedExchange = [];

        if (type === 'exchange') {
          for (const ei of exchange_items) {
            const qty   = parseFloat(ei.quantity);
            const price = parseFloat(ei.unit_price);
            if (!qty || qty <= 0) throw new Error('Exchange quantity must be greater than 0.');

            if (ei.variant_id) {
              const { rows: [v] } = await client.query(`
                SELECT pv.*, p.track_inventory, p.allow_negative, p.name AS product_name
                FROM product_variants pv JOIN products p ON p.id = pv.product_id
                WHERE pv.id = $1 AND pv.company_id = $2
              `, [ei.variant_id, cid]);
              if (!v) throw new Error(`Variant ${ei.variant_id} not found.`);
              if (v.track_inventory && !v.allow_negative && parseFloat(v.stock_quantity) < qty) {
                throw new Error(`Insufficient stock for "${v.product_name}" (${[v.size, v.color].filter(Boolean).join(' ')})`);
              }
              await client.query(
                'UPDATE product_variants SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id = $2',
                [qty, ei.variant_id]
              );
              const total = qty * price;
              exchangeTotal += total;
              resolvedExchange.push({
                product_id: ei.product_id, variant_id: ei.variant_id,
                product_name: `${v.product_name} (${[v.size, v.color].filter(Boolean).join(' ')})`.trim(),
                sku: v.sku, quantity: qty, unit_price: price, total,
              });
            } else {
              const { rows: [product] } = await client.query(
                'SELECT * FROM products WHERE id = $1 AND company_id = $2 AND is_active = TRUE',
                [ei.product_id, cid]
              );
              if (!product) throw new Error(`Product ${ei.product_id} not found.`);
              if (product.track_inventory && !product.allow_negative && parseFloat(product.stock_quantity) < qty) {
                throw new Error(`Insufficient stock for "${product.name}".`);
              }
              if (product.track_inventory) {
                await client.query(
                  'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
                  [qty, ei.product_id, cid]
                );
              }
              const total = qty * price;
              exchangeTotal += total;
              resolvedExchange.push({
                product_id: ei.product_id, variant_id: null,
                product_name: product.name, sku: product.sku,
                quantity: qty, unit_price: price, total,
              });
            }
          }
        }

        const refundAmount = returnTotal - exchangeTotal;

        // 4. Insert return record
        const ref = await generateReference(client, cid);
        const { rows: [row] } = await client.query(`
          INSERT INTO returns
            (company_id, sale_id, reference, return_date,
             type, reason, refund_method,
             total_amount, refund_amount, exchange_total,
             created_by)
          VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10)
          RETURNING id
        `, [
          cid, sale_id, ref,
          type, reason?.trim() || null, refund_method,
          returnTotal, refundAmount, exchangeTotal,
          req.user.id,
        ]);
        const rid = row.id;

        // 5. Insert return_items
        for (const ri of resolvedReturn) {
          await client.query(`
            INSERT INTO return_items
              (company_id, return_id, sale_item_id, product_id, variant_id,
               product_name, sku, quantity, unit_price, total)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          `, [cid, rid, ri.id, ri.product_id, ri.variant_id,
              ri.product_name, ri.sku, ri.returnQty, ri.unit_price, ri.lineTotal]);
        }

        // 6. Insert exchange_items
        for (const ei of resolvedExchange) {
          await client.query(`
            INSERT INTO exchange_items
              (company_id, return_id, product_id, variant_id,
               product_name, sku, quantity, unit_price, total)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `, [cid, rid, ei.product_id, ei.variant_id,
              ei.product_name, ei.sku, ei.quantity, ei.unit_price, ei.total]);
        }

        // 7. Update sale status based on return type
        if (type === 'exchange') {
          await client.query(
            "UPDATE sales SET status='exchanged', updated_at=NOW() WHERE id=$1 AND company_id=$2",
            [sale_id, cid]
          );
        } else {
          // Mark as 'refunded' only when all items are fully returned
          const { rows: itemChecks } = await client.query(`
            SELECT si.id, si.quantity::float,
                   COALESCE(SUM(ri2.quantity::float), 0) AS returned
            FROM sale_items si
            LEFT JOIN return_items ri2 ON ri2.sale_item_id = si.id
            WHERE si.sale_id = $1
            GROUP BY si.id, si.quantity
          `, [sale_id]);

          const fullyReturned = itemChecks.length > 0 &&
            itemChecks.every(i => i.returned >= i.quantity - 0.0001);

          if (fullyReturned) {
            await client.query(
              "UPDATE sales SET status='refunded', updated_at=NOW() WHERE id=$1 AND company_id=$2",
              [sale_id, cid]
            );
          }
        }

        return rid;
      });
    } catch (txErr) {
      return error(res, txErr.message, 422);
    }

    await logAudit(cid, req.user.id, 'create', 'returns', returnId);
    return success(res, { id: returnId }, 'Return processed and stock updated.', 201);
  } catch (err) { next(err); }
};

// ─── GET /returns ──────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '25', 10));
    const off   = (page - 1) * limit;

    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*)::int AS total FROM returns WHERE company_id = $1`,
      [cid]
    );

    const { rows } = await query(`
      SELECT r.*,
             s.reference  AS sale_reference,
             c.name       AS customer_name,
             u.name       AS created_by_name
      FROM returns r
      LEFT JOIN sales     s ON s.id = r.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id AND c.company_id = r.company_id
      LEFT JOIN users     u ON u.id = r.created_by
      WHERE r.company_id = $1
      ORDER BY r.return_date DESC, r.id DESC
      LIMIT $2 OFFSET $3
    `, [cid, limit, off]);

    return success(res, {
      returns: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ─── GET /returns/:id ─────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const cid = req.companyId;

    const { rows: [ret] } = await query(`
      SELECT r.*,
             s.reference  AS sale_reference,
             c.name       AS customer_name,
             u.name       AS created_by_name
      FROM returns r
      LEFT JOIN sales     s ON s.id = r.sale_id
      LEFT JOIN customers c ON c.id = s.customer_id AND c.company_id = r.company_id
      LEFT JOIN users     u ON u.id = r.created_by
      WHERE r.id = $1 AND r.company_id = $2
    `, [req.params.id, cid]);

    if (!ret) return error(res, 'Return not found.', 404);

    const { rows: returnItems } = await query(`
      SELECT ri.*, pv.size, pv.color
      FROM return_items ri
      LEFT JOIN product_variants pv ON pv.id = ri.variant_id
      WHERE ri.return_id = $1 ORDER BY ri.id
    `, [ret.id]);

    const { rows: exchangeItems } = await query(`
      SELECT ei.*, pv.size, pv.color
      FROM exchange_items ei
      LEFT JOIN product_variants pv ON pv.id = ei.variant_id
      WHERE ei.return_id = $1 ORDER BY ei.id
    `, [ret.id]);

    return success(res, { ...ret, return_items: returnItems, exchange_items: exchangeItems });
  } catch (err) { next(err); }
};

module.exports = { create, list, getOne };
