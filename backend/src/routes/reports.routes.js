'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/reports.controller');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/overview',          requirePermission('reports', 'view'), ctrl.overview);
router.get('/daily-sales',       requirePermission('reports', 'view'), ctrl.dailySales);
router.get('/payment-methods',   requirePermission('reports', 'view'), ctrl.paymentMethods);
router.get('/top-products',      requirePermission('reports', 'view'), ctrl.topProducts);
router.get('/top-customers',     requirePermission('reports', 'view'), ctrl.topCustomers);
router.get('/stock-valuation',   requirePermission('reports', 'view'), ctrl.stockValuation);
router.get('/purchases-summary', requirePermission('reports', 'view'), ctrl.purchasesSummary);

module.exports = router;
