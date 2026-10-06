'use strict';

const { Router }    = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/feature.middleware');
const ctrl          = require('../controllers/audit.controller');

const router = Router();
router.use(authenticate);
router.use(requireFeature('AUDIT'));
router.get('/', requirePermission('audit_logs', 'view'), ctrl.list);

module.exports = router;
