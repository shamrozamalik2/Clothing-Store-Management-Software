'use strict';

module.exports = {
  apps: [
    {
      name: 'sas-garments-api',
      script: 'backend/src/server.js',
      cwd: '/var/www/sas-garments',

      // Cluster mode: one process per CPU core
      instances: 'max',
      exec_mode: 'cluster',

      // Env vars are loaded from the .env file in cwd
      env_production: {
        NODE_ENV: 'production',
      },

      // Logging
      log_date_format:  'YYYY-MM-DD HH:mm:ss',
      out_file:         '/var/log/sas-garments/api-out.log',
      error_file:       '/var/log/sas-garments/api-err.log',
      merge_logs:       true,
      log_type:         'json',

      // Restart policy
      autorestart:  true,
      watch:        false,
      max_memory_restart: '500M',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready:   true,
      listen_timeout: 10000,
    },
  ],
};
