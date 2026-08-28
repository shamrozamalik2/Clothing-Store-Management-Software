'use strict';

// Adds hr and manufacturing permission keys to all existing roles.
// System roles (admin/manager/cashier) get sensible defaults.
// Custom roles default to hr: false, manufacturing: false.
const migration = {
  version: 13,
  name: '013_hr_mfg_permissions',

  async up(client) {
    // System roles: apply per-role defaults
    await client.query(`
      UPDATE roles
      SET permissions = permissions
        || '{"hr": {"view": true, "create": true, "edit": true, "delete": true},
              "manufacturing": {"view": true, "create": true, "delete": true},
              "backup": {"view": true}, "audit_logs": {"view": true}}'::jsonb
      WHERE name = 'admin' AND is_system = TRUE
    `);

    await client.query(`
      UPDATE roles
      SET permissions = permissions
        || '{"hr": {"view": true, "create": true, "edit": true, "delete": false},
              "manufacturing": {"view": true, "create": true, "delete": false},
              "backup": {"view": true}}'::jsonb
      WHERE name = 'manager' AND is_system = TRUE
    `);

    await client.query(`
      UPDATE roles
      SET permissions = permissions
        || '{"hr": false, "manufacturing": false}'::jsonb
      WHERE name = 'cashier' AND is_system = TRUE
    `);

    // Custom roles: safe defaults (no access until explicitly granted)
    await client.query(`
      UPDATE roles
      SET permissions = permissions
        || '{"hr": false, "manufacturing": false}'::jsonb
      WHERE is_system = FALSE
        AND (permissions -> 'hr' IS NULL OR permissions -> 'manufacturing' IS NULL)
    `);
  },

  async down(client) {
    await client.query(`
      UPDATE roles
      SET permissions = permissions
        - 'hr'
        - 'manufacturing'
    `);
  },
};

module.exports = migration;
