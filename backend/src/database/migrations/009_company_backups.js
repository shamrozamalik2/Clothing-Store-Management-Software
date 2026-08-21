'use strict';

const migration = {
  version: 9,
  name: '009_company_backups',

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_backups (
        id          SERIAL        PRIMARY KEY,
        company_id  INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_by  INTEGER       REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        file_name   TEXT          NOT NULL,
        version     TEXT,
        row_counts  JSONB         NOT NULL DEFAULT '{}',
        data        JSONB         NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_company_backups_company_id ON company_backups(company_id);
      CREATE INDEX IF NOT EXISTS idx_company_backups_created_at ON company_backups(created_at DESC);
    `);
  },

  async down(client) {
    await client.query(`DROP TABLE IF EXISTS company_backups;`);
  },
};

module.exports = migration;
