const telemetryRepository = require('../repositories/telemetry.repository');
const deviceRepository = require('../repositories/device.repository');
const sensorRepository = require('../repositories/sensor.repository');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const eventEmitter = require('../events/eventEmitter');
const logger = require('../config/logger');

class TelemetryService {
  async processTelemetry(payload) {
    const receivedAt = new Date();
    let deviceId = payload.device_id;
    let deviceUid = payload.device_uid;

    // Resolve Device
    let device = null;
    if (deviceId) {
      device = await deviceRepository.findById(deviceId);
    } else if (deviceUid) {
      device = await deviceRepository.findByUid(deviceUid);
    }

    if (!device) {
      throw new NotFoundError(`Device not found (id: ${deviceId}, uid: ${deviceUid})`);
    }

    deviceId = device.id;

    // Resolve Readings (Single vs Batch Payload)
    let readingsRaw = [];
    if (Array.isArray(payload.readings)) {
      readingsRaw = payload.readings;
    } else {
      readingsRaw = [payload];
    }

    // Process & sanitize readings
    const preparedItems = [];
    const deviceSensors = await sensorRepository.findByDeviceId(deviceId);
    const sensorMap = new Map();
    deviceSensors.forEach((s) => {
      sensorMap.set(s.id, s);
      sensorMap.set(s.sensor_type, s);
    });

    for (const item of readingsRaw) {
      let sensor = null;
      if (item.sensor_id && sensorMap.has(item.sensor_id)) {
        sensor = sensorMap.get(item.sensor_id);
      } else if (item.sensor_type && sensorMap.has(item.sensor_type)) {
        sensor = sensorMap.get(item.sensor_type);
      }

      // Auto-register sensor if absent on valid active device
      if (!sensor) {
        const defaultType = item.sensor_type || item.metric || 'generic_sensor';
        const newSensorId = await sensorRepository.create({
          device_id: deviceId,
          sensor_type: defaultType,
          status: 'active',
          sampling_interval_ms: 5000,
        });
        sensor = await sensorRepository.findById(newSensorId);
        sensorMap.set(sensor.id, sensor);
        sensorMap.set(sensor.sensor_type, sensor);
      }

      // Metric & Value range validation check
      const quality = this.evaluateReadingQuality(item.metric, item.value);

      const measuredAt = item.measured_at ? new Date(item.measured_at) : receivedAt;

      preparedItems.push({
        device_id: deviceId,
        sensor_id: sensor.id,
        metric: item.metric,
        value: item.value,
        unit: item.unit || this.getDefaultUnit(item.metric),
        measured_at: measuredAt,
        received_at: receivedAt,
        quality: item.quality || quality,
        sequence_number: item.sequence_number || null,
        metadata: item.metadata || null,
      });
    }

    // High throughput DB Batch Insertion
    const insertedCount = await telemetryRepository.insertBatch(preparedItems);

    // Update Device Heartbeat asynchronously without blocking
    deviceRepository.updateHeartbeat(deviceId, receivedAt).catch((err) => {
      logger.error(`Error updating heartbeat for device ${deviceId}`, { error: err.message });
    });

    // Emit event for real-time WebSocket broadcast & background notification
    eventEmitter.emit('telemetry:received', {
      device,
      readings: preparedItems,
    });

    return {
      accepted: insertedCount,
      device_id: deviceId,
      device_uid: device.device_uid,
      received_at: receivedAt,
    };
  }

  evaluateReadingQuality(metric, value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'missing';
    }

    // Range checks for common IoT air quality metrics
    if (metric.includes('temp') && (value < -50 || value > 120)) {
      return 'out_of_range';
    }
    if (metric.includes('humidity') && (value < 0 || value > 100)) {
      return 'out_of_range';
    }
    if (metric.includes('mq135') && (value < 0 || value > 10000)) {
      return 'out_of_range';
    }

    return 'good';
  }

  getDefaultUnit(metric) {
    if (metric.includes('temp')) return 'C';
    if (metric.includes('humidity')) return '%';
    if (metric.includes('mq135') || metric.includes('co2')) return 'ppm';
    if (metric.includes('pm25') || metric.includes('pm10')) return 'ug/m3';
    return '';
  }
}

module.exports = new TelemetryService();
