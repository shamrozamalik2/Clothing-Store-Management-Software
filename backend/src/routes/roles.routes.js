'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { list, getOne, updatePermissions } = require('../controllers/roles.controller');

const router = Router();

router.use(authenticate);

router.get('/', list);
router.get('/:id', getOne);
router.put('/:id/permissions',
  authorize('admin'),
  body('permissions').isObject().withMessage('Permissions must be an object.'),
  updatePermissions
);

module.exports = router;
