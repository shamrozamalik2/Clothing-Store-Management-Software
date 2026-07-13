'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@sasgarments.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin@098';

bcrypt.hash(PASSWORD, 12)
  .then(hash => pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, EMAIL]))
  .then(r => console.log(`Done. Rows updated: ${r.rowCount}`))
  .catch(e => console.error('Error:', e.message))
  .finally(() => pool.end());
