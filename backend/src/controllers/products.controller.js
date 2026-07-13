'use strict';

const { validationResult }          = require('express-validator');
const { query, withTransaction }    = require('../config/database');
const { generateSku, uniqueSku }    = require('../utils/sku');
const { AUDIT_ACTIONS }             = require('../config/constants');
const { success, created, error }   = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit }                  = require('../utils/audit');

// ─── helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_SELECT = `
  SELECT p.*,
         c.name AS category_name,
         b.name AS brand_name,
         CASE
           WHEN p.stock_quantity <= 0                THEN 'out_of_stock'
           WHEN p.stock_quantity <= p.low_stock_alert THEN 'low_stock'
           ELSE 'in_stock'
         END AS stock_status
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id AND c.company_id = p.company_id
  LEFT JOIN brands     b ON b.id = p.brand_id     AND b.company_id = p.company_id
`;

const ALLOWED_SORT = {
  name:    'p.name',
  sku:     'p.sku',
  stock:   'p.stock_quantity',
  price:   'p.sale_price',
  created: 'p.created_at',
};

// ─── list ─────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const {
      search = '', category = '', brand = '',
      stock_status = '', status = '',
      sort = 'name', order = 'asc',
    } = req.query;

    const params = [cid];
    const where  = ['p.company_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }
    if (category) {
      params.push(parseInt(category, 10));
      where.push(`p.category_id = $${params.length}`);
    }
    if (brand) {
      params.push(parseInt(brand, 10));
      where.push(`p.brand_id = $${params.length}`);
    }
    if (status !== '') {
      params.push(status === 'active');
      where.push(`p.is_active = $${params.length}`);
    }
    if (stock_status === 'out_of_stock') where.push('p.stock_quantity <= 0');
    if (stock_status === 'low_stock')    where.push('p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_alert');
    if (stock_status === 'in_stock')     where.push('p.stock_quantity > p.low_stock_alert');

    const sortCol = ALLOWED_SORT[sort] ?? 'p.name';
    const sortDir = order === 'desc' ? 'DESC' : 'ASC';
    const wStr    = where.join(' AND ');

    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM products p WHERE ${wStr}`,
      params
    );
    const total = parseInt(cnt, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `${PRODUCT_SELECT} WHERE ${wStr} ORDER BY ${sortCol} ${sortDir} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─── get one ──────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const { rows: [product] } = await query(
      `${PRODUCT_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (!product) return error(res, 'Product not found.', 404);

    const { rows: variants } = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY size, color',
      [product.id]
    );
    return success(res, { ...product, variants });
  } catch (err) { next(err); }
};

// ─── get by barcode / SKU ─────────────────────────────────────────────────────

const getByBarcode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { rows: [product] } = await query(
      `${PRODUCT_SELECT} WHERE (p.barcode = $1 OR p.sku = $1) AND p.is_active = TRUE AND p.company_id = $2`,
      [code, req.companyId]
    );
    if (!product) return error(res, 'Product not found.', 404);

    const { rows: variants } = await query(
      'SELECT * FROM product_variants WHERE product_id = $1',
      [product.id]
    );
    return success(res, { ...product, variants });
  } catch (err) { next(err); }
};

// ─── create ───────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 422, errs.array());

    const cid = req.companyId;
    const {
      name, sku: skuInput, barcode,
      category_id, brand_id, description,
      cost_price = 0, sale_price = 0, wholesale_price = 0, tax_rate = 0,
      unit = 'pcs', stock_quantity = 0, low_stock_alert = 5,
      track_inventory = true, allow_negative = false,
      variants = [],
    } = req.body;

    const baseSku = skuInput?.trim() || generateSku(name);
    const sku     = await uniqueSku(cid, baseSku);

    if (barcode) {
      const { rows: [dup] } = await query(
        'SELECT id FROM products WHERE barcode = $1 AND company_id = $2',
        [barcode.trim(), cid]
      );
      if (dup) return error(res, 'Barcode already in use by another product.', 409);
    }

    const image = req.file ? `/uploads/products/${req.file.filename}` : null;
    const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : (variants || []);

    const productId = await withTransaction(async (client) => {
      const { rows: [row] } = await client.query(`
        INSERT INTO products
          (company_id, name, sku, barcode, category_id, brand_id, description, image,
           cost_price, sale_price, wholesale_price, tax_rate,
           unit, stock_quantity, low_stock_alert, track_inventory, allow_negative, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE)
        RETURNING id
      `, [
        cid, name.trim(), sku, barcode?.trim() || null,
        category_id || null, brand_id || null,
        description || null, image,
        parseFloat(cost_price) || 0,
        parseFloat(sale_price) || 0,
        parseFloat(wholesale_price) || 0,
        parseFloat(tax_rate) || 0,
        unit,
        parseFloat(stock_quantity) || 0,
        parseFloat(low_stock_alert) || 5,
        Boolean(track_inventory),
        Boolean(allow_negative),
      ]);

      const pid = row.id;

      for (const v of parsedVariants) {
        const varSku = await uniqueSku(cid, `${sku}-${v.size || v.color || 'VAR'}`);
        await client.query(`
          INSERT INTO product_variants
            (product_id, sku, barcode, size, color, cost_price, sale_price, stock_quantity, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
        `, [
          pid, varSku, v.barcode?.trim() || null,
          v.size || null, v.color || null,
          parseFloat(v.cost_price) || parseFloat(cost_price) || 0,
          parseFloat(v.sale_price) || parseFloat(sale_price) || 0,
          parseFloat(v.stock_quantity) || 0,
        ]);
      }

      return pid;
    });

    const { rows: [product] } = await query(
      `${PRODUCT_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [productId, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'products', productId, null, { name: product.name, sku: product.sku });
    return created(res, product, 'Product created successfully.');
  } catch (err) { next(err); }
};

// ─── update ───────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 422, errs.array());

    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [existing] } = await query(
      'SELECT * FROM products WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!existing) return error(res, 'Product not found.', 404);

    const {
      name, sku: skuInput, barcode, category_id, brand_id, description,
      cost_price, sale_price, wholesale_price, tax_rate,
      unit, stock_quantity, low_stock_alert,
      track_inventory, allow_negative, is_active,
    } = req.body;

    let newSku = existing.sku;
    if (skuInput && skuInput.trim() !== existing.sku) {
      newSku = await uniqueSku(cid, skuInput.trim(), id);
    }

    if (barcode && barcode.trim() !== existing.barcode) {
      const { rows: [dup] } = await query(
        'SELECT id FROM products WHERE barcode = $1 AND company_id = $2 AND id != $3',
        [barcode.trim(), cid, id]
      );
      if (dup) return error(res, 'Barcode already in use by another product.', 409);
    }

    const newImage = req.file ? `/uploads/products/${req.file.filename}` : existing.image;
    const num = (val, fallback) => {
      if (val === null || val === undefined || val === '') return fallback;
      const n = parseFloat(val);
      return isNaN(n) ? fallback : n;
    };

    const { rows: [product] } = await query(`
      UPDATE products SET
        name=$3, sku=$4, barcode=$5, category_id=$6, brand_id=$7, description=$8, image=$9,
        cost_price=$10, sale_price=$11, wholesale_price=$12, tax_rate=$13,
        unit=$14, stock_quantity=$15, low_stock_alert=$16,
        track_inventory=$17, allow_negative=$18, is_active=$19, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [
      id, cid,
      (name ?? existing.name).trim(),
      newSku,
      barcode !== undefined ? (barcode?.trim() || null) : existing.barcode,
      category_id !== undefined ? (category_id || null) : existing.category_id,
      brand_id    !== undefined ? (brand_id    || null) : existing.brand_id,
      description !== undefined ? (description || null) : existing.description,
      newImage,
      num(cost_price,      existing.cost_price),
      num(sale_price,      existing.sale_price),
      num(wholesale_price, existing.wholesale_price),
      num(tax_rate,        existing.tax_rate),
      unit ?? existing.unit,
      num(stock_quantity,  existing.stock_quantity),
      num(low_stock_alert, existing.low_stock_alert),
      track_inventory !== undefined ? Boolean(track_inventory) : existing.track_inventory,
      allow_negative  !== undefined ? Boolean(allow_negative)  : existing.allow_negative,
      is_active       !== undefined ? Boolean(is_active)       : existing.is_active,
    ]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'products', id,
      { name: existing.name }, { name: product.name });

    const { rows: [full] } = await query(
      `${PRODUCT_SELECT} WHERE p.id = $1 AND p.company_id = $2`,
      [id, cid]
    );
    return success(res, full, 'Product updated successfully.');
  } catch (err) { next(err); }
};

// ─── remove (soft) ────────────────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [product] } = await query(
      'SELECT id, name FROM products WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!product) return error(res, 'Product not found.', 404);

    await query(
      'UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND company_id=$2',
      [id, cid]
    );
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'products', id, { name: product.name });
    return success(res, null, 'Product deactivated successfully.');
  } catch (err) { next(err); }
};

// ─── low stock list ───────────────────────────────────────────────────────────

const lowStock = async (req, res, next) => {
  try {
    const { rows } = await query(
      `${PRODUCT_SELECT}
       WHERE p.company_id = $1 AND p.is_active = TRUE AND p.track_inventory = TRUE
             AND p.stock_quantity <= p.low_stock_alert
       ORDER BY p.stock_quantity ASC LIMIT 50`,
      [req.companyId]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

// ─── variants ─────────────────────────────────────────────────────────────────

const listVariants = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const id  = parseInt(req.params.id, 10);

    const { rows: [product] } = await query(
      'SELECT id FROM products WHERE id = $1 AND company_id = $2',
      [id, cid]
    );
    if (!product) return error(res, 'Product not found.', 404);

    const { rows } = await query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY size, color',
      [id]
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const upsertVariant = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 422, errs.array());

    const cid       = req.companyId;
    const productId = parseInt(req.params.id, 10);
    const variantId = req.params.variantId ? parseInt(req.params.variantId, 10) : null;
    const { size, color, cost_price, sale_price, stock_quantity, barcode } = req.body;

    if (!size && !color) return error(res, 'At least one of size or color is required.', 400);

    const { rows: [product] } = await query(
      'SELECT sku, cost_price, sale_price FROM products WHERE id = $1 AND company_id = $2',
      [productId, cid]
    );
    if (!product) return error(res, 'Product not found.', 404);

    if (variantId) {
      const { rows: [v] } = await query(
        'SELECT * FROM product_variants WHERE id = $1 AND product_id = $2',
        [variantId, productId]
      );
      if (!v) return error(res, 'Variant not found.', 404);

      const { rows: [updated] } = await query(`
        UPDATE product_variants
        SET size=$3, color=$4, cost_price=$5, sale_price=$6, stock_quantity=$7, barcode=$8, updated_at=NOW()
        WHERE id=$1 AND product_id=$2
        RETURNING *
      `, [
        variantId, productId,
        size  || v.size,
        color || v.color,
        parseFloat(cost_price)      ?? v.cost_price,
        parseFloat(sale_price)      ?? v.sale_price,
        parseFloat(stock_quantity)  ?? v.stock_quantity,
        barcode?.trim() || v.barcode,
      ]);
      return success(res, updated, 'Variant updated.');
    } else {
      const varSku = await uniqueSku(cid, `${product.sku}-${size || color || 'VAR'}`);
      const { rows: [newVar] } = await query(`
        INSERT INTO product_variants
          (product_id, sku, barcode, size, color, cost_price, sale_price, stock_quantity, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
        RETURNING *
      `, [
        productId, varSku, barcode?.trim() || null,
        size || null, color || null,
        parseFloat(cost_price) || product.cost_price,
        parseFloat(sale_price) || product.sale_price,
        parseFloat(stock_quantity) || 0,
      ]);
      return created(res, newVar, 'Variant added.');
    }
  } catch (err) { next(err); }
};

const deleteVariant = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const variantId = parseInt(req.params.variantId, 10);

    const { rows: [v] } = await query(
      'SELECT id FROM product_variants WHERE id = $1 AND product_id = $2',
      [variantId, productId]
    );
    if (!v) return error(res, 'Variant not found.', 404);

    await query('DELETE FROM product_variants WHERE id = $1', [variantId]);
    return success(res, null, 'Variant deleted.');
  } catch (err) { next(err); }
};

module.exports = {
  list, getOne, getByBarcode,
  create, update, remove,
  lowStock,
  listVariants, upsertVariant, deleteVariant,
};
