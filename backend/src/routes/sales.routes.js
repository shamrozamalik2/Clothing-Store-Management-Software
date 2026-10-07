'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/feature.middleware');
const ctrl = require('../controllers/sales.controller');

const router = Router();
router.use(authenticate);

// Checkout needs POS specifically, since a business can have POS off while still viewing
// past sales (for example, imported or legacy data) under SALES.
router.post  ('/',          requireFeature('POS'), requirePermission('pos', 'view'), ctrl.create);

router.use(requireFeature('SALES'));
router.get   ('/',          requirePermission('sales', 'view'),   ctrl.list);
router.get   ('/today',     requirePermission('sales', 'view'),   ctrl.todaySummary);
router.get   ('/:id',       requirePermission('sales', 'view'),   ctrl.getOne);
router.patch ('/:id/void',            requirePermission('sales', 'delete'), ctrl.voidSale);
router.patch ('/:id/collect-payment', requirePermission('sales', 'edit'),   ctrl.collectPayment);

module.exports = router;
