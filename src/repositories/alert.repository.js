const db = require('../config/database');

class AlertRepository {
  async create(alert) {
    const sql = `
      INSERT INTO alerts (
        device_id, alert_type, severity, metric, actual_value, threshold_value, message, source, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      alert.device_id,
      alert.alert_type,
      alert.severity,
      alert.metric || null,
      alert.actual_value !== undefined ? alert.actual_value : null,
      alert.threshold_value !== undefined ? alert.threshold_value : null,
      alert.message,
      alert.source || 'telemetry',
      alert.status || 'active',
      alert.metadata ? JSON.stringify(alert.metadata) : null,
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async findById(id) {
    const sql = `SELECT * FROM alerts WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async updateStatus(id, status, resolvedAt = null) {
    let sql = `UPDATE alerts SET status = ?`;
    const params = [status];

    if (status === 'resolved') {
      sql += `, resolved_at = ?`;
      params.push(resolvedAt || new Date());
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    const [result] = await db.query(sql, params);
    return result.affectedRows > 0;
  }

  async findActiveByDeviceAndType(deviceId, alertType) {
    const sql = `
      SELECT * FROM alerts
      WHERE device_id = ? AND alert_type = ? AND status = 'active'
      ORDER BY id DESC LIMIT 1
    `;
    const [rows] = await db.query(sql, [deviceId, alertType]);
    return rows[0] || null;
  }

  async findTopActiveAlerts(limit = 10) {
    const sql = `
      SELECT a.*, d.device_uid, d.name as device_name
      FROM alerts a
      JOIN devices d ON a.device_id = d.id
      WHERE a.status = 'active'
      ORDER BY
        CASE a.severity
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
          ELSE 4
        END,
        a.triggered_at DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [limit]);
    return rows;
  }

  async findAll({ offset, limit, whereClause, sortClause }) {
    const countSql = `SELECT COUNT(*) as total FROM alerts a ${whereClause.sql}`;
    const [countRows] = await db.query(countSql, whereClause.params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT a.*, d.device_uid, d.name as device_name
      FROM alerts a
      JOIN devices d ON a.device_id = d.id
      ${whereClause.sql}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataSql, [...whereClause.params, limit, offset]);

    return { total, rows };
  }
}

module.exports = new AlertRepository();
