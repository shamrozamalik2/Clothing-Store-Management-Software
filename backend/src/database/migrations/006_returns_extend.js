'use strict';

module.exports = {
  version: 6,
  name: '006_returns_extend',

  async up(client) {
    // Extend returns table with type, reason, amounts
    await client.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS type          VARCHAR(20)    NOT NULL DEFAULT 'return'`);
    await client.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS reason        TEXT`);
    await client.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(15,4)  NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS exchange_total NUMERIC(15,4) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()`);

    // Link return_items back to the exact sale_items row
    await client.query(`ALTER TABLE return_items ADD COLUMN IF NOT EXISTS sale_item_id INTEGER REFERENCES sale_items(id) ON DELETE SET NULL`);

    // New table for items given out during an exchange
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_items (
        id           SERIAL PRIMARY KEY,
        company_id   INTEGER       NOT NULL,
        return_id    INTEGER       NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        product_id   INTEGER       REFERENCES products(id)         ON DELETE SET NULL,
        variant_id   INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
        product_name VARCHAR(255)  NOT NULL,
        sku          VARCHAR(100),
        quantity     NUMERIC(15,4) NOT NULL,
        unit_price   NUMERIC(15,4) NOT NULL,
        total        NUMERIC(15,4) NOT NULL
      )
    `);
  },

  async down(client) {
    await client.query(`DROP TABLE IF EXISTS exchange_items`);
    await client.query(`ALTER TABLE return_items DROP COLUMN IF EXISTS sale_item_id`);
    await client.query(`ALTER TABLE returns DROP COLUMN IF EXISTS type`);
    await client.query(`ALTER TABLE returns DROP COLUMN IF EXISTS reason`);
    await client.query(`ALTER TABLE returns DROP COLUMN IF EXISTS refund_amount`);
    await client.query(`ALTER TABLE returns DROP COLUMN IF EXISTS exchange_total`);
    await client.query(`ALTER TABLE returns DROP COLUMN IF EXISTS updated_at`);
  },
};
