'use strict';

const { FEATURE_KEYS } = require('../config/features');
const { isFeatureEnabled } = require('../services/features.service');

// Use after authenticate and before requirePermission, so a disabled module is
// refused before any role check. Only authenticated company requests reach it.
function requireFeature(featureKey) {
  if (!FEATURE_KEYS.has(featureKey)) throw new Error(`requireFeature: unknown feature "${featureKey}".`);
  return async (req, res, next) => {
    try {
      if (!req.companyId || !(await isFeatureEnabled(req.companyId, featureKey))) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not available for your business.',
          code: 'FEATURE_DISABLED',
          feature: featureKey,
        });
      }
      next();
    } catch (err) { next(err); }
  };
}

module.exports = { requireFeature };
