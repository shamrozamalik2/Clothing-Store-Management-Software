'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { env } = require('../config/env');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const token = header.slice(7);

  // Step 1: verify JWT — only JWT errors should produce a 401
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const code    = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message, code });
  }

  req.user      = payload;
  req.companyId = payload.companyId;
  req.branchId  = payload.branchId || null;

  // Step 2: check company status — DB errors here must NOT log the user out
  if (payload.companyId && !payload.impersonated) {
    try {
      const { rows: [company] } = await query(
        'SELECT subscription_status, trial_ends_at FROM companies WHERE id = $1',
        [payload.companyId]
      );

      if (company) {
        const status = company.subscription_status;

        if (status === 'suspended') {
          return res.status(401).json({
            success: false,
            message: 'Your account has been suspended by the administrator. Please contact support.',
            code: 'COMPANY_SUSPENDED',
          });
        }

        if (status === 'expired') {
          return res.status(401).json({
            success: false,
            message: 'Your subscription has expired. Please renew your plan to continue.',
            code: 'COMPANY_EXPIRED',
          });
        }

        if (status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at) < new Date()) {
          await query(
            `UPDATE companies SET subscription_status = 'expired', updated_at = NOW() WHERE id = $1`,
            [payload.companyId]
          );
          return res.status(401).json({
            success: false,
            message: 'Your free trial has ended. Please upgrade your plan to continue.',
            code: 'TRIAL_EXPIRED',
          });
        }
      }
    } catch (dbErr) {
      // DB unreachable — token is still valid; let the request continue
      // (the endpoint's own query will also fail and return a proper 500)
      console.error('[Auth] Company status check failed (DB issue):', dbErr.message);
    }
  }

  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}

function requirePermission(module, action = 'view') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (req.user.role === 'admin') return next();

      // Permissions are embedded in the JWT payload — avoid a DB round-trip
      const perms = req.user.permissions || {};
      const mod   = perms[module];
      const allowed = mod === true || (typeof mod === 'object' && mod?.[action] === true);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${action} ${module}.`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, authorize, requirePermission };
