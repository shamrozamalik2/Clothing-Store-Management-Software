'use strict';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const { env }                    = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const logger                     = require('./config/logger');
const routes                     = require('./routes');

const app = express();

app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow Electron packaged (null origin), configured origins, and dev server
    if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs:       env.RATE_LIMIT_WINDOW_MS,
  max:            env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan(env.IS_DEV ? 'dev' : 'combined', { stream: logger.stream }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.UPLOADS_DIR), {
  maxAge: '1d',
  etag:   true,
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 & error handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
