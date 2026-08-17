'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { makeUploader } = require('../utils/upload');
const { list, getOne, create, update, remove, importCsv } = require('../controllers/categories.controller');
const csvUpload = require('../utils/csv-uploader');

const router  = Router();
const upload  = makeUploader('categories');

const nameRule = body('name').trim().notEmpty().withMessage('Name is required.')
                  .isLength({ max: 100 }).withMessage('Max 100 chars.');

router.use(authenticate);

router.get('/',     requirePermission('categories', 'view'),   list);
router.get('/:id',  requirePermission('categories', 'view'),   getOne);
router.post('/',    requirePermission('categories', 'create'),  upload.single('image'), [nameRule], create);
router.put('/:id',  requirePermission('categories', 'update'),  upload.single('image'), [nameRule], update);
router.delete('/:id', requirePermission('categories', 'delete'), remove);
router.post('/import', requirePermission('categories', 'create'), csvUpload.single('file'), importCsv);

module.exports = router;
