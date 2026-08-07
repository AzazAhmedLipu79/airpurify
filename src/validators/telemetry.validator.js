const { z } = require('zod');
const { METRICS, VALID_UNITS } = require('../constants/metrics');

const singleTelemetryReadingSchema = z.object({
  device_id: z.number().int().positive().optional(),
  device_uid: z.string().optional(),
  sensor_id: z.number().int().positive().optional(),
  sensor_type: z.string().optional(),
  metric: z.string().min(1).max(50),
  value: z.number().nullable(),
  unit: z.string().max(30).optional(),
  measured_at: z.string().or(z.date()).optional(),
  quality: z.enum(['good', 'suspect', 'bad', 'missing', 'out_of_range', 'calibration']).optional().default('good'),
  sequence_number: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => data.device_id || data.device_uid, {
  message: 'Either device_id or device_uid must be provided',
  path: ['device_id'],
});

const batchTelemetrySchema = z.object({
  device_id: z.number().int().positive().optional(),
  device_uid: z.string().optional(),
  readings: z.array(z.object({
    sensor_id: z.number().int().positive().optional(),
    sensor_type: z.string().optional(),
    metric: z.string().min(1).max(50),
    value: z.number().nullable(),
    unit: z.string().max(30).optional(),
    measured_at: z.string().or(z.date()).optional(),
    quality: z.enum(['good', 'suspect', 'bad', 'missing', 'out_of_range', 'calibration']).optional().default('good'),
    sequence_number: z.number().int().nonnegative().optional(),
    metadata: z.record(z.any()).optional(),
  })).min(1),
}).refine((data) => data.device_id || data.device_uid, {
  message: 'Either device_id or device_uid must be provided',
  path: ['device_id'],
});

const telemetryIngestionSchema = z.union([singleTelemetryReadingSchema, batchTelemetrySchema]);

module.exports = {
  telemetryIngestionSchema,
  singleTelemetryReadingSchema,
  batchTelemetrySchema,
};
