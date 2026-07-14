'use strict';

module.exports = {
  version: 5,
  name: '005_expenses_columns',

  async up(client) {
    // Add any columns missing from the expenses table (safe to run multiple times)
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT`);
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes       TEXT`);
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference   VARCHAR(50)`);
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  },

  async down(client) {
    await client.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS description`);
    await client.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS notes`);
    await client.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS reference`);
    await client.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS created_by`);
    await client.query(`ALTER TABLE expenses DROP COLUMN IF EXISTS updated_at`);
  },
};
