'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/settings.controller');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/',      requirePermission('settings', 'view'),  ctrl.getAll);
router.get('/:key',  requirePermission('settings', 'view'),  ctrl.getOne);
router.put('/',      requirePermission('settings', 'edit'),  ctrl.updateBulk);
router.put('/:key',  requirePermission('settings', 'edit'),  ctrl.updateOne);

module.exports = router;
