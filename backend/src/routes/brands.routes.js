'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { makeUploader } = require('../utils/upload');
const { list, getOne, create, update, remove } = require('../controllers/brands.controller');

const router = Router();
const upload = makeUploader('brands');
const nameRule = body('name').trim().notEmpty().withMessage('Brand name is required.');

router.use(authenticate);

router.get('/',     requirePermission('brands', 'view'),   list);
router.get('/:id',  requirePermission('brands', 'view'),   getOne);
router.post('/',    requirePermission('brands', 'create'),  upload.single('logo'), [nameRule], create);
router.put('/:id',  requirePermission('brands', 'update'),  upload.single('logo'), [nameRule], update);
router.delete('/:id', requirePermission('brands', 'delete'), remove);

module.exports = router;
