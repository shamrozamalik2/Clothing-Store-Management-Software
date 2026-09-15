'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } = require('../config/constants');
const { authenticate, authorize, requirePermission } = require('../middleware/auth.middleware');
const User = require('../models/User');
const {
  list, getOne, create, update, remove,
  resetPassword, toggleStatus, updateAvatar,
} = require('../controllers/users.controller');

const router = Router();

// Avatar upload config
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid image type. Only JPEG, PNG, WebP allowed.'));
  },
});

// Validation rules (role_id and ids are MongoDB ObjectId strings, not integers)
const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be under 100 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role_id').notEmpty().withMessage('Role is required.'),
  body('phone').optional({ nullable: true }).isLength({ max: 20 }),
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role_id').optional().notEmpty(),
  body('phone').optional({ nullable: true }).isLength({ max: 20 }),
  body('is_active').optional().isBoolean(),
];

// All routes require auth
router.use(authenticate);

router.get('/', requirePermission('users', 'view'), list);
router.get('/:id', requirePermission('users', 'view'), getOne);
router.post('/', requirePermission('users', 'create'), createRules, create);
router.put('/:id', requirePermission('users', 'update'), updateRules, update);
router.delete('/:id', requirePermission('users', 'delete'), authorize('admin'), remove);
router.patch('/:id/reset-password',
  authorize('admin'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  resetPassword
);
router.patch('/:id/toggle-status', authorize('admin'), toggleStatus);
router.post('/me/avatar', upload.single('avatar'), updateAvatar);

// Update own profile (name / phone)
router.patch('/me/profile', async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const upd = {};
    if (name  !== undefined && name.trim()) upd.name  = name.trim();
    if (phone !== undefined)                upd.phone = phone || null;
    if (!Object.keys(upd).length) {
      return res.status(422).json({ success: false, message: 'Nothing to update.' });
    }
    upd.updated_at = new Date();
    await User.findByIdAndUpdate(req.user.id, upd);
    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { next(err); }
});

// FCM token registration
router.post('/me/fcm-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token === undefined) {
      return res.status(422).json({ success: false, message: 'token field is required.' });
    }
    const safeToken = token || null;
    await User.findByIdAndUpdate(req.user.id, { fcm_token: safeToken, updated_at: new Date() });
    return res.json({ success: true, message: safeToken ? 'FCM token registered.' : 'FCM token cleared.' });
  } catch (err) { next(err); }
});

module.exports = router;
