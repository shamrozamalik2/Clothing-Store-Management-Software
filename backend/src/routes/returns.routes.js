'use strict';

const router = require('express').Router();
const { create, list, getOne } = require('../controllers/returns.controller');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',    requirePermission('sales', 'view'),   list);
router.get('/:id', requirePermission('sales', 'view'),   getOne);
router.post('/',   requirePermission('sales', 'delete'), create);

module.exports = router;
