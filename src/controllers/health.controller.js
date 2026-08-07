const healthService = require('../services/health.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const getDeviceHealth = asyncWrapper(async (req, res) => {
  const windowHours = req.query.window ? parseInt(req.query.window, 10) : 24;
  const health = await healthService.getDeviceHealth(req.params.deviceId, windowHours);
  return ApiResponse.success(res, 'Device health analysis retrieved', health);
});

const getSystemStatus = asyncWrapper(async (req, res) => {
  const status = await healthService.getSystemHealthStatus();
  return ApiResponse.success(res, 'System status retrieved', status);
});

const healthCheck = asyncWrapper(async (req, res) => {
  return ApiResponse.success(res, 'API service healthy and operational', {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

module.exports = {
  getDeviceHealth,
  getSystemStatus,
  healthCheck,
};
