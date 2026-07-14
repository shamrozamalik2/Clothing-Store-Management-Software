'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SAS Garments API is running.',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
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

module.exports = router;
