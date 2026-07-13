'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/purchases.controller');

const router = Router();
router.use(authenticate);

router.get  ('/',                requirePermission('purchases', 'view'),   ctrl.list);
router.get  ('/:id',             requirePermission('purchases', 'view'),   ctrl.getOne);
router.post ('/',                requirePermission('purchases', 'create'), ctrl.create);
router.patch('/:id/status',      requirePermission('purchases', 'edit'),   ctrl.updateStatus);
router.post ('/:id/payment',     requirePermission('purchases', 'edit'),   ctrl.recordPayment);

module.exports = router;
