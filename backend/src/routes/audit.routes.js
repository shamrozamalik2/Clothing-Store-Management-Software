'use strict';

const { Router }    = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl          = require('../controllers/audit.controller');

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);

module.exports = router;
