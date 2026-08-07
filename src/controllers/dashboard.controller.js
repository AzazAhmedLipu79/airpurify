const dashboardService = require('../services/dashboard.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const getDashboardOverview = asyncWrapper(async (req, res) => {
  const overview = await dashboardService.getDashboardOverview();
  return ApiResponse.success(res, 'Dashboard overview retrieved successfully', overview);
});

module.exports = {
  getDashboardOverview,
};
