const cron = require('node-cron');
const config = require('../config/env');
const deviceRepository = require('../repositories/device.repository');
const alertService = require('../services/alert.service');
const logger = require('../config/logger');

function initOfflineDeviceDetectionJob() {
  if (!config.jobs.enabled) return;

  logger.info(`Scheduling Offline Device Detection Job: ${config.jobs.offlineCheckCron}`);

  cron.schedule(config.jobs.offlineCheckCron, async () => {
    try {
      const offlineDevices = await deviceRepository.findOfflineDevices(5); // 5 min threshold
      for (const device of offlineDevices) {
        await deviceRepository.update(device.id, { status: 'inactive' });
        await alertService.triggerOfflineAlert(device);
        logger.warn(`Offline device detected: ${device.device_uid}`);
      }
    } catch (err) {
      logger.error('Error executing Offline Device Detection Job', { error: err.message });
    }
  });
}

module.exports = initOfflineDeviceDetectionJob;
