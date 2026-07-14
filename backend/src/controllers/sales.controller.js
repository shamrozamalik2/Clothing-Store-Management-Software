'use strict';

const { query, withTransaction } = require('../config/database');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { AUDIT_ACTIONS } = require('../config/constants');
const { logAudit }      = require('../utils/audit');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function generateReference(client, companyId) {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `SAL-${ymd}-`;
  const { rows: [last] } = await client.query(
    `SELECT reference FROM sales WHERE company_id=$1 AND reference LIKE $2 ORDER BY id DESC LIMIT 1`,
    [companyId, `${prefix}%`]
  );
  const seq = last ? parseInt(last.reference.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const SALE_SELECT = `
  SELECT s.*,
         c.name  AS customer_name,  c.phone AS customer_phone,
         u.name  AS cashier_name
  FROM sales s
  LEFT JOIN customers c ON c.id = s.customer_id AND c.company_id = s.company_id
  LEFT JOIN users     u ON u.id = s.created_by
`;

async function getItems(saleId) {
  const { rows } = await query(`
    SELECT si.*,
           pr.name AS product_name_live, pr.sku AS product_sku_live,
           pv.size, pv.color
    FROM sale_items si
    LEFT JOIN products         pr ON pr.id = si.product_id
    LEFT JOIN product_variants pv ON pv.id = si.variant_id
    WHERE si.sale_id = $1
    ORDER BY si.id
  `, [saleId]);
  return rows;
}

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', customer = '', status = '', payment_method = '', date_from = '', date_to = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const params = [cid];
    const where  = ['s.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.reference ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }
    if (customer) {
      params.push(parseInt(customer, 10));
      where.push(`s.customer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`s.status = $${params.length}`);
    }
    if (payment_method) {
      params.push(payment_method);
      where.push(`s.payment_method = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      where.push(`s.sale_date::date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      where.push(`s.sale_date::date <= $${params.length}`);
    }

    const wStr = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id AND c.company_id = s.company_id
       WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${SALE_SELECT} WHERE ${wStr} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [sale] } = await query(
      `${SALE_SELECT} WHERE s.id = $1 AND s.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (!sale) return error(res, 'Sale not found.', 404);
    const items = await getItems(sale.id);
    return success(res, { ...sale, items });
  } catch (err) { next(err); }
};

// ─── create (POS transaction) ─────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const {
      customer_id,
      discount_type   = 'flat',
      discount_amount = 0,
      paid_amount     = 0,
      payment_method  = 'cash',
      card_amount     = 0,
      notes,
      items = [],
    } = req.body;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems?.length) return error(res, 'At least one item is required.', 422);

    let saleId;
    try {
      saleId = await withTransaction(async (client) => {
        const reference = await generateReference(client, cid);
        let subtotal = 0;
        const lineItems = [];

        for (const item of parsedItems) {
          const productId = parseInt(item.product_id, 10);
          const variantId = item.variant_id ? parseInt(item.variant_id, 10) : null;
          const qty       = parseFloat(item.quantity) || 0;

          if (variantId) {
            const { rows: [v] } = await client.query(
              'SELECT pv.*, p.cost_price AS base_cost, p.track_inventory, p.allow_negative, p.name AS product_name, p.sku AS product_sku FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = $1 AND pv.company_id = $2',
              [variantId, cid]
            );
            if (!v) throw new Error(`Variant ${variantId} not found.`);
            const price  = parseFloat(item.unit_price ?? v.sale_price ?? 0);
            const cost   = parseFloat(v.cost_price ?? v.base_cost ?? 0);
            const lineTot = qty * price;
            subtotal += lineTot;

            if (v.track_inventory && !v.allow_negative && parseFloat(v.stock_quantity) < qty) {
              throw new Error(`Insufficient stock for variant (${v.size ?? ''} ${v.color ?? ''}).`.trim());
            }
            lineItems.push({ productId, variantId, qty, price, cost, taxAmt: 0, lineTot, productName: v.product_name, sku: v.sku });
          } else {
            const { rows: [product] } = await client.query(
              'SELECT * FROM products WHERE id = $1 AND company_id = $2 AND is_active = TRUE',
              [productId, cid]
            );
            if (!product) throw new Error(`Product ${productId} not found or inactive.`);
            if (product.track_inventory && !product.allow_negative && parseFloat(product.stock_quantity) < qty) {
              throw new Error(`Insufficient stock for "${product.name}".`);
            }
            const price   = parseFloat(item.unit_price ?? product.sale_price);
            const cost    = parseFloat(product.cost_price) || 0;
            const taxRate = parseFloat(product.tax_rate)   || 0;
            const taxAmt  = qty * price * taxRate / 100;
            const lineTot = qty * price;
            subtotal += lineTot;
            lineItems.push({ productId, variantId: null, qty, price, cost, taxAmt, lineTot, productName: product.name, sku: product.sku });
          }
        }

        const discAmt  = discount_type === 'percent'
          ? subtotal * (parseFloat(discount_amount) || 0) / 100
          : parseFloat(discount_amount) || 0;
        const taxTotal = lineItems.reduce((s, i) => s + i.taxAmt, 0);
        const total    = Math.max(0, subtotal - discAmt + taxTotal);

        const paid = payment_method === 'card'   ? total
                   : payment_method === 'credit' ? 0
                   : payment_method === 'split'  ? Math.min(total, (parseFloat(paid_amount) || 0) + (parseFloat(card_amount) || 0))
                   : parseFloat(paid_amount) || 0;

        const change = Math.max(0, paid - total);
        const due    = Math.max(0, total - paid);

        const { rows: [saleRow] } = await client.query(`
          INSERT INTO sales
            (company_id, customer_id, created_by, reference, status,
             subtotal, discount_amount, tax_amount, total_amount,
             paid_amount, change_amount, due_amount, payment_method, notes)
          VALUES ($1,$2,$3,$4,'completed',$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING id
        `, [
          cid, customer_id || null, req.user.id,
          reference,
          subtotal, discAmt, taxTotal, total, paid, change, due,
          payment_method,
          notes?.trim() || null,
        ]);

        const sid = saleRow.id;

        for (const li of lineItems) {
          await client.query(`
            INSERT INTO sale_items
              (company_id, sale_id, product_id, variant_id, product_name, sku,
               quantity, unit_price, cost_price, discount, tax_amount, total)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11)
          `, [cid, sid, li.productId, li.variantId, li.productName, li.sku,
              li.qty, li.price, li.cost, li.taxAmt, li.lineTot]);

          if (li.variantId) {
            await client.query(
              'UPDATE product_variants SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id = $2',
              [li.qty, li.variantId]
            );
          } else {
            const { rows: [prd] } = await client.query(
              'SELECT track_inventory FROM products WHERE id = $1',
              [li.productId]
            );
            if (prd?.track_inventory) {
              await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
                [li.qty, li.productId, cid]
              );
            }
          }
        }

        if (customer_id && due > 0) {
          await client.query(
            'UPDATE customers SET current_balance = current_balance + $1, updated_at=NOW() WHERE id = $2 AND company_id = $3',
            [due, customer_id, cid]
          );
        }

        return sid;
      });
    } catch (txErr) {
      return error(res, txErr.message, 422);
    }

    const { rows: [sale] } = await query(
      `${SALE_SELECT} WHERE s.id = $1 AND s.company_id = $2`,
      [saleId, cid]
    );
    const items_out = await getItems(saleId);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'sales', saleId, null,
      { reference: sale.reference, total: sale.total_amount });
    return created(res, { ...sale, items: items_out }, 'Sale completed successfully.');
  } catch (err) { next(err); }
};

// ─── void (cancel) ────────────────────────────────────────────────────────────

const voidSale = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [sale] } = await query(
      `${SALE_SELECT} WHERE s.id = $1 AND s.company_id = $2`,
      [id, cid]
    );
    if (!sale) return error(res, 'Sale not found.', 404);
    if (sale.status === 'cancelled') return error(res, 'Sale is already cancelled.', 409);

    await withTransaction(async (client) => {
      const { rows: items } = await client.query(`
        SELECT si.product_id, si.variant_id, si.quantity,
               pr.track_inventory
        FROM sale_items si
        JOIN products pr ON pr.id = si.product_id
        WHERE si.sale_id = $1
      `, [id]);

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

      if (sale.customer_id && parseFloat(sale.due_amount) > 0) {
        await client.query(
          'UPDATE customers SET current_balance = GREATEST(0, current_balance - $1), updated_at=NOW() WHERE id = $2 AND company_id = $3',
          [sale.due_amount, sale.customer_id, cid]
        );
      }

      await client.query(
        "UPDATE sales SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2",
        [id, cid]
      );
    });

    const { rows: [updated] } = await query(
      `${SALE_SELECT} WHERE s.id = $1 AND s.company_id = $2`,
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'sales', id,
      { status: sale.status }, { status: 'cancelled' });
    return success(res, updated, 'Sale cancelled and stock restored.');
  } catch (err) { next(err); }
};

// ─── today's summary ──────────────────────────────────────────────────────────

const todaySummary = async (req, res, next) => {
  try {
    const { rows: [row] } = await query(`
      WITH sales_today AS (
        SELECT
          COUNT(*)::int                   AS sale_count,
          COALESCE(SUM(total_amount), 0)  AS total_revenue,
          COALESCE(SUM(paid_amount),  0)  AS total_paid,
          COALESCE(SUM(due_amount),   0)  AS total_due
        FROM sales
        WHERE company_id = $1
          AND sale_date::date = CURRENT_DATE
          AND status != 'cancelled'
      ),
      returns_today AS (
        SELECT COALESCE(SUM(CASE WHEN type = 'return' THEN refund_amount ELSE 0 END), 0) AS total_refunded
        FROM returns
        WHERE company_id = $1
          AND return_date::date = CURRENT_DATE
      )
      SELECT
        st.sale_count,
        GREATEST(0, st.total_revenue - rt.total_refunded) AS total_revenue,
        GREATEST(0, st.total_paid    - rt.total_refunded) AS total_paid,
        st.total_due,
        rt.total_refunded
      FROM sales_today st, returns_today rt
    `, [req.companyId]);
    return success(res, row);
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, voidSale, todaySummary };
