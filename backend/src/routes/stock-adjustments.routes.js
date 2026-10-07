'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/feature.middleware');
const ctrl = require('../controllers/stock-adjustments.controller');

const router = Router();
router.use(authenticate);
router.use(requireFeature('INVENTORY'));

router.get ('/',    requirePermission('inventory', 'view'),   ctrl.list);
router.get ('/:id', requirePermission('inventory', 'view'),   ctrl.getOne);
router.post('/',    requirePermission('inventory', 'create'), ctrl.create);

module.exports = router;
