'use strict';

const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/backup.controller');

const router = Router();

router.use(authenticate);

router.get('/export',  ctrl.exportBackup);
router.post('/restore', authorize('admin'), ctrl.restoreBackup);

module.exports = router;
