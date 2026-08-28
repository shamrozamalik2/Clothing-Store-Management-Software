'use strict';

const { Router }      = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl            = require('../controllers/holds.controller');

const router = Router();
router.use(authenticate);
router.get('/',       requirePermission('pos', 'view'), ctrl.list);
router.post('/',      requirePermission('pos', 'view'), ctrl.create);
router.delete('/:id', requirePermission('pos', 'view'), ctrl.remove);

module.exports = router;
