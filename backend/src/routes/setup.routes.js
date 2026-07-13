'use strict';

const { Router } = require('express');

const router = Router();

// In the multi-tenant cloud architecture, initial setup is handled by the seed migration
// (backend/src/database/migrations/002_seed_data.js). This route is kept as a placeholder.

router.get('/status', (_req, res) => {
  res.json({ success: true, required: false, message: 'Use seed migration for initial setup.' });
});

router.post('/', (_req, res) => {
  res.status(410).json({ success: false, message: 'Manual setup is not available in cloud mode. Use the seed migration.' });
});

module.exports = router;
