'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { env }   = require('../config/env');
const { AUDIT_ACTIONS, BCRYPT_ROUNDS } = require('../config/constants');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/audit');

// ── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    {
      id:          user.id,
      companyId:   user.company_id,
      branchId:    user.branch_id || null,
      email:       user.email,
      name:        user.name,
      role:        user.role_name,
      roleId:      user.role_id,
      permissions: user.permissions, // already JSONB object from pg
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function makeRefreshToken() {
  return crypto.randomBytes(32).toString('hex'); // 64-char hex
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   !env.IS_DEV,
    sameSite: env.IS_DEV ? 'lax' : 'strict',
    maxAge:   env.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path:     '/api/auth',
  };
}

async function saveRefreshToken(userId, raw) {
  const hash      = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
  return hash;
}

// ── login ────────────────────────────────────────────────────────────────────

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 422);

    const { company_slug, email, password } = req.body;

    // Look up company
    const { rows: [company] } = await query(
      'SELECT id, is_active FROM companies WHERE slug = $1',
      [company_slug.trim().toLowerCase()]
    );
    if (!company || !company.is_active) {
      return error(res, 'Company not found.', 404);
    }

    // Look up user with role info (permissions is JSONB — pg returns it as object automatically)
    const { rows: [user] } = await query(
      `SELECT u.*, r.name AS role_name, r.permissions
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.company_id = $1 AND u.email = $2 AND u.is_active = TRUE`,
      [company.id, email.toLowerCase().trim()]
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return error(res, 'Invalid email or password.', 401);
    }

    // Update last login
    await query(
      `UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const accessToken  = signAccessToken(user);
    const refreshToken = makeRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

    await logAudit(user.company_id, user.id, AUDIT_ACTIONS.LOGIN, 'users', user.id);

    res.cookie('refresh_token', refreshToken, refreshCookieOptions());

    return success(res, {
      token: accessToken,
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role_name,
        roleId:      user.role_id,
        companyId:   user.company_id,
        branchId:    user.branch_id || null,
        avatar:      user.avatar,
        permissions: user.permissions,
      },
    }, 'Login successful.');
  } catch (err) {
    next(err);
  }
};

// ── refresh ──────────────────────────────────────────────────────────────────

const refresh = async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (!raw) return error(res, 'No refresh token.', 401);

    const hash = hashToken(raw);
    const { rows: [stored] } = await query(
      `SELECT rt.*, u.company_id, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()`,
      [hash]
    );

    if (!stored || !stored.is_active) {
      res.clearCookie('refresh_token', { path: '/api/auth' });
      return error(res, 'Invalid or expired refresh token.', 401);
    }

    // Load full user for a fresh token
    const { rows: [user] } = await query(
      `SELECT u.*, r.name AS role_name, r.permissions
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [stored.user_id]
    );
    if (!user) return error(res, 'User not found.', 401);

    // Rotate — revoke old, issue new
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [hash]
    );

    const newAccessToken  = signAccessToken(user);
    const newRefreshToken = makeRefreshToken();
    await saveRefreshToken(user.id, newRefreshToken);

    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions());
    return success(res, { token: newAccessToken }, 'Token refreshed.');
  } catch (err) {
    next(err);
  }
};

// ── logout ───────────────────────────────────────────────────────────────────

const logout = async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (raw) {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
        [hashToken(raw)]
      );
    }
    if (req.user) {
      await logAudit(req.user.companyId, req.user.id, AUDIT_ACTIONS.LOGOUT, 'users', req.user.id);
    }
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return success(res, null, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

// ── me ───────────────────────────────────────────────────────────────────────

const me = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      `SELECT u.id, u.name, u.email, u.avatar, u.phone, u.last_login, u.company_id, u.branch_id,
              r.name AS role_name, r.permissions
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.company_id = $2 AND u.is_active = TRUE`,
      [req.user.id, req.companyId]
    );
    if (!user) return error(res, 'User not found.', 404);

    return success(res, {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role_name,
      companyId:   user.company_id,
      branchId:    user.branch_id,
      avatar:      user.avatar,
      phone:       user.phone,
      lastLogin:   user.last_login,
      permissions: user.permissions,
    });
  } catch (err) {
    next(err);
  }
};

// ── changePassword ───────────────────────────────────────────────────────────

const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 422);

    const { currentPassword, newPassword } = req.body;
    const { rows: [user] } = await query(
      'SELECT id, password FROM users WHERE id = $1 AND company_id = $2',
      [req.user.id, req.companyId]
    );
    if (!user) return error(res, 'User not found.', 404);

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return error(res, 'Current password is incorrect.', 400);

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hashed, user.id]
    );

    // Revoke all refresh tokens — force re-login everywhere
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [user.id]
    );
    res.clearCookie('refresh_token', { path: '/api/auth' });

    await logAudit(req.companyId, user.id, AUDIT_ACTIONS.UPDATE, 'users', user.id, { action: 'password_changed' });
    return success(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me, changePassword };
