'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl       = require('../controllers/suppliers.controller');
const csvUpload  = require('../utils/csv-uploader');

const router = Router();
router.use(authenticate);

router.get   ('/',    requirePermission('suppliers', 'view'),   ctrl.list);
router.get   ('/:id', requirePermission('suppliers', 'view'),   ctrl.getOne);
router.post  ('/',    requirePermission('suppliers', 'create'), ctrl.create);
router.put   ('/:id', requirePermission('suppliers', 'edit'),   ctrl.update);
router.delete('/:id', requirePermission('suppliers', 'delete'), ctrl.remove);
router.post  ('/import', requirePermission('suppliers', 'create'), csvUpload.single('file'), ctrl.importCsv);

module.exports = router;
