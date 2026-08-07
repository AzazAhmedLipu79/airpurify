const db = require('../config/database');

class AggregationRepository {
  async upsert1MinAggregate(aggregatedRecord) {
    const sql = `
      INSERT INTO telemetry_1min (
        device_id, time_bucket,
        temperature_ds18b20_avg, temperature_dht11_avg, temperature_tmp36_avg,
        humidity_dht11_avg, mq135_avg,
        temperature_ds18b20_min, temperature_ds18b20_max,
        humidity_dht11_min, humidity_dht11_max,
        mq135_min, mq135_max,
        sample_count, data_quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        temperature_ds18b20_avg = VALUES(temperature_ds18b20_avg),
        temperature_dht11_avg = VALUES(temperature_dht11_avg),
        temperature_tmp36_avg = VALUES(temperature_tmp36_avg),
        humidity_dht11_avg = VALUES(humidity_dht11_avg),
        mq135_avg = VALUES(mq135_avg),
        temperature_ds18b20_min = VALUES(temperature_ds18b20_min),
        temperature_ds18b20_max = VALUES(temperature_ds18b20_max),
        humidity_dht11_min = VALUES(humidity_dht11_min),
        humidity_dht11_max = VALUES(humidity_dht11_max),
        mq135_min = VALUES(mq135_min),
        mq135_max = VALUES(mq135_max),
        sample_count = VALUES(sample_count),
        data_quality = VALUES(data_quality)
    `;

    const params = [
      aggregatedRecord.device_id,
      aggregatedRecord.time_bucket,
      aggregatedRecord.temperature_ds18b20_avg || null,
      aggregatedRecord.temperature_dht11_avg || null,
      aggregatedRecord.temperature_tmp36_avg || null,
      aggregatedRecord.humidity_dht11_avg || null,
      aggregatedRecord.mq135_avg || null,
      aggregatedRecord.temperature_ds18b20_min || null,
      aggregatedRecord.temperature_ds18b20_max || null,
      aggregatedRecord.humidity_dht11_min || null,
      aggregatedRecord.humidity_dht11_max || null,
      aggregatedRecord.mq135_min || null,
      aggregatedRecord.mq135_max || null,
      aggregatedRecord.sample_count || 0,
      aggregatedRecord.data_quality || 'good',
    ];

    const [result] = await db.query(sql, params);
    return result.affectedRows > 0;
  }

  async get1MinData({ deviceId, startTime, endTime, offset = 0, limit = 100 }) {
    let sql = `SELECT * FROM telemetry_1min WHERE 1=1`;
    const params = [];

    if (deviceId) {
      sql += ` AND device_id = ?`;
      params.push(deviceId);
    }
    if (startTime) {
      sql += ` AND time_bucket >= ?`;
      params.push(startTime);
    }
    if (endTime) {
      sql += ` AND time_bucket <= ?`;
      params.push(endTime);
    }

    sql += ` ORDER BY time_bucket DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    return rows;
  }

  async getHourlyStats({ deviceId, startTime, endTime }) {
    let sql = `
      SELECT
        DATE_FORMAT(time_bucket, '%Y-%m-%d %H:00:00') as hourly_bucket,
        AVG(temperature_ds18b20_avg) as avg_temp_ds18b20,
        AVG(temperature_dht11_avg) as avg_temp_dht11,
        AVG(humidity_dht11_avg) as avg_humidity,
        AVG(mq135_avg) as avg_mq135,
        MIN(mq135_min) as min_mq135,
        MAX(mq135_max) as max_mq135,
        SUM(sample_count) as total_samples
      FROM telemetry_1min
      WHERE 1=1
    `;
    const params = [];

    if (deviceId) {
      sql += ` AND device_id = ?`;
      params.push(deviceId);
    }
    if (startTime) {
      sql += ` AND time_bucket >= ?`;
      params.push(startTime);
    }
    if (endTime) {
      sql += ` AND time_bucket <= ?`;
      params.push(endTime);
    }

    sql += ` GROUP BY hourly_bucket ORDER BY hourly_bucket ASC`;

    const [rows] = await db.query(sql, params);
    return rows;
  }

  async getDailyStats({ deviceId, startTime, endTime }) {
    let sql = `
      SELECT
        DATE_FORMAT(time_bucket, '%Y-%m-%d') as daily_bucket,
        AVG(temperature_ds18b20_avg) as avg_temp_ds18b20,
        AVG(humidity_dht11_avg) as avg_humidity,
        AVG(mq135_avg) as avg_mq135,
        MIN(mq135_min) as min_mq135,
        MAX(mq135_max) as max_mq135,
        SUM(sample_count) as total_samples
      FROM telemetry_1min
      WHERE 1=1
    `;
    const params = [];

    if (deviceId) {
      sql += ` AND device_id = ?`;
      params.push(deviceId);
    }
    if (startTime) {
      sql += ` AND time_bucket >= ?`;
      params.push(startTime);
    }
    if (endTime) {
      sql += ` AND time_bucket <= ?`;
      params.push(endTime);
    }

    sql += ` GROUP BY daily_bucket ORDER BY daily_bucket ASC`;

    const [rows] = await db.query(sql, params);
    return rows;
  }
}

module.exports = new AggregationRepository();
