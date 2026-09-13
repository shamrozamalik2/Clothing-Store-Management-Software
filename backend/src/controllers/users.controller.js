'use strict';

const bcrypt = require('bcryptjs');
const { validationResult }            = require('express-validator');
const User    = require('../models/User');
const Role    = require('../models/Role');
const { BCRYPT_ROUNDS, AUDIT_ACTIONS } = require('../config/constants');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { success, created, paginated, error }   = require('../utils/response');
const { logAudit }                    = require('../utils/audit');

async function populateUsers(users) {
  const roleIds = [...new Set(users.map(u => u.role_id?.toString()).filter(Boolean))];
  const roles   = await Role.find({ _id: { $in: roleIds } }, { name: 1, label: 1 }).lean();
  const roleMap = Object.fromEntries(roles.map(r => [r._id.toString(), r]));
  return users.map(u => {
    const r = u.role_id ? roleMap[u.role_id.toString()] : null;
    return {
      id:         u._id.toString(),
      name:       u.name,
      email:      u.email,
      phone:      u.phone,
      avatar:     u.avatar,
      is_active:  u.is_active,
      last_login: u.last_login,
      created_at: u.created_at,
      updated_at: u.updated_at,
      role_id:    u.role_id?.toString() || null,
      role:       r?.name  || null,
      role_label: r?.label || null,
    };
  });
}

// ── list ──────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { search = '', role = '', status = '' } = req.query;

    const filter = { company_id: cid };
    if (search)    filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    if (status !== '') filter.is_active = status === 'active';

    // If filtering by role name, resolve role IDs first
    if (role) {
      const roleDoc = await Role.findOne({ company_id: cid, name: role }, { _id: 1 }).lean();
      if (!roleDoc) return paginated(res, [], buildPaginationMeta(0, page, limit));
      filter.role_id = roleDoc._id;
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, { password: 0 }).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);

    const rows = await populateUsers(users);
    return paginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// ── getOne ────────────────────────────────────────────────────────────────────

const getOne = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, company_id: req.companyId }, { password: 0 }).lean();
    if (!user) return error(res, 'User not found.', 404);
    const [populated] = await populateUsers([user]);
    return success(res, populated);
  } catch (err) { next(err); }
};

// ── create ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const { name, email, password, role_id, phone = null } = req.body;

    const roleDoc = await Role.findOne({ _id: role_id, company_id: cid }).lean();
    if (!roleDoc) return error(res, 'Invalid role selected.', 400);

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = await User.create({ company_id: cid, role_id, name: name.trim(), email: email.toLowerCase().trim(), password: hashed, phone: phone || null, is_active: true });

    const [populated] = await populateUsers([newUser.toObject()]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'users', newUser._id.toString(), null, { name: newUser.name, email: newUser.email });
    return created(res, populated, 'User created successfully.');
  } catch (err) { next(err); }
};

// ── update ────────────────────────────────────────────────────────────────────

const update = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const uid = req.params.id;

    if (req.user.role !== 'admin' && req.user.id !== uid) return error(res, 'Insufficient permissions.', 403);

    const existing = await User.findOne({ _id: uid, company_id: cid }).lean();
    if (!existing) return error(res, 'User not found.', 404);

    const { name, email, role_id, phone, is_active } = req.body;
    const isAdmin = req.user.role === 'admin';
    const upd = {};
    if (name  !== undefined) upd.name  = name.trim();
    if (email !== undefined) upd.email = email.toLowerCase().trim();
    if (phone !== undefined) upd.phone = phone || null;
    if (isAdmin && role_id    !== undefined) upd.role_id   = role_id;
    if (isAdmin && is_active  !== undefined) upd.is_active = is_active !== false && is_active !== 'false';
    upd.updated_at = new Date();

    if (upd.role_id && upd.role_id !== existing.role_id?.toString()) {
      const roleDoc = await Role.findOne({ _id: upd.role_id, company_id: cid }).lean();
      if (!roleDoc) return error(res, 'Invalid role selected.', 400);
    }

    await User.findByIdAndUpdate(uid, upd);
    const updated = await User.findById(uid, { password: 0 }).lean();
    const [populated] = await populateUsers([updated]);
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', uid);
    return success(res, populated, 'User updated successfully.');
  } catch (err) { next(err); }
};

// ── remove (soft deactivate) ──────────────────────────────────────────────────

const remove = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const uid = req.params.id;
    if (uid === req.user.id) return error(res, 'You cannot deactivate your own account.', 400);

    const user = await User.findOne({ _id: uid, company_id: cid }).lean();
    if (!user) return error(res, 'User not found.', 404);

    await User.findByIdAndUpdate(uid, { is_active: false, updated_at: new Date() });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.DELETE, 'users', uid, { name: user.name });
    return success(res, null, 'User deactivated successfully.');
  } catch (err) { next(err); }
};

// ── resetPassword ─────────────────────────────────────────────────────────────

const resetPassword = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid = req.companyId;
    const uid = req.params.id;
    const user = await User.findOne({ _id: uid, company_id: cid }).lean();
    if (!user) return error(res, 'User not found.', 404);

    const hashed = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(uid, { password: hashed, updated_at: new Date() });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', uid, null, { action: 'password_reset_by_admin' });
    return success(res, null, 'Password reset successfully.');
  } catch (err) { next(err); }
};

// ── toggleStatus ──────────────────────────────────────────────────────────────

const toggleStatus = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const uid = req.params.id;
    if (uid === req.user.id) return error(res, 'You cannot change your own status.', 400);

    const user = await User.findOne({ _id: uid, company_id: cid }, { is_active: 1, name: 1 }).lean();
    if (!user) return error(res, 'User not found.', 404);

    const newStatus = !user.is_active;
    await User.findByIdAndUpdate(uid, { is_active: newStatus, updated_at: new Date() });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'users', uid, { is_active: user.is_active }, { is_active: newStatus });
    return success(res, { is_active: newStatus }, `User ${newStatus ? 'activated' : 'deactivated'} successfully.`);
  } catch (err) { next(err); }
};

// ── updateAvatar ──────────────────────────────────────────────────────────────

const updateAvatar = async (req, res, next) => {
  try {
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!avatarPath) return error(res, 'No file uploaded.', 400);
    await User.findOneAndUpdate({ _id: req.user.id, company_id: req.companyId }, { avatar: avatarPath, updated_at: new Date() });
    return success(res, { avatar: avatarPath }, 'Avatar updated.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove, resetPassword, toggleStatus, updateAvatar };
