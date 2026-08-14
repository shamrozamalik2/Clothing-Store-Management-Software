'use strict';
const Database = require('better-sqlite3');

// Must open WITHOUT readonly so SQLite can merge the WAL file
const db = new Database(process.argv[2]);

const tables = db.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name").all();

if (tables.length === 0) {
  console.log('Database is empty — no tables found.');
} else {
  console.log(`Found ${tables.length} tables:\n`);
  tables.forEach(t => {
    const count = db.prepare('SELECT COUNT(*) as c FROM "' + t.name + '"').get();
    const cols  = db.prepare('PRAGMA table_info("' + t.name + '")').all().map(c => c.name);
    console.log(`  ${t.name}  (${count.c} rows)`);
    console.log(`    columns: ${cols.join(', ')}\n`);
  });
}
db.close();
