const { z } = require('zod');
const { SENSOR_STATUS } = require('../constants/status');

const registerSensorSchema = z.object({
  device_id: z.number().int().positive(),
  sensor_type: z.string().min(2).max(50).trim(),
  model: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  status: z.enum([SENSOR_STATUS.ACTIVE, SENSOR_STATUS.INACTIVE, SENSOR_STATUS.FAULTY, SENSOR_STATUS.REMOVED]).optional().default(SENSOR_STATUS.ACTIVE),
  sampling_interval_ms: z.number().int().positive().optional().default(5000),
  calibration_data: z.record(z.any()).optional(),
  configuration: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateSensorSchema = registerSensorSchema.partial().omit({ device_id: true });

module.exports = {
  registerSensorSchema,
  updateSensorSchema,
};
