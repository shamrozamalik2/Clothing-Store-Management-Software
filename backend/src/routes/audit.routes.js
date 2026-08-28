'use strict';

const { Router }    = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl          = require('../controllers/audit.controller');

const router = Router();
router.use(authenticate);
router.get('/', requirePermission('audit_logs', 'view'), ctrl.list);

module.exports = router;
