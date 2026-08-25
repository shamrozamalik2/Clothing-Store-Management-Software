'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const t0 = Date.now();
    await query('SELECT 1');
    return res.json({
      success:   true,
      message:   'SAS Garments API is running.',
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
      db:        { status: 'connected', latency_ms: Date.now() - t0 },
    });
  } catch (err) {
    return res.status(503).json({
      success:   false,
      message:   'Database unavailable.',
      timestamp: new Date().toISOString(),
      db:        { status: 'error', error: err.message },
    });
  }
});

router.use('/auth',  authRoutes);
router.use('/users', require('./users.routes'));
router.use('/roles', require('./roles.routes'));

router.use('/categories',        require('./categories.routes'));
router.use('/brands',            require('./brands.routes'));
router.use('/products',          require('./products.routes'));
router.use('/suppliers',         require('./suppliers.routes'));
router.use('/purchases',         require('./purchases.routes'));
router.use('/stock-adjustments', require('./stock-adjustments.routes'));

router.use('/customers',         require('./customers.routes'));
router.use('/sales',             require('./sales.routes'));
router.use('/reports',           require('./reports.routes'));
router.use('/settings',          require('./settings.routes'));

// ── Super-admin portal (separate auth, no company_id scoping) ─────────────────
router.use('/admin',             require('./admin.routes'));

router.use('/expenses',          require('./expenses.routes'));
router.use('/returns',           require('./returns.routes'));
router.use('/backup',            require('./backup.routes'));
router.use('/manufacturing',     require('./manufacturing.routes'));
router.use('/employees',         require('./employees.routes'));
router.use('/ledger',            require('./ledger.routes'));
router.use('/audit',             require('./audit.routes'));
router.use('/holds',             require('./holds.routes'));

// ── Public marketing site: demo requests (rate limited, unauthenticated) ─────
router.use('/leads',             require('./leads.routes'));

module.exports = router;
