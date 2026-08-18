'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/ledger.controller');

const router = Router();
router.use(authenticate);

router.get('/customers',           ctrl.customersSummary);
router.get('/customers/:id',       ctrl.customerLedger);
router.get('/suppliers',           ctrl.suppliersSummary);
router.get('/suppliers/:id',       ctrl.supplierLedger);
router.get('/ar-ap',               ctrl.arApSummary);

module.exports = router;
