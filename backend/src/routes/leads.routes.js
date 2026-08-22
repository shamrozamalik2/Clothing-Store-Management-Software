'use strict';

/**
 * Demo-request capture.
 *
 * POST /api/leads is PUBLIC — it is the marketing site's conversion endpoint,
 * so it is deliberately unauthenticated but tightly rate limited and
 * validated. Reading leads back requires super-admin credentials.
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const logger = require('../config/logger');
const { requireSuperAdmin } = require('../middleware/superadmin.middleware');

const router = Router();

/* A public write endpoint needs a much tighter limit than the global one. */
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many demo requests from this address. Please try again later, or email us directly.',
  },
});

const MAX = { name: 120, business: 160, email: 200, phone: 40, business_type: 80, locations: 20, message: 4000 };

const validators = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: MAX.name }),
  body('business').trim().notEmpty().withMessage('Business name is required.').isLength({ max: MAX.business }),
  body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail().isLength({ max: MAX.email }),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: MAX.phone }),
  body('type').optional({ values: 'falsy' }).trim().isLength({ max: MAX.business_type }),
  body('locations').optional({ values: 'falsy' }).trim().isLength({ max: MAX.locations }),
  body('message').optional({ values: 'falsy' }).trim().isLength({ max: MAX.message }),
  body('consent').custom((v) => v === true || v === 'true').withMessage('Consent is required.'),
  // Honeypot: real users never fill this; bots usually do.
  body('company_website').optional().isEmpty().withMessage('Rejected.'),
];

/* ── POST /api/leads — public ─────────────────────────────────────────────── */
router.post('/', submitLimiter, validators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Please check the highlighted fields.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const { name, business, email, phone, type, locations, message } = req.body;

    const { rows } = await query(
      `INSERT INTO demo_leads
         (name, business, email, phone, business_type, locations, message, source, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, created_at`,
      [
        name,
        business,
        email,
        phone || null,
        type || null,
        locations || null,
        message || null,
        'website',
        req.ip || null,
        (req.get('user-agent') || '').slice(0, 400) || null,
      ]
    );

    logger.info(`[leads] demo request #${rows[0].id} from ${business} <${email}>`);

    // Never echo the stored row back to an anonymous caller.
    return res.status(201).json({
      success: true,
      message: 'Thank you — your request has been received.',
    });
  } catch (err) {
    return next(err);
  }
});

/* ── GET /api/leads — super-admin only ────────────────────────────────────── */
router.get('/', requireSuperAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = req.query.status;

    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT id, created_at, name, business, email, phone, business_type,
              locations, message, status, notes, handled_at
         FROM demo_leads
         ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM demo_leads ${where}`,
      status ? [status] : []
    );

    return res.json({ success: true, data: { leads: rows, total: countRows[0].total } });
  } catch (err) {
    return next(err);
  }
});

/* ── PATCH /api/leads/:id — super-admin only ──────────────────────────────── */
router.patch(
  '/:id',
  requireSuperAdmin,
  [
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'closed', 'spam']),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Invalid update.', errors: errors.array() });
    }
    try {
      const { status, notes } = req.body;
      const { rows } = await query(
        `UPDATE demo_leads
            SET status     = COALESCE($1, status),
                notes      = COALESCE($2, notes),
                handled_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE handled_at END
          WHERE id = $3
        RETURNING id, status, notes, handled_at`,
        [status || null, notes || null, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Lead not found.' });
      return res.json({ success: true, data: rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
