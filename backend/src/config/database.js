'use strict';

const { Pool } = require('pg');
const { env } = require('./env');

let pool;

function initDb() {
  if (pool) return pool;

  pool = new Pool({
    connectionString:        env.DATABASE_URL,
    ssl:                     env.DB_SSL ? { rejectUnauthorized: false } : false,
    max:                     env.DB_POOL_MAX,
    idleTimeoutMillis:       30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout:       30_000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool client error:', err.message);
  });

  console.log('[DB] PostgreSQL pool created');
  return pool;
}

function getPool() {
  if (!pool) throw new Error('[DB] Pool not initialised — call initDb() first.');
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (env.IS_DEV) {
    const start = Date.now();
    const result = await p.query(text, params);
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 70);
    console.log(`[DB] ${Date.now() - start}ms rows:${result.rowCount} ${preview}`);
    return result;
  }
  return p.query(text, params);
}

async function getClient() {
  return getPool().connect();
}

async function withTransaction(fn) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Pool closed.');
  }
}

process.on('SIGINT',  () => closeDb().then(() => process.exit(0)));
process.on('SIGTERM', () => closeDb().then(() => process.exit(0)));

module.exports = { initDb, getPool, query, getClient, withTransaction, closeDb };
