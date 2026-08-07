const db = require('../config/database');

class TelemetryRepository {
  async insertBatch(telemetryItems) {
    if (!telemetryItems || telemetryItems.length === 0) return 0;

    const sql = `
      INSERT INTO telemetry (
        device_id, sensor_id, metric, value, unit, measured_at, received_at, quality, sequence_number, metadata
      ) VALUES ?
    `;

    const values = telemetryItems.map((item) => [
      item.device_id,
      item.sensor_id,
      item.metric,
      item.value,
      item.unit || null,
      item.measured_at,
      item.received_at || new Date(),
      item.quality || 'good',
      item.sequence_number || null,
      item.metadata ? JSON.stringify(item.metadata) : null,
    ]);

    const [result] = await db.query(sql, [values]);
    return result.affectedRows || telemetryItems.length;
  }

  async findLatestByDeviceId(deviceId) {
    const sql = `
      SELECT t.*, s.sensor_type
      FROM telemetry t
      JOIN sensors s ON t.sensor_id = s.id
      WHERE t.device_id = ?
      ORDER BY t.measured_at DESC
      LIMIT 10
    `;
    const [rows] = await db.query(sql, [deviceId]);
    return rows;
  }

  async findLatestAcrossAllDevices() {
    const sql = `
      SELECT t1.*, d.device_uid, d.name as device_name
      FROM telemetry t1
      INNER JOIN (
        SELECT device_id, MAX(measured_at) as max_measured
        FROM telemetry
        GROUP BY device_id
      ) t2 ON t1.device_id = t2.device_id AND t1.measured_at = t2.max_measured
      JOIN devices d ON t1.device_id = d.id
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  async findRawTelemetryForPeriod(startTime, endTime) {
    const sql = `
      SELECT t.*, s.sensor_type
      FROM telemetry t
      JOIN sensors s ON t.sensor_id = s.id
      WHERE t.measured_at >= ? AND t.measured_at < ?
      ORDER BY t.measured_at ASC
    `;
    const [rows] = await db.query(sql, [startTime, endTime]);
    return rows;
  }

  async findAll({ offset, limit, whereClause, sortClause }) {
    const countSql = `SELECT COUNT(*) as total FROM telemetry ${whereClause.sql}`;
    const [countRows] = await db.query(countSql, whereClause.params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT * FROM telemetry
      ${whereClause.sql}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataSql, [...whereClause.params, limit, offset]);

    return { total, rows };
  }
}

module.exports = new TelemetryRepository();
