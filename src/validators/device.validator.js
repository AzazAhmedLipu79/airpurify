const { z } = require('zod');
const { DEVICE_STATUS } = require('../constants/status');

const registerDeviceSchema = z.object({
  device_uid: z.string().min(3).max(100).trim(),
  name: z.string().max(150).optional(),
  firmware_version: z.string().max(50).optional(),
  status: z.enum([DEVICE_STATUS.ACTIVE, DEVICE_STATUS.INACTIVE, DEVICE_STATUS.MAINTENANCE, DEVICE_STATUS.RETIRED]).optional().default(DEVICE_STATUS.ACTIVE),
  location_name: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateDeviceSchema = registerDeviceSchema.partial().omit({ device_uid: true });

const queryDeviceSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum([DEVICE_STATUS.ACTIVE, DEVICE_STATUS.INACTIVE, DEVICE_STATUS.MAINTENANCE, DEVICE_STATUS.RETIRED]).optional(),
  sort: z.string().optional(),
});

module.exports = {
  registerDeviceSchema,
  updateDeviceSchema,
  queryDeviceSchema,
};
