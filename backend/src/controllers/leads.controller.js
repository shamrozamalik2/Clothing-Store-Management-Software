'use strict';

const DemoLead = require('../models/DemoLead');
const logger   = require('../config/logger');
const { success, error } = require('../utils/response');

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

const listLeads = async (req, res, next) => {
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0,  0);
    const filter = req.query.status ? { status: req.query.status } : {};

    const [total, leads] = await Promise.all([
      DemoLead.countDocuments(filter),
      DemoLead.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);
    return success(res, { leads: leads.map(l => ({ ...l, id: l._id.toString() })), total });
  } catch (err) { next(err); }
};

const updateLead = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (status !== undefined && !STATUSES.includes(status)) return error(res, 'Invalid status.', 422);

    const update = {};
    if (status !== undefined) { update.status = status; update.handled_at = new Date(); update.handled_by = req.superAdmin.id; }
    if (notes  !== undefined) update.notes = String(notes || '').slice(0, 4000);

    const lead = await DemoLead.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!lead) return error(res, 'Lead not found.', 404);
    logger.info(`[SuperAdmin] Lead ${lead._id} updated`);
    return success(res, { ...lead, id: lead._id.toString() }, 'Lead updated.');
  } catch (err) { next(err); }
};

const deleteLead = async (req, res, next) => {
  try {
    const lead = await DemoLead.findByIdAndDelete(req.params.id).lean();
    if (!lead) return error(res, 'Lead not found.', 404);
    logger.info(`[SuperAdmin] Lead ${lead._id} deleted`);
    return success(res, null, 'Lead deleted.');
  } catch (err) { next(err); }
};

module.exports = { listLeads, updateLead, deleteLead };
