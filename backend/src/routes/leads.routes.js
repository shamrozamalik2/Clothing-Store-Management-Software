'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const DemoLead = require('../models/DemoLead');
const logger   = require('../config/logger');
const { requireSuperAdmin } = require('../middleware/superadmin.middleware');

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many demo requests from this address. Please try again later, or email us directly.' },
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
  body('company_website').optional().isEmpty().withMessage('Rejected.'),
];

// POST /api/leads — public
router.post('/', submitLimiter, validators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Please check the highlighted fields.', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  try {
    const { name, business, email, phone, type, locations, message } = req.body;
    const lead = await DemoLead.create({
      name, business, email,
      phone:         phone    || null,
      business_type: type     || null,
      locations:     locations || null,
      message:       message  || null,
      source:        'website',
      ip:            req.ip   || null,
      user_agent:    (req.get('user-agent') || '').slice(0, 400) || null,
    });
    logger.info(`[leads] demo request ${lead._id} from ${business} <${email}>`);
    return res.status(201).json({ success: true, message: 'Thank you — your request has been received.' });
  } catch (err) { return next(err); }
});

// GET /api/leads — super-admin only
router.get('/', requireSuperAdmin, async (req, res, next) => {
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0,  0);
    const filter = req.query.status ? { status: req.query.status } : {};

    const [total, leads] = await Promise.all([
      DemoLead.countDocuments(filter),
      DemoLead.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);
    return res.json({ success: true, data: { leads: leads.map(l => ({ ...l, id: l._id.toString() })), total } });
  } catch (err) { return next(err); }
});

// PATCH /api/leads/:id — super-admin only
router.patch('/:id', requireSuperAdmin,
  [
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'converted', 'rejected']),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, message: 'Invalid update.', errors: errors.array() });
    try {
      const { status, notes } = req.body;
      const upd = {};
      if (status !== undefined) { upd.status = status; upd.handled_at = new Date(); }
      if (notes  !== undefined) upd.notes = notes;
      const lead = await DemoLead.findByIdAndUpdate(req.params.id, upd, { new: true }).lean();
      if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
      return res.json({ success: true, data: { ...lead, id: lead._id.toString() } });
    } catch (err) { return next(err); }
  }
);

module.exports = router;
