'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { makeUploader } = require('../utils/upload');
const ctrl = require('../controllers/products.controller');

const router = Router();
const upload = makeUploader('products');

const createRules = [
  body('name').trim().notEmpty().withMessage('Product name is required.')
    .isLength({ max: 200 }).withMessage('Max 200 chars.'),
  body('sale_price').isFloat({ min: 0 }).withMessage('Sale price must be ≥ 0.'),
  body('cost_price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isFloat({ min: 0 }),
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('sale_price').optional().isFloat({ min: 0 }),
  body('cost_price').optional().isFloat({ min: 0 }),
];

router.use(authenticate);

// Product CRUD
router.get('/',                    requirePermission('products', 'view'),   ctrl.list);
router.get('/low-stock',           requirePermission('products', 'view'),   ctrl.lowStock);
router.get('/barcode/:code',       requirePermission('products', 'view'),   ctrl.getByBarcode);
router.get('/:id',                 requirePermission('products', 'view'),   ctrl.getOne);
router.post('/',                   requirePermission('products', 'create'),  upload.single('image'), createRules, ctrl.create);
router.put('/:id',                 requirePermission('products', 'update'),  upload.single('image'), updateRules, ctrl.update);
router.delete('/:id',              requirePermission('products', 'delete'),  ctrl.remove);

// Variants
router.get('/:id/variants',        requirePermission('products', 'view'),   ctrl.listVariants);
router.post('/:id/variants',       requirePermission('products', 'update'),  ctrl.upsertVariant);
router.put('/:id/variants/:variantId',    requirePermission('products', 'update'), ctrl.upsertVariant);
router.delete('/:id/variants/:variantId', requirePermission('products', 'delete'), ctrl.deleteVariant);

module.exports = router;
