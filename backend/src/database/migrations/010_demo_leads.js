'use strict';

const migration = {
  version: 10,
  name: '010_demo_leads',

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_leads (
        id            SERIAL      PRIMARY KEY,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        name          TEXT        NOT NULL,
        business      TEXT        NOT NULL,
        email         TEXT        NOT NULL,
        phone         TEXT,
        business_type TEXT,
        locations     TEXT,
        message       TEXT,

        -- Provenance, useful for attribution and for spotting abuse.
        source        TEXT        NOT NULL DEFAULT 'website',
        ip            TEXT,
        user_agent    TEXT,

        -- Simple pipeline state so the team can work the list.
        status        TEXT        NOT NULL DEFAULT 'new',
        notes         TEXT,
        handled_by    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
        handled_at    TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_demo_leads_created_at ON demo_leads(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_demo_leads_status     ON demo_leads(status);
      CREATE INDEX IF NOT EXISTS idx_demo_leads_email      ON demo_leads(lower(email));
    `);
  },

  async down(client) {
    await client.query(`DROP TABLE IF EXISTS demo_leads;`);
  },
};

module.exports = migration;
