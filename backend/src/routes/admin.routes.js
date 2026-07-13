'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/admin.controller');
const { requireSuperAdmin } = require('../middleware/superadmin.middleware');

const router = Router();

// ── Auth (public) ─────────────────────────────────────────────────────────────
router.post('/auth/login', ctrl.login);

// ── All routes below require super admin JWT ──────────────────────────────────
router.use(requireSuperAdmin);

// ── Platform stats & health ───────────────────────────────────────────────────
router.get('/stats', ctrl.stats);

// ── Super admin management ────────────────────────────────────────────────────
router.post('/admins', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 10 }),
], ctrl.createAdmin);

// ── Companies ─────────────────────────────────────────────────────────────────
router.get('/companies',        ctrl.listCompanies);
router.get('/companies/:id',    ctrl.getCompany);
router.post('/companies', [
  body('name').trim().notEmpty().withMessage('Company name is required.'),
  body('slug').trim().notEmpty().withMessage('Slug is required.').matches(/^[a-z0-9-]+$/),
  body('admin_email').isEmail().normalizeEmail(),
  body('admin_password').isLength({ min: 8 }),
], ctrl.createCompany);
router.patch('/companies/:id',          ctrl.updateCompany);
router.post('/companies/:id/suspend',   ctrl.suspendCompany);
router.post('/companies/:id/reinstate', ctrl.reinstateCompany);

module.exports = router;
