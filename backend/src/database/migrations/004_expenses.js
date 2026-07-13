'use strict';

module.exports = {
  version: 4,
  name: '004_expenses',

  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id             SERIAL PRIMARY KEY,
        company_id     INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        category_id    INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
        reference      VARCHAR(50),
        amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(20)   NOT NULL DEFAULT 'cash',
        expense_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
        description    TEXT,
        notes          TEXT,
        created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date    ON expenses(company_id, expense_date DESC)`);
  },

  async down(client) {
    await client.query(`DROP TABLE IF EXISTS expenses`);
  },
};
