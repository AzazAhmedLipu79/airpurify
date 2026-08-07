const cron = require('node-cron');
const config = require('../config/env');
const db = require('../config/database');
const logger = require('../config/logger');

function initTelemetryCleanupJob() {
  if (!config.jobs.enabled) return;

  logger.info(`Scheduling Telemetry Cleanup Job: ${config.jobs.cleanupCron}`);

  cron.schedule(config.jobs.cleanupCron, async () => {
    try {
      logger.info('Executing Retention Cleanup Job for raw telemetry older than 90 days...');
      const sql = `DELETE FROM telemetry WHERE measured_at < DATE_SUB(NOW(3), INTERVAL 90 DAY)`;
      const [result] = await db.query(sql);
      logger.info(`Telemetry retention cleanup completed. Rows purged: ${result.affectedRows || 0}`);
    } catch (err) {
      logger.error('Error executing Telemetry Cleanup Job', { error: err.message });
    }
  });
}

module.exports = initTelemetryCleanupJob;
