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
    if (!origin) return cb(null, true); // Electron / mobile native
    if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
    // Allow any localhost port for mobile/web dev testing
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting (per IP — global guard) ────────────────────────────────────
app.use(rateLimit({
  windowMs:        env.RATE_LIMIT_WINDOW_MS,
  max:             env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

// ── Per-company rate limiting (prevents one tenant from hogging the DB) ───────
// Decodes the JWT payload without verification (safe — used only for key bucketing,
// not for auth decisions). Falls back to IP for unauthenticated requests.
{
  const COMPANY_WINDOW_MS = 60_000;  // 1-minute rolling window
  const COMPANY_MAX       = 600;     // requests per window per company (across all its users)
  const buckets           = new Map(); // { key -> { count, resetAt } }

  // Prune stale buckets every minute so the Map doesn't grow unbounded
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }, COMPANY_WINDOW_MS).unref();

  app.use('/api', (req, res, next) => {
    let key = req.ip;
    try {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        const raw     = auth.split('.')[1];
        const payload = JSON.parse(Buffer.from(raw, 'base64url').toString());
        if (payload?.companyId) key = `co:${payload.companyId}`;
      }
    } catch (_) { /* malformed JWT — fall back to IP */ }

    const now    = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + COMPANY_WINDOW_MS });
      return next();
    }
    bucket.count++;
    if (bucket.count > COMPANY_MAX) {
      return res.status(429).json({
        success: false,
        message: 'Company rate limit exceeded. Please slow down.',
      });
    }
    next();
  });
}

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
