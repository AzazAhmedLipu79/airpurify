USE air_quality;

-- Insert Seed Users (Password: Password123!)
INSERT INTO users (username, email, password_hash, role, status) VALUES
('admin_user', 'admin@airquality.io', '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W', 'admin', 'active'),
('operator_user', 'operator@airquality.io', '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W', 'operator', 'active'),
('viewer_user', 'viewer@airquality.io', '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W', 'viewer', 'active')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Insert Devices
INSERT INTO devices (device_uid, name, firmware_version, status, last_seen_at, location_name, latitude, longitude, metadata) VALUES
('DEV-NODE-001', 'Downtown Station A', 'v2.1.0', 'active', NOW(3), 'Central Park Plaza', 40.785091, -73.968285, '{"building": "North Pavilion", "zone": "A1"}'),
('DEV-NODE-002', 'Industrial Zone B', 'v2.1.0', 'active', NOW(3), 'Factory Complex 4', 40.748817, -73.985428, '{"building": "Warehouse 3", "zone": "B2"}'),
('DEV-NODE-003', 'Suburban Monitor C', 'v1.9.4', 'inactive', DATE_SUB(NOW(3), INTERVAL 2 HOUR), 'Green Valley Hills', 40.689247, -74.044502, '{"installation": "Pole-12"}')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert Sensors
INSERT INTO sensors (device_id, sensor_type, model, serial_number, status, installed_at, sampling_interval_ms, calibration_data, configuration) VALUES
(1, 'temperature_ds18b20', 'DS18B20', 'SN-DS-9821', 'active', NOW(3), 5000, '{"offset": -0.2, "unit": "C"}', '{"accuracy": "high"}'),
(1, 'humidity_dht11', 'DHT11', 'SN-DHT-1192', 'active', NOW(3), 5000, '{"multiplier": 1.01}', '{"mode": "continuous"}'),
(1, 'mq135', 'MQ-135 Air Quality', 'SN-MQ-4401', 'active', NOW(3), 5000, '{"r0": 10.5}', '{"target_gas": "CO2_NH3"}'),
(2, 'temperature_dht11', 'DHT11', 'SN-DHT-2041', 'active', NOW(3), 5000, '{"offset": 0.0}', '{}')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Insert ML Models
INSERT INTO ml_models (model_name, model_version, algorithm, target_metric, prediction_horizon_minutes, feature_version, status, mae, rmse, r2) VALUES
('PM25_XGBoost_Forecaster', 'v1.0.0', 'XGBoostRegressor', 'pm25', 30, 'v1', 'production', 1.82, 2.45, 0.92)
ON DUPLICATE KEY UPDATE status = VALUES(status);
