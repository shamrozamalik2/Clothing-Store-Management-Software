'use strict';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[Config] Missing required environment variable: ${name}`);
  return v;
}

function opt(name, def) {
  return process.env[name] || def;
}

const env = {
  NODE_ENV: opt('NODE_ENV', 'development'),
  IS_DEV:   opt('NODE_ENV', 'development') !== 'production',
  PORT:     parseInt(opt('PORT', '3001'), 10),

  // ── PostgreSQL ─────────────────────────────────────────────
  DATABASE_URL: req('DATABASE_URL'),
  DB_POOL_MAX:  parseInt(opt('DB_POOL_MAX', '20'), 10),
  DB_SSL:       opt('DB_SSL', 'true') === 'true',

  // ── JWT access token (short-lived, 15 minutes) ─────────────
  JWT_SECRET:     req('JWT_SECRET'),
  JWT_EXPIRES_IN: opt('JWT_EXPIRES_IN', '15m'),

  // ── Refresh token (long-lived, HttpOnly cookie) ────────────
  REFRESH_SECRET:      req('REFRESH_SECRET'),
  REFRESH_EXPIRES_DAYS: parseInt(opt('REFRESH_EXPIRES_DAYS', '7'), 10),

  // ── Security ───────────────────────────────────────────────
  BCRYPT_ROUNDS:        parseInt(opt('BCRYPT_ROUNDS', '12'), 10),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX:       parseInt(opt('RATE_LIMIT_MAX', '300'), 10),

  // ── File uploads ───────────────────────────────────────────
  UPLOADS_DIR:   opt('UPLOADS_DIR', 'uploads'),
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB

  // ── CORS (comma-separated list of allowed origins) ────────
  CORS_ORIGINS: opt('CORS_ORIGINS', 'http://localhost:5173').split(',').map(s => s.trim()),

  // ── Cookie ────────────────────────────────────────────────
  COOKIE_SECRET: opt('COOKIE_SECRET', req('JWT_SECRET')),
};

module.exports = { env };
