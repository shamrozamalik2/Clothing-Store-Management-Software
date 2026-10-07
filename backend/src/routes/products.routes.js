'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/feature.middleware');
const { makeUploader } = require('../utils/upload');
const ctrl      = require('../controllers/products.controller');
const csvUpload = require('../utils/csv-uploader');

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
router.use(requireFeature('PRODUCTS'));

// Product CRUD
router.get('/',                    requirePermission('products', 'view'),   ctrl.list);
router.get('/stats',               requirePermission('products', 'view'),   ctrl.stats);
router.get('/low-stock',           requirePermission('products', 'view'),   ctrl.lowStock);
router.get('/expiry-alerts',       requireFeature('EXPIRY'), requirePermission('products', 'view'), ctrl.expiryAlerts);
router.get('/barcode/:code',       requireFeature('BARCODE'),   requirePermission('products', 'view'),   ctrl.getByBarcode);
router.get('/:id',                 requirePermission('products', 'view'),   ctrl.getOne);
router.post('/',                   requirePermission('products', 'create'),  upload.single('image'), createRules, ctrl.create);
router.put('/:id',                 requirePermission('products', 'update'),  upload.single('image'), updateRules, ctrl.update);
router.delete('/:id',              requirePermission('products', 'delete'),  ctrl.remove);
router.patch('/:id/barcode',       requireFeature('BARCODE'), requirePermission('products', 'update'),  ctrl.updateBarcode);
router.post('/:id/barcode/internal', requireFeature('INTERNAL_BARCODE'), requirePermission('products', 'update'), ctrl.generateInternalBarcode);

// Variants
router.get('/:id/variants',        requirePermission('products', 'view'),   ctrl.listVariants);
router.post('/:id/variants',       requirePermission('products', 'update'),  ctrl.upsertVariant);
router.put('/:id/variants/:variantId',    requirePermission('products', 'update'), ctrl.updateVariant);
router.post('/:id/variants/:variantId/barcode/internal', requireFeature('INTERNAL_BARCODE'), requirePermission('products', 'update'), ctrl.generateVariantInternalBarcode);
router.delete('/:id/variants/:variantId', requirePermission('products', 'delete'), ctrl.deleteVariant);
router.post('/import', requirePermission('products', 'create'), csvUpload.single('file'), ctrl.importCsv);

module.exports = router;
