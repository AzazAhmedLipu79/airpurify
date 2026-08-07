const mlService = require('../services/ml.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const storeFeatures = asyncWrapper(async (req, res) => {
  const result = await mlService.storeMLFeatures(req.body);
  return ApiResponse.created(res, 'ML features stored successfully', result);
});

const getFeatures = asyncWrapper(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
  const features = await mlService.getFeaturesForDevice(req.params.deviceId, limit);
  return ApiResponse.success(res, 'ML features retrieved', features);
});

const registerModel = asyncWrapper(async (req, res) => {
  const model = await mlService.registerModel(req.body);
  return ApiResponse.created(res, 'ML model registered', model);
});

const getModels = asyncWrapper(async (req, res) => {
  const models = await mlService.getAllModels();
  return ApiResponse.success(res, 'ML models retrieved', models);
});

const savePrediction = asyncWrapper(async (req, res) => {
  const prediction = await mlService.recordPrediction(req.body);
  return ApiResponse.created(res, 'Prediction recorded', prediction);
});

const getPredictions = asyncWrapper(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const predictions = await mlService.getLatestPredictions(req.params.deviceId, limit);
  return ApiResponse.success(res, 'Predictions retrieved', predictions);
});

module.exports = {
  storeFeatures,
  getFeatures,
  registerModel,
  getModels,
  savePrediction,
  getPredictions,
};
