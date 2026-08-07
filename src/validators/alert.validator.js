const { z } = require('zod');
const { ALERT_STATUS, ALERT_SEVERITY, ALERT_SOURCE } = require('../constants/status');

const updateAlertStatusSchema = z.object({
  status: z.enum([ALERT_STATUS.ACTIVE, ALERT_STATUS.ACKNOWLEDGED, ALERT_STATUS.RESOLVED]),
});

const queryAlertSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  device_id: z.string().optional(),
  status: z.enum([ALERT_STATUS.ACTIVE, ALERT_STATUS.ACKNOWLEDGED, ALERT_STATUS.RESOLVED]).optional(),
  severity: z.enum([ALERT_SEVERITY.INFO, ALERT_SEVERITY.WARNING, ALERT_SEVERITY.CRITICAL]).optional(),
  source: z.enum([ALERT_SOURCE.TELEMETRY, ALERT_SOURCE.PREDICTION, ALERT_SOURCE.SYSTEM, ALERT_SOURCE.SENSOR]).optional(),
  sort: z.string().optional(),
});

module.exports = {
  updateAlertStatusSchema,
  queryAlertSchema,
};
