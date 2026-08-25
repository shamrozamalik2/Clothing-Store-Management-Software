'use strict';

module.exports = {
  version: 12,
  name: '012_performance_indexes',

  async up(client) {
    await client.query(`
      -- returns: company listing (UNIQUE on company+ref already exists but no plain company index)
      CREATE INDEX IF NOT EXISTS idx_returns_company
        ON returns(company_id);

      -- return_items: join by return_id
      CREATE INDEX IF NOT EXISTS idx_return_items_return
        ON return_items(return_id);

      -- exchange_items: join by return_id
      CREATE INDEX IF NOT EXISTS idx_exchange_items_return
        ON exchange_items(return_id);

      -- purchase_payments: join by purchase_id
      CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase
        ON purchase_payments(purchase_id);

      -- customers: phone search (POS customer lookup)
      CREATE INDEX IF NOT EXISTS idx_customers_phone
        ON customers(company_id, phone) WHERE phone IS NOT NULL;

      -- sales: filter by status + date (reports)
      CREATE INDEX IF NOT EXISTS idx_sales_status
        ON sales(company_id, status, sale_date DESC);

      -- audit_logs: time-only index for the cleanup job
      CREATE INDEX IF NOT EXISTS idx_audit_created_at
        ON audit_logs(created_at);

      -- product_variants: company-level scan (backup / bulk ops)
      CREATE INDEX IF NOT EXISTS idx_variants_company
        ON product_variants(company_id);

      -- expenses: filter by category
      CREATE INDEX IF NOT EXISTS idx_expenses_category
        ON expenses(company_id, category_id);
    `);
  },

  async down(client) {
    await client.query(`
      DROP INDEX IF EXISTS idx_returns_company;
      DROP INDEX IF EXISTS idx_return_items_return;
      DROP INDEX IF EXISTS idx_exchange_items_return;
      DROP INDEX IF EXISTS idx_purchase_payments_purchase;
      DROP INDEX IF EXISTS idx_customers_phone;
      DROP INDEX IF EXISTS idx_sales_status;
      DROP INDEX IF EXISTS idx_audit_created_at;
      DROP INDEX IF EXISTS idx_variants_company;
      DROP INDEX IF EXISTS idx_expenses_category;
    `);
  },
};
