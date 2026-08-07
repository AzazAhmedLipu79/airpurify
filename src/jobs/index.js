const initTelemetryAggregationJob = require('./telemetryAggregation.job');
const initOfflineDeviceDetectionJob = require('./offlineDeviceDetection.job');
const initTelemetryCleanupJob = require('./telemetryCleanup.job');
const logger = require('../config/logger');

function initAllJobs() {
  logger.info('Initializing Background Cron Workers Module...');
  initTelemetryAggregationJob();
  initOfflineDeviceDetectionJob();
  initTelemetryCleanupJob();
  logger.info('Background Cron Workers Module successfully initialized.');
}

module.exports = {
  initAllJobs,
};
