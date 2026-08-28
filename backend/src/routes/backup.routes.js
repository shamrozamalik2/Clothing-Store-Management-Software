'use strict';

const { Router } = require('express');
const multer     = require('multer');
const { authenticate, authorize, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/backup.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(authenticate);

router.get('/export',                    requirePermission('backup', 'view'), ctrl.exportBackup);
router.get('/history',                   requirePermission('backup', 'view'), ctrl.listBackups);
router.post('/restore',                  authorize('admin'), ctrl.restoreBackup);
router.post('/restore-file',             authorize('admin'), upload.single('file'), ctrl.restoreBackupFile);
router.post('/restore-snapshot/:id',     authorize('admin'), ctrl.restoreSnapshot);

module.exports = router;
