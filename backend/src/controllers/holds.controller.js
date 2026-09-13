'use strict';

const CartHold = require('../models/CartHold');
const User     = require('../models/User');
const { success, created, error } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const holds = await CartHold.find({ company_id: req.companyId }).sort({ created_at: -1 }).lean();
    const userIds = [...new Set(holds.map(h => h.user_id?.toString()).filter(Boolean))];
    const users   = await User.find({ _id: { $in: userIds } }, { name: 1 }).lean();
    const uMap    = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));
    const data    = holds.map(h => ({ ...h, id: h._id.toString(), user_name: h.user_id ? uMap[h.user_id.toString()] || null : null }));
    return success(res, data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { label, cart_data } = req.body;
    if (!cart_data) return error(res, 'cart_data is required.', 422);

    const hold = await CartHold.create({
      company_id: req.companyId,
      user_id:    req.user.id,
      label:      label || null,
      cart_data:  typeof cart_data === 'string' ? JSON.parse(cart_data) : cart_data,
    });
    return created(res, { ...hold.toJSON(), id: hold._id.toString() }, 'Cart saved.');
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const hold = await CartHold.findOneAndDelete({ _id: req.params.id, company_id: req.companyId });
    if (!hold) return error(res, 'Hold not found.', 404);
    return success(res, null, 'Hold deleted.');
  } catch (err) { next(err); }
};
