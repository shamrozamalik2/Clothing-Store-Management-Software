'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const { env }           = require('./config/env');
const { connectMongo }  = require('./config/db.mongo');
const { startAutoBackupScheduler }   = require('./utils/backup.scheduler');
const { startAuditCleanupScheduler } = require('./utils/audit.cleanup');
const app = require('./app');

async function main() {
  // Ensure upload directory exists
  const uploadsDir = path.resolve(env.UPLOADS_DIR);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Connect MongoDB
  await connectMongo();

  // Start automatic daily backup scheduler
  startAutoBackupScheduler();

  // Prune audit logs older than 90 days (runs daily)
  startAuditCleanupScheduler();

  // Bind server
  const host   = env.IS_DEV ? '127.0.0.1' : '0.0.0.0';
  const server = app.listen(env.PORT, host, () => {
    console.log(`[Server] SAS Garments API on http://${host}:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
    if (process.send) process.send('ready');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${env.PORT} is already in use.`);
    } else {
      console.error('[Server] Fatal error:', err);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[Server] Startup failed:', err);
  process.exit(1);
});
