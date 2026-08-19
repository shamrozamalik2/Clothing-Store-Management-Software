'use strict';

const { Router } = require('express');
const multer     = require('multer');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/backup.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(authenticate);

router.get('/export',       ctrl.exportBackup);
router.post('/restore',     authorize('admin'), ctrl.restoreBackup);
router.post('/restore-file', authorize('admin'), upload.single('file'), ctrl.restoreBackupFile);

module.exports = router;
