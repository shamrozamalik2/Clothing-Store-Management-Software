'use strict';

const { env } = require('../config/env');

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[Error]', err.message, err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const detail = err.detail || '';
    const field  = detail.match(/Key \(([^)]+)\)/)?.[1] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'Related record does not exist or has been deleted.',
    });
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: `Required field is missing: ${err.column || 'unknown'}.`,
    });
  }

  // Multer file size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum 5 MB allowed.' });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    message,
    ...(env.IS_DEV && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
