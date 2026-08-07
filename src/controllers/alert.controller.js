const alertService = require('../services/alert.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const getAlerts = asyncWrapper(async (req, res) => {
  const { alerts, pagination } = await alertService.listAlerts(req.query);
  return ApiResponse.success(res, 'Alerts retrieved successfully', alerts, 200, pagination);
});

const getTopAlerts = asyncWrapper(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const alerts = await alertService.getTopAlerts(limit);
  return ApiResponse.success(res, 'Top active alerts retrieved', alerts);
});

const updateAlertStatus = asyncWrapper(async (req, res) => {
  const alert = await alertService.updateAlertStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, `Alert status updated to ${req.body.status}`, alert);
});

module.exports = {
  getAlerts,
  getTopAlerts,
  updateAlertStatus,
};
