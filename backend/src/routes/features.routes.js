'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getEffectiveFeatures } = require('../services/features.service');
const { success, error } = require('../utils/response');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const effective = await getEffectiveFeatures(req.companyId);
    if (!effective) return error(res, 'Company not found.', 404);
    return success(res, effective);
  } catch (err) { next(err); }
});

module.exports = router;
