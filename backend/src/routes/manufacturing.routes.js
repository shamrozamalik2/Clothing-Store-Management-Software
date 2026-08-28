'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/manufacturing.controller');

const router = Router();
router.use(authenticate);

router.get('/bom',            requirePermission('manufacturing', 'view'),   ctrl.listBOM);
router.get('/bom/:id',        requirePermission('manufacturing', 'view'),   ctrl.getBOM);
router.post('/bom',           requirePermission('manufacturing', 'create'), ctrl.createBOM);
router.delete('/bom/:id',     requirePermission('manufacturing', 'delete'), ctrl.deleteBOM);

router.get('/products',       requirePermission('manufacturing', 'view'),   ctrl.listProducts);

router.get('/batches',        requirePermission('manufacturing', 'view'),   ctrl.listBatches);
router.get('/batches/:id',    requirePermission('manufacturing', 'view'),   ctrl.getBatch);
router.post('/batches',       requirePermission('manufacturing', 'create'), ctrl.createBatch);

module.exports = router;
