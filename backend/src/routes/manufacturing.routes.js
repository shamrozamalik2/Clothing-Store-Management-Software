'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/manufacturing.controller');

const router = Router();
router.use(authenticate);

router.get('/bom',            ctrl.listBOM);
router.get('/bom/:id',        ctrl.getBOM);
router.post('/bom',           ctrl.createBOM);
router.delete('/bom/:id',     ctrl.deleteBOM);

router.get('/products',       ctrl.listProducts);

router.get('/batches',        ctrl.listBatches);
router.get('/batches/:id',    ctrl.getBatch);
router.post('/batches',       ctrl.createBatch);

module.exports = router;
