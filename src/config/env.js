const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    name: process.env.DB_NAME || 'air_quality',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-air-quality-iot-platform-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-for-air-quality-iot-platform-2026',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  jobs: {
    enabled: process.env.ENABLE_JOBS !== 'false',
    aggregationCron: process.env.AGGREGATION_CRON || '*/1 * * * *',
    offlineCheckCron: process.env.OFFLINE_CHECK_CRON || '*/2 * * * *',
    alertEvaluationCron: process.env.ALERT_EVALUATION_CRON || '*/1 * * * *',
    cleanupCron: process.env.CLEANUP_CRON || '0 2 * * *',
  },
};

module.exports = config;
