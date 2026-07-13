'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { login, refresh, logout, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// POST /api/auth/login
router.post('/login', [
  body('company_slug').trim().notEmpty().withMessage('Company identifier is required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
], login);

// POST /api/auth/refresh  — reads HttpOnly cookie, returns new access token
router.post('/refresh', refresh);

// POST /api/auth/logout   — revokes refresh token
router.post('/logout', logout);

// GET  /api/auth/me       — returns current user from token
router.get('/me', authenticate, me);

// PATCH /api/auth/change-password
router.patch('/change-password',
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  changePassword
);

module.exports = router;
