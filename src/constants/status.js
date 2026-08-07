const DEVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
};

const SENSOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  FAULTY: 'faulty',
  REMOVED: 'removed',
};

const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
};

const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

const ALERT_SOURCE = {
  TELEMETRY: 'telemetry',
  PREDICTION: 'prediction',
  SYSTEM: 'system',
  SENSOR: 'sensor',
};

module.exports = {
  DEVICE_STATUS,
  SENSOR_STATUS,
  ALERT_STATUS,
  ALERT_SEVERITY,
  ALERT_SOURCE,
};
