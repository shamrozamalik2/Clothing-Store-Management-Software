'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');
const logger    = require('../config/logger');

const SUPER_ADMIN_SECRET  = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const JWT_EXPIRES_IN      = '4h';
const BCRYPT_ROUNDS       = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// ── Auth ──────────────────────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ success: false, message: 'Email and password are required.' });
    }

    const { rows: [admin] } = await query(
      'SELECT * FROM super_admins WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await query('UPDATE super_admins SET last_login=NOW() WHERE id=$1', [admin.id]);

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'super_admin' },
      SUPER_ADMIN_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`[SuperAdmin] Login: ${admin.email}`);
    return res.json({ success: true, data: { token, admin: { id: admin.id, name: admin.name, email: admin.email } } });
  } catch (err) { next(err); }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ success: false, message: 'name, email and password are required.' });
    }
    if (password.length < 10) {
      return res.status(422).json({ success: false, message: 'Password must be at least 10 characters.' });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows: [admin] } = await query(`
      INSERT INTO super_admins (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `, [name.trim(), email.toLowerCase().trim(), hashed]);

    return res.status(201).json({ success: true, data: admin });
  } catch (err) { next(err); }
};

// ── Companies ─────────────────────────────────────────────────────────────────

exports.listCompanies = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 25 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 25, 100);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

    const params = [];
    const where  = ['1=1'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      where.push(`c.subscription_status = $${params.length}`);
    }

    const wStr = where.join(' AND ');

    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*) AS cnt FROM companies c WHERE ${wStr}`,
      params
    );

    params.push(lim, off);
    const { rows: companies } = await query(`
      SELECT
        c.id, c.name, c.slug, c.email, c.phone, c.plan,
        c.subscription_status, c.max_users, c.is_active,
        c.trial_ends_at, c.suspended_at, c.billing_email,
        c.notes, c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_active = TRUE)::int AS active_users,
        (SELECT COUNT(*) FROM sales s WHERE s.company_id = c.id)::int AS total_sales
      FROM companies c
      WHERE ${wStr}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({
      success: true,
      data: companies,
      pagination: { total: parseInt(cnt, 10), page: parseInt(page, 10), limit: lim },
    });
  } catch (err) { next(err); }
};

exports.getCompany = async (req, res, next) => {
  try {
    const { rows: [company] } = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_active = TRUE)::int AS active_users,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id)::int AS total_users,
        (SELECT COUNT(*) FROM sales s WHERE s.company_id = c.id)::int AS total_sales,
        (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id)::int AS total_products
      FROM companies c
      WHERE c.id = $1
    `, [req.params.id]);

    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    return res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

exports.createCompany = async (req, res, next) => {
  try {
    const {
      name, slug, email, phone, plan = 'standard',
      max_users = 5, billing_email, notes,
      admin_name, admin_email, admin_password,
    } = req.body;

    if (!name || !slug || !admin_email || !admin_password) {
      return res.status(422).json({ success: false, message: 'name, slug, admin_email and admin_password are required.' });
    }

    const { rows: [company] } = await query(`
      INSERT INTO companies (name, slug, email, phone, plan, is_active, subscription_status, max_users, billing_email, notes, trial_ends_at)
      VALUES ($1,$2,$3,$4,$5,TRUE,'trial',$6,$7,$8, NOW() + INTERVAL '30 days')
      RETURNING *
    `, [name.trim(), slug.trim(), email || null, phone || null, plan, max_users, billing_email || null, notes || null]);

    // Create default branch
    const { rows: [branch] } = await query(
      'INSERT INTO branches (company_id, name, is_default) VALUES ($1,$2,TRUE) RETURNING id',
      [company.id, 'Main Branch']
    );

    // Create admin role
    const permissions = { products: { view:true,create:true,edit:true,delete:true }, sales: { view:true,create:true,edit:true,delete:true }, reports: { view:true }, settings: { view:true,edit:true } };
    const { rows: [role] } = await query(
      "INSERT INTO roles (company_id, name, label, permissions, is_system) VALUES ($1,'admin','Administrator',$2::jsonb,TRUE) RETURNING id",
      [company.id, JSON.stringify(permissions)]
    );

    // Create admin user
    const hashed = await bcrypt.hash(admin_password, BCRYPT_ROUNDS);
    await query(
      'INSERT INTO users (company_id, branch_id, role_id, name, email, password) VALUES ($1,$2,$3,$4,$5,$6)',
      [company.id, branch.id, role.id, admin_name || 'Admin', admin_email.toLowerCase(), hashed]
    );

    logger.info(`[SuperAdmin] Company created: ${company.slug} (id=${company.id})`);
    return res.status(201).json({ success: true, data: company, message: 'Company created successfully.' });
  } catch (err) { next(err); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, phone, plan, subscription_status, max_users, is_active, billing_email, notes } = req.body;

    const { rows: [existing] } = await query('SELECT * FROM companies WHERE id=$1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Company not found.' });

    const { rows: [updated] } = await query(`
      UPDATE companies SET
        name=$2, email=$3, phone=$4, plan=$5,
        subscription_status=$6, max_users=$7, is_active=$8,
        billing_email=$9, notes=$10, updated_at=NOW()
      WHERE id=$1
      RETURNING *
    `, [
      id,
      name ?? existing.name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      plan ?? existing.plan,
      subscription_status ?? existing.subscription_status,
      max_users !== undefined ? parseInt(max_users, 10) : existing.max_users,
      is_active !== undefined ? Boolean(is_active) : existing.is_active,
      billing_email !== undefined ? billing_email : existing.billing_email,
      notes !== undefined ? notes : existing.notes,
    ]);

    return res.json({ success: true, data: updated, message: 'Company updated.' });
  } catch (err) { next(err); }
};

exports.suspendCompany = async (req, res, next) => {
  try {
    const id     = parseInt(req.params.id, 10);
    const reason = req.body.reason || 'Suspended by admin';

    await query(
      "UPDATE companies SET is_active=FALSE, suspended_at=NOW(), suspended_reason=$2, subscription_status='suspended', updated_at=NOW() WHERE id=$1",
      [id, reason]
    );
    logger.warn(`[SuperAdmin] Company suspended: id=${id} reason="${reason}"`);
    return res.json({ success: true, message: 'Company suspended.' });
  } catch (err) { next(err); }
};

exports.reinstateCompany = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await query(
      "UPDATE companies SET is_active=TRUE, suspended_at=NULL, suspended_reason=NULL, subscription_status='active', updated_at=NOW() WHERE id=$1",
      [id]
    );
    logger.info(`[SuperAdmin] Company reinstated: id=${id}`);
    return res.json({ success: true, message: 'Company reinstated.' });
  } catch (err) { next(err); }
};

// ── Stats / Health ─────────────────────────────────────────────────────────────

exports.stats = async (req, res, next) => {
  try {
    const [companies, users, sales, stock] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active,
          SUM(CASE WHEN subscription_status='trial' THEN 1 ELSE 0 END)::int AS trial,
          SUM(CASE WHEN subscription_status='suspended' THEN 1 ELSE 0 END)::int AS suspended
        FROM companies
      `),
      query('SELECT COUNT(*)::int AS total FROM users WHERE is_active=TRUE'),
      query("SELECT COUNT(*)::int AS today FROM sales WHERE sale_date::date = CURRENT_DATE AND status != 'cancelled'"),
      query("SELECT COUNT(*)::int AS low FROM products WHERE is_active=TRUE AND track_inventory=TRUE AND stock_quantity <= low_stock_alert"),
    ]);

    return res.json({
      success: true,
      data: {
        companies: companies.rows[0],
        active_users: users.rows[0].total,
        sales_today:  sales.rows[0].today,
        low_stock_products: stock.rows[0].low,
        server_time: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  } catch (err) { next(err); }
};
