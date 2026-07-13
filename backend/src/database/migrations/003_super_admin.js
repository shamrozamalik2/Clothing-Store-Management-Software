'use strict';

// Migration 003 — Super admin table + company subscription columns

const migration = {
  version: 3,
  name: '003_super_admin',

  async up(client) {
    await client.query(`
      -- Super-admin accounts (cross-tenant, managed by the platform operator)
      CREATE TABLE IF NOT EXISTS super_admins (
        id            SERIAL       PRIMARY KEY,
        name          VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        password      VARCHAR(255) NOT NULL,
        is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
        last_login    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT super_admins_email_key UNIQUE (email)
      );

      -- Extend companies with subscription / licensing metadata
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'trial',
        ADD COLUMN IF NOT EXISTS max_users            INTEGER     NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS license_key          VARCHAR(100),
        ADD COLUMN IF NOT EXISTS billing_email        VARCHAR(255),
        ADD COLUMN IF NOT EXISTS notes               TEXT,
        ADD COLUMN IF NOT EXISTS suspended_at         TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS suspended_reason     TEXT;

      -- Index for fast status lookups
      CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(subscription_status);
      CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
    `);
  },

  async down(client) {
    await client.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS subscription_status,
        DROP COLUMN IF EXISTS max_users,
        DROP COLUMN IF EXISTS license_key,
        DROP COLUMN IF EXISTS billing_email,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS suspended_at,
        DROP COLUMN IF EXISTS suspended_reason;

      DROP TABLE IF EXISTS super_admins;
    `);
  },
};

module.exports = migration;
