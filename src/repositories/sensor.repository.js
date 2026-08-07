const db = require('../config/database');

class SensorRepository {
  async findById(id) {
    const sql = `SELECT * FROM sensors WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async findByDeviceIdAndType(deviceId, sensorType) {
    const sql = `SELECT * FROM sensors WHERE device_id = ? AND sensor_type = ? LIMIT 1`;
    const [rows] = await db.query(sql, [deviceId, sensorType]);
    return rows[0] || null;
  }

  async create(sensor) {
    const sql = `
      INSERT INTO sensors (
        device_id, sensor_type, model, serial_number, status, installed_at, sampling_interval_ms, calibration_data, configuration, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      sensor.device_id,
      sensor.sensor_type,
      sensor.model || null,
      sensor.serial_number || null,
      sensor.status || 'active',
      sensor.installed_at || new Date(),
      sensor.sampling_interval_ms || 5000,
      sensor.calibration_data ? JSON.stringify(sensor.calibration_data) : null,
      sensor.configuration ? JSON.stringify(sensor.configuration) : null,
      sensor.metadata ? JSON.stringify(sensor.metadata) : null,
    ];
    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async update(id, updates) {
    const fields = [];
    const params = [];

    const allowed = ['sensor_type', 'model', 'serial_number', 'status', 'sampling_interval_ms', 'calibration_data', 'configuration', 'metadata', 'removed_at'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(
          ['calibration_data', 'configuration', 'metadata'].includes(key) && updates[key] !== null
            ? JSON.stringify(updates[key])
            : updates[key]
        );
      }
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE sensors SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(sql, params);
    return result.affectedRows > 0;
  }

  async delete(id) {
    const sql = `DELETE FROM sensors WHERE id = ?`;
    const [result] = await db.query(sql, [id]);
    return result.affectedRows > 0;
  }

  async findByDeviceId(deviceId) {
    const sql = `SELECT * FROM sensors WHERE device_id = ? ORDER BY id ASC`;
    const [rows] = await db.query(sql, [deviceId]);
    return rows;
  }

  async findAll({ offset, limit, whereClause, sortClause }) {
    const countSql = `SELECT COUNT(*) as total FROM sensors ${whereClause.sql}`;
    const [countRows] = await db.query(countSql, whereClause.params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT * FROM sensors
      ${whereClause.sql}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataSql, [...whereClause.params, limit, offset]);

    return { total, rows };
  }
}

module.exports = new SensorRepository();
