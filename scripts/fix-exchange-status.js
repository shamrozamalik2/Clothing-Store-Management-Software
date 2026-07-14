'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { initDb, query, closeDb } = require('../backend/src/config/database');

initDb();
query(`
  UPDATE sales
  SET status = 'exchanged', updated_at = NOW()
  WHERE id IN (
    SELECT DISTINCT s.id
    FROM sales s
    JOIN returns r ON r.sale_id = s.id
    WHERE r.type = 'exchange'
      AND s.status != 'exchanged'
  )
`)
.then(r => { console.log('Fixed rows:', r.rowCount); return closeDb(); })
.then(() => process.exit(0))
.catch(e => { console.error(e.message); process.exit(1); });
