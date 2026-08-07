const db = require('../config/database');

class HealthRepository {
  async getDeviceTelemetryStats(deviceId, timeWindowHours = 24) {
    const sql = `
      SELECT
        COUNT(*) as total_packets,
        SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_packets,
        SUM(CASE WHEN quality IN ('suspect', 'bad', 'out_of_range') THEN 1 ELSE 0 END) as invalid_packets,
        MIN(measured_at) as first_packet_at,
        MAX(measured_at) as last_packet_at
      FROM telemetry
      WHERE device_id = ? AND measured_at >= DATE_SUB(NOW(3), INTERVAL ? HOUR)
    `;
    const [rows] = await db.query(sql, [deviceId, timeWindowHours]);
    return rows[0];
  }

  async getSequenceAnalysis(deviceId, timeWindowHours = 24) {
    const sql = `
      SELECT
        sequence_number
      FROM telemetry
      WHERE device_id = ? AND sequence_number IS NOT NULL AND measured_at >= DATE_SUB(NOW(3), INTERVAL ? HOUR)
      ORDER BY sequence_number ASC
    `;
    const [rows] = await db.query(sql, [deviceId, timeWindowHours]);
    
    if (rows.length < 2) {
      return { duplicates: 0, missingGaps: 0 };
    }

    let duplicates = 0;
    let missingGaps = 0;

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1].sequence_number;
      const curr = rows[i].sequence_number;

      if (curr === prev) {
        duplicates++;
      } else if (curr > prev + 1) {
        missingGaps += (curr - prev - 1);
      }
    }

    return { duplicates, missingGaps };
  }
}

module.exports = new HealthRepository();
