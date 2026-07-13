'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { initDb, closeDb } = require('./config/database');
const { runMigrations }   = require('./database/migrate');

initDb();
runMigrations()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
