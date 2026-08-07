const sensorService = require('../services/sensor.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const createSensor = asyncWrapper(async (req, res) => {
  const sensor = await sensorService.registerSensor(req.body);
  return ApiResponse.created(res, 'Sensor registered successfully', sensor);
});

const getSensors = asyncWrapper(async (req, res) => {
  const { sensors, pagination } = await sensorService.listSensors(req.query);
  return ApiResponse.success(res, 'Sensors retrieved successfully', sensors, 200, pagination);
});

const getSensorById = asyncWrapper(async (req, res) => {
  const sensor = await sensorService.getSensorById(req.params.id);
  return ApiResponse.success(res, 'Sensor retrieved successfully', sensor);
});

const updateSensor = asyncWrapper(async (req, res) => {
  const sensor = await sensorService.updateSensor(req.params.id, req.body);
  return ApiResponse.success(res, 'Sensor updated successfully', sensor);
});

const setSensorStatus = asyncWrapper(async (req, res) => {
  const sensor = await sensorService.setSensorStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, `Sensor status set to ${req.body.status}`, sensor);
});

const deleteSensor = asyncWrapper(async (req, res) => {
  await sensorService.deleteSensor(req.params.id);
  return ApiResponse.success(res, 'Sensor deleted successfully');
});

module.exports = {
  createSensor,
  getSensors,
  getSensorById,
  updateSensor,
  setSensorStatus,
  deleteSensor,
};
