const deviceService = require('../services/device.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const createDevice = asyncWrapper(async (req, res) => {
  const device = await deviceService.registerDevice(req.body);
  return ApiResponse.created(res, 'Device registered successfully', device);
});

const getDevices = asyncWrapper(async (req, res) => {
  const { devices, pagination } = await deviceService.listDevices(req.query);
  return ApiResponse.success(res, 'Devices retrieved successfully', devices, 200, pagination);
});

const getDeviceById = asyncWrapper(async (req, res) => {
  const device = await deviceService.getDeviceById(req.params.id);
  return ApiResponse.success(res, 'Device details retrieved successfully', device);
});

const updateDevice = asyncWrapper(async (req, res) => {
  const device = await deviceService.updateDevice(req.params.id, req.body);
  return ApiResponse.success(res, 'Device updated successfully', device);
});

const deleteDevice = asyncWrapper(async (req, res) => {
  await deviceService.deleteDevice(req.params.id);
  return ApiResponse.success(res, 'Device deleted successfully');
});

const heartbeat = asyncWrapper(async (req, res) => {
  const result = await deviceService.updateHeartbeat(req.params.id);
  return ApiResponse.success(res, 'Device heartbeat recorded', result);
});

module.exports = {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  heartbeat,
};
