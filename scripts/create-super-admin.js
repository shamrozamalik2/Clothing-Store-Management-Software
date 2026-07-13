#!/usr/bin/env node
/**
 * One-time CLI to create the first super admin account.
 * Usage: node scripts/create-super-admin.js
 *
 * Requires DATABASE_URL and SUPER_ADMIN_JWT_SECRET to be set (via .env or env vars).
 */
require('dotenv').config();

const readline = require('readline');
const bcrypt   = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  console.log('\n=== SAS Garments — Create Super Admin ===\n');

  const email    = await ask('Email: ');
  const name     = await ask('Name:  ');
  const password = await ask('Password (min 10 chars): ');

  if (!email || !password || password.length < 10) {
    console.error('Email and password (≥10 chars) are required.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12', 10));

  try {
    const { rows } = await pool.query(
      `INSERT INTO super_admins (email, name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [email.trim().toLowerCase(), name.trim(), hash],
    );

    if (rows.length === 0) {
      console.log(`\nA super admin with email "${email}" already exists.`);
    } else {
      console.log(`\nSuper admin created: ${rows[0].email} (id=${rows[0].id})`);
    }
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    rl.close();
  }
}

main();
