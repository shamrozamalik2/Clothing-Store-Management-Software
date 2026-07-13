'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/stock-adjustments.controller');

const router = Router();
router.use(authenticate);

router.get ('/',    requirePermission('inventory', 'view'),   ctrl.list);
router.get ('/:id', requirePermission('inventory', 'view'),   ctrl.getOne);
router.post('/',    requirePermission('inventory', 'create'), ctrl.create);

module.exports = router;
