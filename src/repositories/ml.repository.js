const db = require('../config/database');

class MLRepository {
  // ML Features
  async insertFeatures(features) {
    const sql = `
      INSERT INTO ml_features (
        device_id, feature_time,
        temperature_ds18b20, temperature_dht11, temperature_tmp36, humidity_dht11, mq135,
        temperature_ds18b20_lag_1, temperature_dht11_lag_1, humidity_lag_1, pm25_lag_1, pm10_lag_1,
        pm25_lag_2, pm25_lag_3,
        temperature_avg_5m, humidity_avg_5m, mq135_avg_5m,
        pm25_avg_5m, pm25_avg_15m, pm25_avg_30m,
        hour_of_day, day_of_week, target_pm25_30m, feature_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        temperature_ds18b20 = VALUES(temperature_ds18b20),
        humidity_dht11 = VALUES(humidity_dht11),
        mq135 = VALUES(mq135)
    `;

    const params = [
      features.device_id,
      features.feature_time,
      features.temperature_ds18b20 || null,
      features.temperature_dht11 || null,
      features.temperature_tmp36 || null,
      features.humidity_dht11 || null,
      features.mq135 || null,
      features.temperature_ds18b20_lag_1 || null,
      features.temperature_dht11_lag_1 || null,
      features.humidity_lag_1 || null,
      features.pm25_lag_1 || null,
      features.pm10_lag_1 || null,
      features.pm25_lag_2 || null,
      features.pm25_lag_3 || null,
      features.temperature_avg_5m || null,
      features.humidity_avg_5m || null,
      features.mq135_avg_5m || null,
      features.pm25_avg_5m || null,
      features.pm25_avg_15m || null,
      features.pm25_avg_30m || null,
      features.hour_of_day !== undefined ? features.hour_of_day : null,
      features.day_of_week !== undefined ? features.day_of_week : null,
      features.target_pm25_30m || null,
      features.feature_version || 'v1',
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async getFeaturesForDevice(deviceId, limit = 100) {
    const sql = `
      SELECT * FROM ml_features
      WHERE device_id = ?
      ORDER BY feature_time DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [deviceId, limit]);
    return rows;
  }

  // ML Models
  async registerModel(model) {
    const sql = `
      INSERT INTO ml_models (
        model_name, model_version, algorithm, target_metric, prediction_horizon_minutes,
        feature_version, training_started_at, training_finished_at, training_samples,
        mae, rmse, r2, model_path, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      model.model_name,
      model.model_version,
      model.algorithm,
      model.target_metric,
      model.prediction_horizon_minutes,
      model.feature_version || 'v1',
      model.training_started_at || null,
      model.training_finished_at || null,
      model.training_samples || null,
      model.mae || null,
      model.rmse || null,
      model.r2 || null,
      model.model_path || null,
      model.status || 'candidate',
      model.metadata ? JSON.stringify(model.metadata) : null,
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async findActiveProductionModel(targetMetric) {
    const sql = `
      SELECT * FROM ml_models
      WHERE target_metric = ? AND status = 'production'
      ORDER BY id DESC LIMIT 1
    `;
    const [rows] = await db.query(sql, [targetMetric]);
    return rows[0] || null;
  }

  async findAllModels() {
    const sql = `SELECT * FROM ml_models ORDER BY id DESC`;
    const [rows] = await db.query(sql);
    return rows;
  }

  // Predictions
  async savePrediction(prediction) {
    const sql = `
      INSERT INTO predictions (
        device_id, model_id, predicted_at, target_time, target_metric,
        predicted_value, actual_value, absolute_error, prediction_status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      prediction.device_id,
      prediction.model_id,
      prediction.predicted_at || new Date(),
      prediction.target_time,
      prediction.target_metric,
      prediction.predicted_value,
      prediction.actual_value || null,
      prediction.absolute_error || null,
      prediction.prediction_status || 'pending',
      prediction.metadata ? JSON.stringify(prediction.metadata) : null,
    ];

    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async getLatestPredictions(deviceId, limit = 10) {
    const sql = `
      SELECT p.*, m.model_name, m.algorithm
      FROM predictions p
      JOIN ml_models m ON p.model_id = m.id
      WHERE p.device_id = ?
      ORDER BY p.predicted_at DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [deviceId, limit]);
    return rows;
  }
}

module.exports = new MLRepository();
