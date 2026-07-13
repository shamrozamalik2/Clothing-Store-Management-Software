'use strict';

const { env } = require('./env');

module.exports = {
  PORT:    env.PORT,
  IS_DEV:  env.IS_DEV,
  NODE_ENV: env.NODE_ENV,

  // Auth (re-exported for legacy imports)
  JWT_SECRET:    env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  BCRYPT_ROUNDS: env.BCRYPT_ROUNDS,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX:       env.RATE_LIMIT_MAX,

  // File uploads
  UPLOADS_DIR:      env.UPLOADS_DIR,
  BACKUPS_DIR:      env.UPLOADS_DIR.replace('uploads', 'backups'),
  MAX_FILE_SIZE:    env.MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE:     100,

  // Roles
  ROLES: {
    ADMIN:   'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
  },

  // Audit action strings
  AUDIT_ACTIONS: {
    LOGIN:        'LOGIN',
    LOGOUT:       'LOGOUT',
    CREATE:       'CREATE',
    UPDATE:       'UPDATE',
    DELETE:       'DELETE',
    SALE:         'SALE',
    PURCHASE:     'PURCHASE',
    RETURN:       'RETURN',
    STOCK_ADJUST: 'STOCK_ADJUST',
    BACKUP:       'BACKUP',
    RESTORE:      'RESTORE',
  },
};
