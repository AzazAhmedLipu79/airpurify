const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 'Too many requests from this IP, please try again later', 429);
  },
});

const telemetryIngestionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // High throughput allowance for IoT edge devices
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 'Telemetry ingestion rate limit exceeded', 429);
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, 'Too many authentication attempts, please try again later', 429);
  },
});

module.exports = {
  globalRateLimiter,
  telemetryIngestionLimiter,
  authRateLimiter,
};
