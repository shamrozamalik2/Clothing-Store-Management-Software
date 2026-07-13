'use strict';

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

const IS_DEV = process.env.NODE_ENV !== 'production';

// Ensure logs/ directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!IS_DEV) {
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (_) {}
}

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack ? `${ts} ${level}: ${message}\n${stack}` : `${ts} ${level}: ${message}`)
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const transports = [
  new winston.transports.Console({
    format: IS_DEV ? devFormat : prodFormat,
    silent: false,
  }),
];

if (!IS_DEV) {
  transports.push(
    new winston.transports.File({
      filename:  path.join(logsDir, 'error.log'),
      level:     'error',
      maxsize:   5 * 1024 * 1024,  // 5 MB
      maxFiles:  5,
      tailable:  true,
      format:    prodFormat,
    }),
    new winston.transports.File({
      filename:  path.join(logsDir, 'combined.log'),
      maxsize:   20 * 1024 * 1024, // 20 MB
      maxFiles:  10,
      tailable:  true,
      format:    prodFormat,
    })
  );
}

const logger = winston.createLogger({
  level: IS_DEV ? 'debug' : 'info',
  transports,
  exceptionHandlers: [
    new winston.transports.Console({ format: IS_DEV ? devFormat : prodFormat }),
    ...(!IS_DEV ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
        maxsize:  5 * 1024 * 1024,
        maxFiles: 3,
      }),
    ] : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: IS_DEV ? devFormat : prodFormat }),
    ...(!IS_DEV ? [
      new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
    ] : []),
  ],
  exitOnError: false,
});

// Morgan-compatible write stream for HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
