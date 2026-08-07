const mlRepository = require('../repositories/ml.repository');
const deviceRepository = require('../repositories/device.repository');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../config/logger');

class MLService {
  async storeMLFeatures(featureData) {
    const device = await deviceRepository.findById(featureData.device_id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${featureData.device_id} not found`);
    }

    const featureId = await mlRepository.insertFeatures(featureData);
    logger.debug(`ML Features saved for device ${featureData.device_id} (Feature ID: ${featureId})`);
    return { feature_id: featureId, device_id: featureData.device_id, feature_time: featureData.feature_time };
  }

  async getFeaturesForDevice(deviceId, limit = 100) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError(`Device with ID ${deviceId} not found`);
    }
    return await mlRepository.getFeaturesForDevice(deviceId, parseInt(limit, 10));
  }

  async registerModel(modelData) {
    const modelId = await mlRepository.registerModel(modelData);
    logger.info(`ML Model registered: ${modelData.model_name} (${modelData.model_version}) - ID: ${modelId}`);
    return { model_id: modelId, ...modelData };
  }

  async getAllModels() {
    return await mlRepository.findAllModels();
  }

  async recordPrediction(predictionData) {
    const device = await deviceRepository.findById(predictionData.device_id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${predictionData.device_id} not found`);
    }

    const predictionId = await mlRepository.savePrediction(predictionData);
    logger.info(`ML Prediction saved for device ${predictionData.device_id}: ${predictionData.target_metric} = ${predictionData.predicted_value}`);
    return { prediction_id: predictionId, ...predictionData };
  }

  async getLatestPredictions(deviceId, limit = 10) {
    return await mlRepository.getLatestPredictions(deviceId, parseInt(limit, 10));
  }
}

module.exports = new MLService();
