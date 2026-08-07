const { z } = require('zod');

const queryAnalyticsSchema = z.object({
  device_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  metric: z.string().optional(),
  interval: z.enum(['1min', 'hourly', 'daily', 'monthly', '1h', '6h', '12h', '24h', '7d', '30d']).optional().default('hourly'),
  limit: z.string().optional(),
});

module.exports = {
  queryAnalyticsSchema,
};
