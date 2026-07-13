'use strict';

const success = (res, data = null, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data = null, message = 'Created successfully') =>
  success(res, data, message, 201);

const paginated = (res, data, pagination, message = 'Success') =>
  res.status(200).json({ success: true, message, data, pagination });

const error = (res, message = 'Error', status = 400, errors = null) =>
  res.status(status).json({ success: false, message, ...(errors && { errors }) });

module.exports = { success, created, paginated, error };
