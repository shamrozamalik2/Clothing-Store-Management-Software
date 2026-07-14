'use strict';

module.exports = {
  version: 7,
  name: '007_return_items_sku',

  async up(client) {
    await client.query(`ALTER TABLE return_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100)`);
  },

  async down(client) {
    await client.query(`ALTER TABLE return_items DROP COLUMN IF EXISTS sku`);
  },
};
