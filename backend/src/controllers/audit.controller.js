'use strict';

const AuditLog = require('../models/AuditLog');
const User     = require('../models/User');
const { success } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { page, limit, offset } = parsePagination(req.query);
    const { action = '', entity = '', user_id = '', date_from = '', date_to = '' } = req.query;

    const filter = { company_id: cid };
    if (action)    filter.action   = { $regex: action, $options: 'i' };
    if (entity)    filter.entity   = entity;
    if (user_id)   filter.user_id  = user_id;
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) filter.created_at.$gte = new Date(date_from + 'T00:00:00.000Z');
      if (date_to)   filter.created_at.$lte = new Date(date_to   + 'T23:59:59.999Z');
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
    ]);

    const userIds = [...new Set(logs.map(l => l.user_id?.toString()).filter(Boolean))];
    const users   = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1 }).lean();
    const uMap    = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const data = logs.map(l => ({
      ...l,
      id:         l._id.toString(),
      user_name:  l.user_id ? uMap[l.user_id.toString()]?.name  || null : null,
      user_email: l.user_id ? uMap[l.user_id.toString()]?.email || null : null,
    }));

    return res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};
