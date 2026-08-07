const deviceRepository = require('../repositories/device.repository');
const sensorRepository = require('../repositories/sensor.repository');
const { parsePagination, buildPaginationMeta } = require('../helpers/pagination');
const { buildWhereClause, buildSortClause } = require('../helpers/queryBuilder');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../config/logger');

class DeviceService {
  async registerDevice(data) {
    const existing = await deviceRepository.findByUid(data.device_uid);
    if (existing) {
      throw new ConflictError(`Device with UID '${data.device_uid}' already registered`);
    }

    const deviceId = await deviceRepository.create(data);
    logger.info(`Device registered: ${data.device_uid} (ID: ${deviceId})`);
    return await deviceRepository.findById(deviceId);
  }

  async updateDevice(id, updates) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${id} not found`);
    }

    await deviceRepository.update(id, updates);
    return await deviceRepository.findById(id);
  }

  async deleteDevice(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${id} not found`);
    }

    await deviceRepository.delete(id);
    logger.info(`Device deleted: ${device.device_uid} (ID: ${id})`);
    return true;
  }

  async getDeviceById(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${id} not found`);
    }

    const sensors = await sensorRepository.findByDeviceId(id);
    return { ...device, sensors };
  }

  async getDeviceByUid(deviceUid) {
    const device = await deviceRepository.findByUid(deviceUid);
    if (!device) {
      throw new NotFoundError(`Device with UID '${deviceUid}' not found`);
    }
    const sensors = await sensorRepository.findByDeviceId(device.id);
    return { ...device, sensors };
  }

  async listDevices(queryParams) {
    const { page, limit, offset } = parsePagination(queryParams);

    const allowedFields = {
      status: 'status',
      search: 'name',
    };

    const conditions = {
      status: queryParams.status,
    };

    if (queryParams.search) {
      conditions.search = { like: queryParams.search };
    }

    const whereClause = buildWhereClause(conditions, allowedFields);
    const sortClause = buildSortClause(queryParams.sort, {
      id: 'id',
      name: 'name',
      last_seen_at: 'last_seen_at',
      status: 'status',
      created_at: 'created_at',
    }, 'id DESC');

    const { total, rows } = await deviceRepository.findAll({ offset, limit, whereClause, sortClause });
    const pagination = buildPaginationMeta(total, page, limit);

    return { devices: rows, pagination };
  }

  async updateHeartbeat(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new NotFoundError(`Device with ID ${id} not found`);
    }

    const timestamp = new Date();
    await deviceRepository.updateHeartbeat(id, timestamp);
    return { device_id: id, last_seen_at: timestamp, status: 'active' };
  }
}

module.exports = new DeviceService();
