'use strict';

const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const Company    = require('../models/Company');
const User       = require('../models/User');
const Role       = require('../models/Role');
const Branch     = require('../models/Branch');
const Sale       = require('../models/Sale');
const Product    = require('../models/Product');
const SuperAdmin = require('../models/SuperAdmin');
const logger     = require('../config/logger');

const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const JWT_EXPIRES_IN     = '4h';
const BCRYPT_ROUNDS      = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// ── Auth ──────────────────────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(422).json({ success: false, message: 'Email and password are required.' });

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim(), is_active: true }).lean();
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await SuperAdmin.findByIdAndUpdate(admin._id, { last_login: new Date() });

    const token = jwt.sign({ id: admin._id.toString(), email: admin.email, name: admin.name, role: 'super_admin' }, SUPER_ADMIN_SECRET, { expiresIn: JWT_EXPIRES_IN });
    logger.info(`[SuperAdmin] Login: ${admin.email}`);
    return res.json({ success: true, data: { token, admin: { id: admin._id.toString(), name: admin.name, email: admin.email } } });
  } catch (err) { next(err); }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(422).json({ success: false, message: 'name, email and password are required.' });
    if (password.length < 10)         return res.status(422).json({ success: false, message: 'Password must be at least 10 characters.' });

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const admin  = await SuperAdmin.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashed });
    return res.status(201).json({ success: true, data: { id: admin._id.toString(), name: admin.name, email: admin.email, created_at: admin.created_at } });
  } catch (err) { next(err); }
};

// ── Companies ─────────────────────────────────────────────────────────────────

exports.listCompanies = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 25 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 25, 100);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

    const filter = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (status) filter.subscription_status = status;

    const [total, companies] = await Promise.all([
      Company.countDocuments(filter),
      Company.find(filter, { name: 1, slug: 1, email: 1, phone: 1, plan: 1, subscription_status: 1, max_users: 1, is_active: 1, trial_ends_at: 1, suspended_at: 1, billing_email: 1, notes: 1, created_at: 1 }).sort({ created_at: -1 }).skip(off).limit(lim).lean(),
    ]);

    const companyIds = companies.map(c => c._id);
    const [userCounts, saleCounts] = await Promise.all([
      User.aggregate([{ $match: { company_id: { $in: companyIds }, is_active: true } }, { $group: { _id: '$company_id', count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { company_id: { $in: companyIds } } }, { $group: { _id: '$company_id', count: { $sum: 1 } } }]),
    ]);
    const userMap = Object.fromEntries(userCounts.map(u => [u._id.toString(), u.count]));
    const saleMap = Object.fromEntries(saleCounts.map(s => [s._id.toString(), s.count]));

    const data = companies.map(c => ({
      ...c,
      id:           c._id.toString(),
      active_users: userMap[c._id.toString()] || 0,
      total_sales:  saleMap[c._id.toString()] || 0,
    }));

    return res.json({ success: true, data, pagination: { total, page: parseInt(page, 10), limit: lim } });
  } catch (err) { next(err); }
};

exports.getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const [activeUsers, totalUsers, totalSales, totalProducts] = await Promise.all([
      User.countDocuments({ company_id: company._id, is_active: true }),
      User.countDocuments({ company_id: company._id }),
      Sale.countDocuments({ company_id: company._id }),
      Product.countDocuments({ company_id: company._id }),
    ]);

    return res.json({ success: true, data: { ...company, id: company._id.toString(), active_users: activeUsers, total_users: totalUsers, total_sales: totalSales, total_products: totalProducts } });
  } catch (err) { next(err); }
};

exports.createCompany = async (req, res, next) => {
  try {
    const { name, slug, email, phone, plan = 'standard', max_users = 5, billing_email, notes, admin_name, admin_email, admin_password } = req.body;
    if (!name || !slug || !admin_email || !admin_password) {
      return res.status(422).json({ success: false, message: 'name, slug, admin_email and admin_password are required.' });
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const company = await Company.create({ name: name.trim(), slug: slug.trim(), email: email || null, phone: phone || null, plan, is_active: true, subscription_status: 'trial', max_users, billing_email: billing_email || null, notes: notes || null, trial_ends_at: trialEndsAt });

    const branch = await Branch.create({ company_id: company._id, name: 'Main Branch', is_default: true });

    const permissions = { products: { view: true, create: true, edit: true, delete: true }, sales: { view: true, create: true, edit: true, delete: true }, reports: { view: true }, settings: { view: true, edit: true } };
    const role = await Role.create({ company_id: company._id, name: 'admin', label: 'Administrator', permissions, is_system: true });

    const hashed = await bcrypt.hash(admin_password, BCRYPT_ROUNDS);
    await User.create({ company_id: company._id, branch_id: branch._id, role_id: role._id, name: admin_name || 'Admin', email: admin_email.toLowerCase(), password: hashed, is_active: true });

    logger.info(`[SuperAdmin] Company created: ${company.slug} (id=${company._id})`);
    return res.status(201).json({ success: true, data: { ...company.toJSON(), id: company._id.toString() }, message: 'Company created successfully.' });
  } catch (err) { next(err); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const existing = await Company.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Company not found.' });

    const { name, email, phone, plan, subscription_status, max_users, is_active, billing_email, notes } = req.body;
    const upd = {};
    if (name                !== undefined) upd.name                = name ?? existing.name;
    if (email               !== undefined) upd.email               = email;
    if (phone               !== undefined) upd.phone               = phone;
    if (plan                !== undefined) upd.plan                = plan;
    if (subscription_status !== undefined) upd.subscription_status = subscription_status;
    if (max_users           !== undefined) upd.max_users           = parseInt(max_users, 10);
    if (is_active           !== undefined) upd.is_active           = Boolean(is_active);
    if (billing_email       !== undefined) upd.billing_email       = billing_email;
    if (notes               !== undefined) upd.notes               = notes;
    upd.updated_at = new Date();

    const updated = await Company.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    return res.json({ success: true, data: { ...updated, id: updated._id.toString() }, message: 'Company updated.' });
  } catch (err) { next(err); }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const { plan, max_users, trial_ends_at } = req.body;
    if (!plan) return res.status(422).json({ success: false, message: 'plan is required.' });

    const upd = { plan, updated_at: new Date() };
    if (max_users)     upd.max_users    = parseInt(max_users, 10);
    if (trial_ends_at) upd.trial_ends_at = new Date(trial_ends_at);

    const updated = await Company.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found.' });
    logger.info(`[SuperAdmin] Plan updated: id=${req.params.id} plan=${plan}`);
    return res.json({ success: true, data: { id: updated._id.toString(), name: updated.name, plan: updated.plan, max_users: updated.max_users, trial_ends_at: updated.trial_ends_at }, message: 'Plan updated.' });
  } catch (err) { next(err); }
};

exports.updateFeatures = async (req, res, next) => {
  try {
    const features = req.body.features;
    if (!features || typeof features !== 'object') return res.status(422).json({ success: false, message: 'features object is required.' });

    const updated = await Company.findByIdAndUpdate(req.params.id, { features, updated_at: new Date() }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found.' });
    return res.json({ success: true, data: { id: updated._id.toString(), name: updated.name, features: updated.features }, message: 'Features updated.' });
  } catch (err) { next(err); }
};

exports.suspendCompany = async (req, res, next) => {
  try {
    const reason = req.body.reason || 'Suspended by admin';
    await Company.findByIdAndUpdate(req.params.id, { is_active: false, suspended_at: new Date(), suspended_reason: reason, subscription_status: 'suspended', updated_at: new Date() });
    logger.warn(`[SuperAdmin] Company suspended: id=${req.params.id} reason="${reason}"`);
    return res.json({ success: true, message: 'Company suspended.' });
  } catch (err) { next(err); }
};

exports.reinstateCompany = async (req, res, next) => {
  try {
    await Company.findByIdAndUpdate(req.params.id, { is_active: true, suspended_at: null, suspended_reason: null, subscription_status: 'active', updated_at: new Date() });
    logger.info(`[SuperAdmin] Company reinstated: id=${req.params.id}`);
    return res.json({ success: true, message: 'Company reinstated.' });
  } catch (err) { next(err); }
};

// ── Users ─────────────────────────────────────────────────────────────────────

exports.listUsers = async (req, res, next) => {
  try {
    const { search = '', company_id = '', status = '', page = 1, limit = 25 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 25, 100);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

    const filter = {};
    if (search)     filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (company_id) filter.company_id = company_id;
    if (status === 'active')   filter.is_active = true;
    if (status === 'inactive') filter.is_active = false;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, { name: 1, email: 1, is_active: 1, last_login: 1, created_at: 1, company_id: 1, role_id: 1 }).sort({ created_at: -1 }).skip(off).limit(lim).lean(),
    ]);

    const compIds = [...new Set(users.map(u => u.company_id?.toString()).filter(Boolean))];
    const roleIds = [...new Set(users.map(u => u.role_id?.toString()).filter(Boolean))];
    const [companies, roles] = await Promise.all([
      Company.find({ _id: { $in: compIds } }, { name: 1, slug: 1 }).lean(),
      Role.find({ _id: { $in: roleIds } }, { name: 1, label: 1 }).lean(),
    ]);
    const compMap = Object.fromEntries(companies.map(c => [c._id.toString(), c]));
    const roleMap = Object.fromEntries(roles.map(r => [r._id.toString(), r]));

    const data = users.map(u => {
      const c = u.company_id ? compMap[u.company_id.toString()] : null;
      const r = u.role_id    ? roleMap[u.role_id.toString()]    : null;
      return { id: u._id.toString(), name: u.name, email: u.email, is_active: u.is_active, last_login: u.last_login, created_at: u.created_at, company_id: c?._id?.toString(), company_name: c?.name, company_slug: c?.slug, role_name: r?.name, role_label: r?.label };
    });

    return res.json({ success: true, data, pagination: { total, page: parseInt(page, 10), limit: lim } });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
    const updated = await User.findByIdAndUpdate(req.params.id, { name: name ?? u.name, email: email ? email.toLowerCase().trim() : u.email, updated_at: new Date() }, { new: true, select: 'name email is_active' }).lean();
    return res.json({ success: true, data: { id: updated._id.toString(), name: updated.name, email: updated.email, is_active: updated.is_active }, message: 'User updated.' });
  } catch (err) { next(err); }
};

exports.toggleUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id, { is_active: 1 }).lean();
    if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
    const updated = await User.findByIdAndUpdate(req.params.id, { is_active: !u.is_active, updated_at: new Date() }, { new: true, select: 'is_active' }).lean();
    return res.json({ success: true, data: { id: updated._id.toString(), is_active: updated.is_active }, message: updated.is_active ? 'User activated.' : 'User deactivated.' });
  } catch (err) { next(err); }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(422).json({ success: false, message: 'Password must be at least 6 characters.' });
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await User.findByIdAndUpdate(req.params.id, { password: hashed, updated_at: new Date() });
    return res.json({ success: true, message: 'Password reset.' });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) { next(err); }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    logger.warn(`[SuperAdmin] Company deleted: id=${req.params.id}`);
    return res.json({ success: true, message: 'Company deleted.' });
  } catch (err) { next(err); }
};

exports.impersonateCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    const adminRole = await Role.findOne({ company_id: company._id, name: 'admin' }).lean();
    if (!adminRole) return res.status(404).json({ success: false, message: 'No admin role found for this company.' });

    const user = await User.findOne({ company_id: company._id, role_id: adminRole._id, is_active: true }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'No active admin found for this company.' });

    const token = jwt.sign({
      id:           user._id.toString(),
      companyId:    user.company_id.toString(),
      branchId:     user.branch_id?.toString() || null,
      role:         adminRole.name,
      permissions:  adminRole.permissions,
      impersonated: true,
    }, process.env.JWT_SECRET, { expiresIn: '2h' });

    logger.info(`[SuperAdmin] Impersonating company ${company.slug} as ${user.email}`);
    return res.json({ success: true, data: { token, user: { id: user._id.toString(), name: user.name, email: user.email, role: adminRole.name, roleId: adminRole._id.toString(), companyId: user.company_id.toString(), branchId: user.branch_id?.toString() || null, avatar: user.avatar, permissions: adminRole.permissions } } });
  } catch (err) { next(err); }
};

// ── Stats / Health ─────────────────────────────────────────────────────────────

exports.stats = async (req, res, next) => {
  try {
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const todayEnd   = new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z');

    const [companiesAgg, activeUsers, salesToday, lowStock] = await Promise.all([
      Company.aggregate([
        { $group: {
          _id:       null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: ['$is_active', 1, 0] } },
          trial:     { $sum: { $cond: [{ $eq: ['$subscription_status', 'trial'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$subscription_status', 'suspended'] }, 1, 0] } },
        }},
      ]),
      User.countDocuments({ is_active: true }),
      Sale.countDocuments({ sale_date: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'cancelled' } }),
      Product.countDocuments({ is_active: true, track_inventory: true, $expr: { $lte: ['$stock_quantity', '$low_stock_alert'] } }),
    ]);

    return res.json({
      success: true,
      data: {
        companies:          companiesAgg[0] || { total: 0, active: 0, trial: 0, suspended: 0 },
        active_users:       activeUsers,
        sales_today:        salesToday,
        low_stock_products: lowStock,
        server_time:        new Date().toISOString(),
        uptime_seconds:     Math.floor(process.uptime()),
        memory_mb:          Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  } catch (err) { next(err); }
};
