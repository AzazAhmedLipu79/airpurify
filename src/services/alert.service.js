const alertRepository = require('../repositories/alert.repository');
const deviceRepository = require('../repositories/device.repository');
const { parsePagination, buildPaginationMeta } = require('../helpers/pagination');
const { buildWhereClause, buildSortClause } = require('../helpers/queryBuilder');
const { NotFoundError } = require('../utils/errors');
const eventEmitter = require('../events/eventEmitter');
const logger = require('../config/logger');

class AlertService {
  async evaluateReading(device, reading) {
    const { metric, value } = reading;
    if (value === null || value === undefined) return;

    let alertType = null;
    let severity = 'warning';
    let threshold = 0;
    let message = '';

    if (metric.includes('temp') && value > 45) {
      alertType = 'high_temperature';
      severity = value > 60 ? 'critical' : 'warning';
      threshold = 45;
      message = `High temperature detected: ${value}°C (Threshold: ${threshold}°C) on device ${device.device_uid}`;
    } else if (metric.includes('humidity') && value > 90) {
      alertType = 'high_humidity';
      severity = 'warning';
      threshold = 90;
      message = `High humidity detected: ${value}% (Threshold: ${threshold}%) on device ${device.device_uid}`;
    } else if ((metric.includes('mq135') || metric.includes('gas') || metric.includes('co2')) && value > 500) {
      alertType = 'high_gas';
      severity = value > 1000 ? 'critical' : 'warning';
      threshold = 500;
      message = `High gas concentration detected: ${value} ppm (Threshold: ${threshold} ppm) on device ${device.device_uid}`;
    }

    if (alertType) {
      // Prevent spamming active duplicate alerts
      const existingAlert = await alertRepository.findActiveByDeviceAndType(device.id, alertType);
      if (!existingAlert) {
        const alertId = await alertRepository.create({
          device_id: device.id,
          alert_type: alertType,
          severity,
          metric,
          actual_value: value,
          threshold_value: threshold,
          message,
          source: 'telemetry',
          status: 'active',
        });

        logger.warn(`Alert raised: [${severity.toUpperCase()}] ${message}`);
        const alert = await alertRepository.findById(alertId);
        eventEmitter.emit('alert:created', alert);
      }
    }
  }

  async triggerOfflineAlert(device) {
    const existing = await alertRepository.findActiveByDeviceAndType(device.id, 'device_offline');
    if (!existing) {
      const alertId = await alertRepository.create({
        device_id: device.id,
        alert_type: 'device_offline',
        severity: 'critical',
        metric: 'heartbeat',
        actual_value: null,
        threshold_value: null,
        message: `Device ${device.device_uid} (${device.name || 'Unnamed'}) has gone offline`,
        source: 'system',
        status: 'active',
      });
      const alert = await alertRepository.findById(alertId);
      eventEmitter.emit('alert:created', alert);
    }
  }

  async updateAlertStatus(id, status) {
    const alert = await alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundError(`Alert with ID ${id} not found`);
    }

    const resolvedAt = status === 'resolved' ? new Date() : null;
    await alertRepository.updateStatus(id, status, resolvedAt);
    return await alertRepository.findById(id);
  }

  async listAlerts(queryParams) {
    const { page, limit, offset } = parsePagination(queryParams);

    const allowedFields = {
      device_id: 'a.device_id',
      status: 'a.status',
      severity: 'a.severity',
      source: 'a.source',
    };

    const conditions = {
      device_id: queryParams.device_id ? parseInt(queryParams.device_id, 10) : undefined,
      status: queryParams.status,
      severity: queryParams.severity,
      source: queryParams.source,
    };

    const whereClause = buildWhereClause(conditions, allowedFields);
    const sortClause = buildSortClause(queryParams.sort, {
      id: 'a.id',
      triggered_at: 'a.triggered_at',
      severity: 'a.severity',
      status: 'a.status',
    }, 'a.triggered_at DESC');

    const { total, rows } = await alertRepository.findAll({ offset, limit, whereClause, sortClause });
    const pagination = buildPaginationMeta(total, page, limit);

    return { alerts: rows, pagination };
  }

  async getTopAlerts(limit = 10) {
    return await alertRepository.findTopActiveAlerts(limit);
  }
}

module.exports = new AlertService();
