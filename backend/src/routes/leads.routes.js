'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const DemoLead = require('../models/DemoLead');
const logger   = require('../config/logger');
const mailer   = require('../utils/mailer');

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
    // Best-effort — must never block or fail the submission itself.
    mailer.notifyNewLead(lead).catch(err => logger.warn(`[leads] notify email failed: ${err.message}`));
    return res.status(201).json({ success: true, message: 'Thank you — your request has been received.' });
  } catch (err) { return next(err); }
});

// Admin management of leads (list / update / delete) lives under
// /api/admin/leads, alongside the rest of the super admin API surface —
// see routes/admin.routes.js and controllers/leads.controller.js.

module.exports = router;
