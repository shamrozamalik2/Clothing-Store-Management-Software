'use strict';

const path = require('path');
const fs   = require('fs');
const { initDb, getClient, closeDb } = require('../config/database');

function getMigrations() {
  const dir = path.join(__dirname, 'migrations');
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(f => require(path.join(dir, f)));
}

async function getAppliedVersions(client) {
  try {
    const { rows } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return new Set(rows.map(r => r.version));
  } catch {
    return new Set();
  }
}

async function runMigrations() {
  const client = await getClient();
  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER      PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    const applied    = await getAppliedVersions(client);
    const migrations = getMigrations();
    let ran = 0;

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        console.log(`[Migrate] Skip   v${migration.version}: ${migration.name}`);
        continue;
      }

      console.log(`[Migrate] Running v${migration.version}: ${migration.name}…`);
      await client.query('BEGIN');
      try {
        await migration.up(client);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
        await client.query('COMMIT');
        console.log(`[Migrate] Done    v${migration.version}: ${migration.name}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrate] FAILED  v${migration.version}: ${migration.name}`, err.message);
        throw err;
      }
    }

    if (ran === 0) {
      console.log('[Migrate] Database is up to date.');
    } else {
      console.log(`[Migrate] Applied ${ran} migration(s).`);
    }
  } finally {
    client.release();
  }
}

// Standalone: node backend/src/database/migrate.js
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
  initDb();
  runMigrations()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { runMigrations };
