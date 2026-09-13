'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { validationResult } = require('express-validator');
const { env }   = require('../config/env');
const { AUDIT_ACTIONS, BCRYPT_ROUNDS } = require('../config/constants');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const Company      = require('../models/Company');
const User         = require('../models/User');
const Role         = require('../models/Role');
const RefreshToken = require('../models/RefreshToken');

// ── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(user, role) {
  return jwt.sign(
    {
      id:          user._id.toString(),
      companyId:   user.company_id.toString(),
      branchId:    user.branch_id ? user.branch_id.toString() : null,
      email:       user.email,
      name:        user.name,
      role:        role.name,
      roleId:      role._id.toString(),
      permissions: role.permissions,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function makeRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
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
  await RefreshToken.create({ user_id: userId, token_hash: hash, expires_at: expiresAt });
  return hash;
}

// ── login ────────────────────────────────────────────────────────────────────

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 422);

    const { company_slug, email, password } = req.body;

    const company = await Company.findOne({ slug: company_slug.trim().toLowerCase() }).lean();
    if (!company || !company.is_active) {
      return error(res, 'Company not found.', 404);
    }

    if (company.subscription_status === 'suspended') {
      return error(res, 'This account has been suspended by the administrator. Please contact support.', 403);
    }
    if (company.subscription_status === 'expired') {
      return error(res, 'Your subscription has expired. Please renew your plan to continue.', 403);
    }
    if (company.subscription_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at) < new Date()) {
      await Company.findByIdAndUpdate(company._id, { subscription_status: 'expired' });
      return error(res, 'Your free trial has ended. Please upgrade your plan to continue.', 403);
    }

    const user = await User.findOne({
      company_id: company._id,
      email:      email.toLowerCase().trim(),
      is_active:  true,
    }).lean();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return error(res, 'Invalid email or password.', 401);
    }

    const role = await Role.findById(user.role_id).lean();
    if (!role) return error(res, 'Role not found.', 500);

    await User.findByIdAndUpdate(user._id, { last_login: new Date() });

    const accessToken  = signAccessToken(user, role);
    const refreshToken = makeRefreshToken();
    await saveRefreshToken(user._id, refreshToken);

    await logAudit(company._id.toString(), user._id.toString(), AUDIT_ACTIONS.LOGIN, 'users', user._id.toString());

    res.cookie('refresh_token', refreshToken, refreshCookieOptions());

    return success(res, {
      token: accessToken,
      user: {
        id:          user._id.toString(),
        name:        user.name,
        email:       user.email,
        role:        role.name,
        roleId:      role._id.toString(),
        companyId:   company._id.toString(),
        branchId:    user.branch_id ? user.branch_id.toString() : null,
        avatar:      user.avatar,
        permissions: role.permissions,
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

    const hash   = hashToken(raw);
    const stored = await RefreshToken.findOne({
      token_hash: hash,
      revoked_at: null,
      expires_at: { $gt: new Date() },
    }).lean();

    if (!stored) {
      res.clearCookie('refresh_token', { path: '/api/auth' });
      return error(res, 'Invalid or expired refresh token.', 401);
    }

    const user = await User.findOne({ _id: stored.user_id, is_active: true }).lean();
    if (!user) return error(res, 'User not found.', 401);

    const role = await Role.findById(user.role_id).lean();
    if (!role) return error(res, 'Role not found.', 401);

    // Rotate — revoke old, issue new
    await RefreshToken.updateOne({ token_hash: hash }, { revoked_at: new Date() });

    const newAccessToken  = signAccessToken(user, role);
    const newRefreshToken = makeRefreshToken();
    await saveRefreshToken(user._id, newRefreshToken);

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
      await RefreshToken.updateOne({ token_hash: hashToken(raw) }, { revoked_at: new Date() });
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
    const user = await User.findOne({
      _id:       req.user.id,
      company_id: req.companyId,
      is_active: true,
    }).lean();
    if (!user) return error(res, 'User not found.', 404);

    const role = await Role.findById(user.role_id).lean();

    return success(res, {
      id:          user._id.toString(),
      name:        user.name,
      email:       user.email,
      role:        role?.name,
      companyId:   user.company_id.toString(),
      branchId:    user.branch_id ? user.branch_id.toString() : null,
      avatar:      user.avatar,
      phone:       user.phone,
      lastLogin:   user.last_login,
      permissions: role?.permissions,
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
    const user = await User.findOne({ _id: req.user.id, company_id: req.companyId }).select('+password').lean();
    if (!user) return error(res, 'User not found.', 404);

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return error(res, 'Current password is incorrect.', 400);

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(user._id, { password: hashed });

    // Revoke all refresh tokens — force re-login everywhere
    await RefreshToken.updateMany({ user_id: user._id, revoked_at: null }, { revoked_at: new Date() });
    res.clearCookie('refresh_token', { path: '/api/auth' });

    await logAudit(req.companyId, user._id.toString(), AUDIT_ACTIONS.UPDATE, 'users', user._id.toString(), { action: 'password_changed' });
    return success(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me, changePassword };
