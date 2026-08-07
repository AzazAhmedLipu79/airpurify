const cron = require('node-cron');
const config = require('../config/env');
const aggregationService = require('../services/aggregation.service');
const logger = require('../config/logger');

function initTelemetryAggregationJob() {
  if (!config.jobs.enabled) return;

  logger.info(`Scheduling Telemetry Aggregation Job: ${config.jobs.aggregationCron}`);

  cron.schedule(config.jobs.aggregationCron, async () => {
    try {
      logger.debug('Executing Telemetry Aggregation Worker...');
      const now = new Date();
      const startTime = new Date(now.getTime() - 3 * 60 * 1000); // look back 3 minutes
      await aggregationService.aggregate1MinWindow(startTime, now);
    } catch (err) {
      logger.error('Error executing Telemetry Aggregation Job', { error: err.message });
    }
  });
}

module.exports = initTelemetryAggregationJob;
