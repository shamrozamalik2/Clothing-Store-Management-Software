'use strict';

const jwt = require('jsonwebtoken');

const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET;

/**
 * Middleware: authenticate super admin JWT.
 * Token is issued by POST /api/admin/auth/login.
 * Payload: { id, email, name, role: 'super_admin' }
 */
function requireSuperAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Super admin token required.' });
  }

  try {
    const payload = jwt.verify(token, SUPER_ADMIN_SECRET);
    if (payload.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }
    req.superAdmin = payload;
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ success: false, message: err.message, code });
  }
}

module.exports = { requireSuperAdmin };
