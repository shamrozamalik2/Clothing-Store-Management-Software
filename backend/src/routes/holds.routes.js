'use strict';

const { Router }      = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl            = require('../controllers/holds.controller');

const router = Router();
router.use(authenticate);
router.get('/',    ctrl.list);
router.post('/',   ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
