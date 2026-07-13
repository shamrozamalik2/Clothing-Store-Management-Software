'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/sales.controller');

const router = Router();
router.use(authenticate);

router.get   ('/',          requirePermission('sales', 'view'),   ctrl.list);
router.get   ('/today',     requirePermission('sales', 'view'),   ctrl.todaySummary);
router.get   ('/:id',       requirePermission('sales', 'view'),   ctrl.getOne);
router.post  ('/',          requirePermission('pos',   'view'),   ctrl.create);
router.patch ('/:id/void',  requirePermission('sales', 'delete'), ctrl.voidSale);

module.exports = router;
