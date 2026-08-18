'use strict';

const migration = {
  version: 8,
  name: '008_employees_bom_holds',

  async up(client) {
    await client.query(`

      -- FCM token on users (push notifications)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

      -- Recurring support on expenses
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring  BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_day INTEGER;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_id     INTEGER REFERENCES expenses(id) ON DELETE SET NULL;

      -- Features toggle on companies (JSON map of enabled modules)
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}';

      -- ── Employees ──────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS employees (
        id            SERIAL        PRIMARY KEY,
        company_id    INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name          VARCHAR(255)  NOT NULL,
        email         VARCHAR(255),
        phone         VARCHAR(50),
        address       TEXT,
        designation   VARCHAR(100),
        department    VARCHAR(100),
        base_salary   NUMERIC(15,4) NOT NULL DEFAULT 0,
        allowances    NUMERIC(15,4) NOT NULL DEFAULT 0,
        deductions    NUMERIC(15,4) NOT NULL DEFAULT 0,
        hire_date     DATE,
        is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
        notes         TEXT,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS salaries (
        id            SERIAL        PRIMARY KEY,
        company_id    INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id   INTEGER       NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        month         INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
        year          INTEGER       NOT NULL,
        base_salary   NUMERIC(15,4) NOT NULL DEFAULT 0,
        allowances    NUMERIC(15,4) NOT NULL DEFAULT 0,
        deductions    NUMERIC(15,4) NOT NULL DEFAULT 0,
        gross_salary  NUMERIC(15,4) NOT NULL DEFAULT 0,
        net_salary    NUMERIC(15,4) NOT NULL DEFAULT 0,
        status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
        paid_at       TIMESTAMPTZ,
        payment_method VARCHAR(50)  NOT NULL DEFAULT 'cash',
        notes         TEXT,
        created_by    INTEGER       REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT salaries_emp_month_year_key UNIQUE (company_id, employee_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id           SERIAL       PRIMARY KEY,
        company_id   INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id  INTEGER      NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date         DATE         NOT NULL,
        check_in     TIMESTAMPTZ,
        check_out    TIMESTAMPTZ,
        status       VARCHAR(20)  NOT NULL DEFAULT 'present',
        notes        TEXT,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT attendance_emp_date_key UNIQUE (company_id, employee_id, date)
      );

      -- ── Manufacturing & BOM ────────────────────────────────────────────────────
      -- Mark a product as raw material
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_raw_material BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_finished_good BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS bill_of_materials (
        id                  SERIAL        PRIMARY KEY,
        company_id          INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        product_id          INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        raw_material_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity_required   NUMERIC(15,4) NOT NULL DEFAULT 1,
        unit                VARCHAR(50),
        created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT bom_product_material_key UNIQUE (company_id, product_id, raw_material_id)
      );

      CREATE TABLE IF NOT EXISTS production_batches (
        id                SERIAL        PRIMARY KEY,
        company_id        INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        product_id        INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        reference         VARCHAR(100)  NOT NULL,
        quantity_produced NUMERIC(15,4) NOT NULL,
        production_cost   NUMERIC(15,4) NOT NULL DEFAULT 0,
        batch_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
        status            VARCHAR(20)   NOT NULL DEFAULT 'completed',
        notes             TEXT,
        created_by        INTEGER       REFERENCES users(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT prod_batch_company_ref_key UNIQUE (company_id, reference)
      );

      CREATE TABLE IF NOT EXISTS production_batch_materials (
        id            SERIAL        PRIMARY KEY,
        company_id    INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        batch_id      INTEGER       NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
        product_id    INTEGER       REFERENCES products(id) ON DELETE SET NULL,
        product_name  VARCHAR(255)  NOT NULL,
        quantity_used NUMERIC(15,4) NOT NULL,
        unit_cost     NUMERIC(15,4) NOT NULL DEFAULT 0,
        total_cost    NUMERIC(15,4) NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- ── Cart Holds ─────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS cart_holds (
        id          SERIAL       PRIMARY KEY,
        company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
        label       VARCHAR(100),
        cart_data   JSONB        NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      -- ── Indexes ────────────────────────────────────────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_employees_company       ON employees(company_id);
      CREATE INDEX IF NOT EXISTS idx_salaries_company        ON salaries(company_id);
      CREATE INDEX IF NOT EXISTS idx_salaries_employee       ON salaries(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_company      ON attendance(company_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee     ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_bom_product             ON bill_of_materials(product_id);
      CREATE INDEX IF NOT EXISTS idx_prod_batches_company    ON production_batches(company_id);
      CREATE INDEX IF NOT EXISTS idx_prod_batch_mats         ON production_batch_materials(batch_id);
      CREATE INDEX IF NOT EXISTS idx_cart_holds_company      ON cart_holds(company_id);
    `);
  },

  async down(client) {
    await client.query(`
      DROP TABLE IF EXISTS cart_holds CASCADE;
      DROP TABLE IF EXISTS production_batch_materials CASCADE;
      DROP TABLE IF EXISTS production_batches CASCADE;
      DROP TABLE IF EXISTS bill_of_materials CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS salaries CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      ALTER TABLE products DROP COLUMN IF EXISTS is_raw_material;
      ALTER TABLE products DROP COLUMN IF EXISTS is_finished_good;
      ALTER TABLE expenses DROP COLUMN IF EXISTS is_recurring;
      ALTER TABLE expenses DROP COLUMN IF EXISTS recurring_day;
      ALTER TABLE expenses DROP COLUMN IF EXISTS parent_id;
      ALTER TABLE companies DROP COLUMN IF EXISTS features;
      ALTER TABLE users DROP COLUMN IF EXISTS fcm_token;
    `);
  },
};

module.exports = migration;
