'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/customers.controller');

const router = Router();
router.use(authenticate);

router.get   ('/',    requirePermission('customers', 'view'),   ctrl.list);
router.get   ('/:id', requirePermission('customers', 'view'),   ctrl.getOne);
router.post  ('/',    requirePermission('customers', 'create'), ctrl.create);
router.put   ('/:id', requirePermission('customers', 'edit'),   ctrl.update);
router.delete('/:id', requirePermission('customers', 'delete'), ctrl.remove);

module.exports = router;
