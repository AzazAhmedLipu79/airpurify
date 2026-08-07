const eventEmitter = require('./eventEmitter');
const alertService = require('../services/alert.service');
const { getSocketIO } = require('../sockets/socketHandler');
const logger = require('../config/logger');

function registerEventListeners() {
  eventEmitter.on('telemetry:received', async ({ device, readings }) => {
    try {
      // Evaluate telemetry reading alert rules asynchronously
      for (const reading of readings) {
        await alertService.evaluateReading(device, reading);
      }

      // Broadcast live telemetry reading to WebSockets subscribers
      const io = getSocketIO();
      if (io) {
        io.emit('telemetry:live', {
          device_id: device.id,
          device_uid: device.device_uid,
          readings,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      logger.error('Error handling telemetry:received event listener', { error: err.message });
    }
  });

  eventEmitter.on('alert:created', (alert) => {
    try {
      const io = getSocketIO();
      if (io) {
        io.emit('alert:new', alert);
      }
    } catch (err) {
      logger.error('Error broadcasting alert:created event', { error: err.message });
    }
  });

  logger.info('Asynchronous event listeners registered successfully.');
}

module.exports = registerEventListeners;
