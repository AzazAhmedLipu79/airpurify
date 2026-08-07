const sensorRepository = require('../repositories/sensor.repository');
const deviceRepository = require('../repositories/device.repository');
const { parsePagination, buildPaginationMeta } = require('../helpers/pagination');
const { buildWhereClause, buildSortClause } = require('../helpers/queryBuilder');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../config/logger');

class SensorService {
  async registerSensor(data) {
    const device = await deviceRepository.findById(data.device_id);
    if (!device) {
      throw new BadRequestError(`Cannot assign sensor to non-existent device ID ${data.device_id}`);
    }

    const sensorId = await sensorRepository.create(data);
    logger.info(`Sensor registered: ${data.sensor_type} on Device ID ${data.device_id} (ID: ${sensorId})`);
    return await sensorRepository.findById(sensorId);
  }

  async updateSensor(id, updates) {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor with ID ${id} not found`);
    }

    await sensorRepository.update(id, updates);
    return await sensorRepository.findById(id);
  }

  async deleteSensor(id) {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor with ID ${id} not found`);
    }

    await sensorRepository.delete(id);
    return true;
  }

  async setSensorStatus(id, status) {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor with ID ${id} not found`);
    }

    const updates = { status };
    if (status === 'removed') {
      updates.removed_at = new Date();
    }

    await sensorRepository.update(id, updates);
    return await sensorRepository.findById(id);
  }

  async getSensorById(id) {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor with ID ${id} not found`);
    }
    return sensor;
  }

  async listSensors(queryParams) {
    const { page, limit, offset } = parsePagination(queryParams);

    const allowedFields = {
      device_id: 'device_id',
      sensor_type: 'sensor_type',
      status: 'status',
    };

    const conditions = {
      device_id: queryParams.device_id ? parseInt(queryParams.device_id, 10) : undefined,
      sensor_type: queryParams.sensor_type,
      status: queryParams.status,
    };

    const whereClause = buildWhereClause(conditions, allowedFields);
    const sortClause = buildSortClause(queryParams.sort, {
      id: 'id',
      sensor_type: 'sensor_type',
      status: 'status',
      created_at: 'created_at',
    }, 'id DESC');

    const { total, rows } = await sensorRepository.findAll({ offset, limit, whereClause, sortClause });
    const pagination = buildPaginationMeta(total, page, limit);

    return { sensors: rows, pagination };
  }
}

module.exports = new SensorService();
