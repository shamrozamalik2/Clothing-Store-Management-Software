'use strict';

module.exports = {
  version: 11,
  name: '011_company_unique_constraints',

  async up(client) {
    // ── Categories ────────────────────────────────────────────────────────────
    // Re-point products from duplicate categories to the surviving (lowest id) one, then deduplicate.
    await client.query(`
      UPDATE products p
         SET category_id = survive.id
        FROM categories dup
        JOIN categories survive
          ON  survive.company_id = dup.company_id
          AND survive.name       = dup.name
          AND survive.id < dup.id
       WHERE p.category_id = dup.id
    `);
    await client.query(`
      DELETE FROM categories a
            USING categories b
            WHERE a.id > b.id
              AND a.company_id = b.company_id
              AND a.name       = b.name
    `);
    await client.query(`
      ALTER TABLE categories
        ADD CONSTRAINT categories_company_name_key UNIQUE (company_id, name)
    `);

    // ── Brands ────────────────────────────────────────────────────────────────
    await client.query(`
      UPDATE products p
         SET brand_id = survive.id
        FROM brands dup
        JOIN brands survive
          ON  survive.company_id = dup.company_id
          AND survive.name       = dup.name
          AND survive.id < dup.id
       WHERE p.brand_id = dup.id
    `);
    await client.query(`
      DELETE FROM brands a
            USING brands b
            WHERE a.id > b.id
              AND a.company_id = b.company_id
              AND a.name       = b.name
    `);
    await client.query(`
      ALTER TABLE brands
        ADD CONSTRAINT brands_company_name_key UNIQUE (company_id, name)
    `);

    // ── Suppliers ─────────────────────────────────────────────────────────────
    await client.query(`
      UPDATE purchases p
         SET supplier_id = survive.id
        FROM suppliers dup
        JOIN suppliers survive
          ON  survive.company_id = dup.company_id
          AND survive.name       = dup.name
          AND survive.id < dup.id
       WHERE p.supplier_id = dup.id
    `);
    await client.query(`
      DELETE FROM suppliers a
            USING suppliers b
            WHERE a.id > b.id
              AND a.company_id = b.company_id
              AND a.name       = b.name
    `);
    await client.query(`
      ALTER TABLE suppliers
        ADD CONSTRAINT suppliers_company_name_key UNIQUE (company_id, name)
    `);
  },

  async down(client) {
    await client.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_company_name_key`);
    await client.query(`ALTER TABLE brands     DROP CONSTRAINT IF EXISTS brands_company_name_key`);
    await client.query(`ALTER TABLE suppliers  DROP CONSTRAINT IF EXISTS suppliers_company_name_key`);
  },
};
