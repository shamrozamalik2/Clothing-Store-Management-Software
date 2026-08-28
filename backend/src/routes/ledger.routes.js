'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/ledger.controller');

const router = Router();
router.use(authenticate);

router.get('/customers',           requirePermission('reports', 'view'), ctrl.customersSummary);
router.get('/customers/:id',       requirePermission('reports', 'view'), ctrl.customerLedger);
router.get('/suppliers',           requirePermission('reports', 'view'), ctrl.suppliersSummary);
router.get('/suppliers/:id',       requirePermission('reports', 'view'), ctrl.supplierLedger);
router.get('/ar-ap',               requirePermission('reports', 'view'), ctrl.arApSummary);

module.exports = router;
