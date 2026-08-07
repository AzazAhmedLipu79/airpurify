const db = require('../config/database');

class DeviceRepository {
  async findById(id) {
    const sql = `SELECT * FROM devices WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async findByUid(deviceUid) {
    const sql = `SELECT * FROM devices WHERE device_uid = ? LIMIT 1`;
    const [rows] = await db.query(sql, [deviceUid]);
    return rows[0] || null;
  }

  async create(device) {
    const sql = `
      INSERT INTO devices (
        device_uid, name, firmware_version, status, last_seen_at, location_name, latitude, longitude, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      device.device_uid,
      device.name || null,
      device.firmware_version || null,
      device.status || 'active',
      device.last_seen_at || null,
      device.location_name || null,
      device.latitude || null,
      device.longitude || null,
      device.metadata ? JSON.stringify(device.metadata) : null,
    ];
    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async update(id, updates) {
    const fields = [];
    const params = [];

    const allowed = ['name', 'firmware_version', 'status', 'location_name', 'latitude', 'longitude', 'metadata', 'last_seen_at'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === 'metadata' && updates[key] !== null ? JSON.stringify(updates[key]) : updates[key]);
      }
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE devices SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(sql, params);
    return result.affectedRows > 0;
  }

  async updateHeartbeat(id, timestamp = new Date()) {
    const sql = `UPDATE devices SET last_seen_at = ?, status = 'active' WHERE id = ?`;
    await db.query(sql, [timestamp, id]);
  }

  async delete(id) {
    const sql = `DELETE FROM devices WHERE id = ?`;
    const [result] = await db.query(sql, [id]);
    return result.affectedRows > 0;
  }

  async findAll({ offset, limit, whereClause, sortClause }) {
    const countSql = `SELECT COUNT(*) as total FROM devices ${whereClause.sql}`;
    const [countRows] = await db.query(countSql, whereClause.params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT * FROM devices
      ${whereClause.sql}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataSql, [...whereClause.params, limit, offset]);

    return { total, rows };
  }

  async getDeviceCounts() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count,
        SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) as retired_count
      FROM devices
    `;
    const [rows] = await db.query(sql);
    return rows[0];
  }

  async findOfflineDevices(thresholdMinutes = 5) {
    const sql = `
      SELECT * FROM devices
      WHERE status = 'active' AND (
        last_seen_at IS NULL OR last_seen_at < DATE_SUB(NOW(3), INTERVAL ? MINUTE)
      )
    `;
    const [rows] = await db.query(sql, [thresholdMinutes]);
    return rows;
  }
}

module.exports = new DeviceRepository();
