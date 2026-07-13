'use strict';

// Standalone migration runner — runs via: node backend/src/database/migrate.js
// This file is kept for legacy compatibility but the canonical migration entry
// point is backend/src/database/migrate.js which handles dotenv loading itself.

require('./database/migrate');
