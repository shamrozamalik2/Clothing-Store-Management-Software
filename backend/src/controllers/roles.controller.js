'use strict';

const { validationResult } = require('express-validator');
const Role    = require('../models/Role');
const User    = require('../models/User');
const { AUDIT_ACTIONS }    = require('../config/constants');
const { success, error }   = require('../utils/response');
const { logAudit }         = require('../utils/audit');

const list = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const roles = await Role.find({ company_id: cid }).sort({ _id: 1 }).lean();

    const roleIds = roles.map(r => r._id);
    const userCounts = await User.aggregate([
      { $match: { company_id: cid, role_id: { $in: roleIds }, is_active: true } },
      { $group: { _id: '$role_id', count: { $sum: 1 } } },
    ]);
    const cntMap = Object.fromEntries(userCounts.map(r => [r._id.toString(), r.count]));

    const data = roles.map(r => ({ ...r, id: r._id.toString(), user_count: cntMap[r._id.toString()] || 0 }));
    return success(res, data);
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!role) return error(res, 'Role not found.', 404);
    return success(res, { ...role, id: role._id.toString() });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const label = (req.body.label || '').trim();
    if (!label) return error(res, 'Role label is required.', 422);

    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!name) return error(res, 'Invalid role label.', 422);

    const existing = await Role.findOne({ company_id: cid, name }).lean();
    if (existing) return error(res, `A role with name "${name}" already exists.`, 409);

    const role = await Role.create({ company_id: cid, name, label, permissions: {}, is_system: false });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'roles', role._id.toString());
    return success(res, { ...role.toJSON(), id: role._id.toString() }, 'Role created.', 201);
  } catch (err) { next(err); }
};

const updatePermissions = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, errs.array()[0].msg, 422);

    const cid  = req.companyId;
    const role = await Role.findOne({ _id: req.params.id, company_id: cid }).lean();
    if (!role) return error(res, 'Role not found.', 404);
    if (role.name === 'admin') return error(res, 'Admin permissions cannot be modified.', 403);

    const { permissions } = req.body;
    await Role.findByIdAndUpdate(req.params.id, { permissions, updated_at: new Date() });
    const updated = await Role.findById(req.params.id).lean();
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.UPDATE, 'roles', req.params.id, role.permissions, permissions);
    return success(res, { ...updated, id: updated._id.toString() }, 'Permissions updated.');
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, updatePermissions };
