const telemetryService = require('../services/telemetry.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const ingestTelemetry = asyncWrapper(async (req, res) => {
  const result = await telemetryService.processTelemetry(req.body);
  return ApiResponse.success(res, 'Telemetry ingestion accepted', result, 202);
});

module.exports = {
  ingestTelemetry,
};
