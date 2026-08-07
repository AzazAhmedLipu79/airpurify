CREATE DATABASE IF NOT EXISTS air_quality
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE air_quality;

-- =========================================================
-- 0. USERS & AUTHENTICATION
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator', 'viewer') NOT NULL DEFAULT 'viewer',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_tokens_user (user_id),
    INDEX idx_tokens_hash (token_hash)
) ENGINE=InnoDB;

-- =========================================================
-- 1. DEVICES
-- =========================================================

CREATE TABLE IF NOT EXISTS devices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_uid VARCHAR(100) NOT NULL,
    name VARCHAR(150) NULL,

    firmware_version VARCHAR(50) NULL,

    status ENUM('active', 'inactive', 'maintenance', 'retired')
        NOT NULL DEFAULT 'active',

    last_seen_at DATETIME(3) NULL,

    location_name VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,

    metadata JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_devices_uid (device_uid),
    INDEX idx_devices_status (status),
    INDEX idx_devices_last_seen (last_seen_at)
) ENGINE=InnoDB;


-- =========================================================
-- 2. SENSORS
-- =========================================================

CREATE TABLE IF NOT EXISTS sensors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,

    sensor_type VARCHAR(50) NOT NULL,
    model VARCHAR(100) NULL,
    serial_number VARCHAR(100) NULL,

    status ENUM('active', 'inactive', 'faulty', 'removed')
        NOT NULL DEFAULT 'active',

    installed_at DATETIME(3) NULL,
    removed_at DATETIME(3) NULL,

    sampling_interval_ms INT UNSIGNED NULL,

    calibration_data JSON NULL,
    configuration JSON NULL,
    metadata JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_sensors_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    INDEX idx_sensors_device (device_id),
    INDEX idx_sensors_type (sensor_type),
    INDEX idx_sensors_status (status)
) ENGINE=InnoDB;


-- =========================================================
-- 3. RAW TELEMETRY
-- =========================================================

CREATE TABLE IF NOT EXISTS telemetry (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,
    sensor_id BIGINT UNSIGNED NOT NULL,

    metric VARCHAR(50) NOT NULL,

    value DOUBLE NULL,

    unit VARCHAR(30) NULL,

    measured_at DATETIME(3) NOT NULL,
    received_at DATETIME(3) NOT NULL,

    quality ENUM(
        'good',
        'suspect',
        'bad',
        'missing',
        'out_of_range',
        'calibration'
    ) NOT NULL DEFAULT 'good',

    sequence_number BIGINT UNSIGNED NULL,

    metadata JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_telemetry_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_telemetry_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES sensors(id)
        ON DELETE RESTRICT,

    INDEX idx_telemetry_device_time (
        device_id,
        measured_at
    ),

    INDEX idx_telemetry_sensor_time (
        sensor_id,
        measured_at
    ),

    INDEX idx_telemetry_metric_time (
        metric,
        measured_at
    ),

    INDEX idx_telemetry_received (
        received_at
    ),

    INDEX idx_telemetry_sequence (
        device_id,
        sequence_number
    )
) ENGINE=InnoDB;


-- =========================================================
-- 4. SYNCHRONIZED / AGGREGATED DATA
-- =========================================================

CREATE TABLE IF NOT EXISTS telemetry_1min (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,

    time_bucket DATETIME NOT NULL,

    temperature_ds18b20_avg DOUBLE NULL,
    temperature_dht11_avg DOUBLE NULL,
    temperature_tmp36_avg DOUBLE NULL,

    humidity_dht11_avg DOUBLE NULL,

    mq135_avg DOUBLE NULL,

    temperature_ds18b20_min DOUBLE NULL,
    temperature_ds18b20_max DOUBLE NULL,

    humidity_dht11_min DOUBLE NULL,
    humidity_dht11_max DOUBLE NULL,

    mq135_min DOUBLE NULL,
    mq135_max DOUBLE NULL,

    sample_count INT UNSIGNED NOT NULL DEFAULT 0,

    data_quality ENUM(
        'good',
        'partial',
        'poor'
    ) NOT NULL DEFAULT 'good',

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_telemetry_1min_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_telemetry_1min (
        device_id,
        time_bucket
    ),

    INDEX idx_telemetry_1min_time (
        device_id,
        time_bucket
    )
) ENGINE=InnoDB;


-- =========================================================
-- 5. ML FEATURES
-- =========================================================

CREATE TABLE IF NOT EXISTS ml_features (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,

    feature_time DATETIME NOT NULL,

    temperature_ds18b20 DOUBLE NULL,
    temperature_dht11 DOUBLE NULL,
    temperature_tmp36 DOUBLE NULL,
    humidity_dht11 DOUBLE NULL,
    mq135 DOUBLE NULL,

    temperature_ds18b20_lag_1 DOUBLE NULL,
    temperature_dht11_lag_1 DOUBLE NULL,
    humidity_lag_1 DOUBLE NULL,
    pm25_lag_1 DOUBLE NULL,
    pm10_lag_1 DOUBLE NULL,

    pm25_lag_2 DOUBLE NULL,
    pm25_lag_3 DOUBLE NULL,

    temperature_avg_5m DOUBLE NULL,
    humidity_avg_5m DOUBLE NULL,
    mq135_avg_5m DOUBLE NULL,

    pm25_avg_5m DOUBLE NULL,
    pm25_avg_15m DOUBLE NULL,
    pm25_avg_30m DOUBLE NULL,

    hour_of_day TINYINT UNSIGNED NULL,
    day_of_week TINYINT UNSIGNED NULL,

    target_pm25_30m DOUBLE NULL,

    feature_version VARCHAR(50) NOT NULL DEFAULT 'v1',

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_ml_features_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_ml_features (
        device_id,
        feature_time,
        feature_version
    ),

    INDEX idx_ml_features_time (
        device_id,
        feature_time
    )
) ENGINE=InnoDB;


-- =========================================================
-- 6. ML MODELS
-- =========================================================

CREATE TABLE IF NOT EXISTS ml_models (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,

    algorithm VARCHAR(50) NOT NULL,

    target_metric VARCHAR(50) NOT NULL,
    prediction_horizon_minutes INT UNSIGNED NOT NULL,

    feature_version VARCHAR(50) NULL,

    training_started_at DATETIME(3) NULL,
    training_finished_at DATETIME(3) NULL,

    training_data_start DATETIME(3) NULL,
    training_data_end DATETIME(3) NULL,

    training_samples BIGINT UNSIGNED NULL,

    mae DOUBLE NULL,
    rmse DOUBLE NULL,
    r2 DOUBLE NULL,

    model_path VARCHAR(500) NULL,

    status ENUM(
        'candidate',
        'testing',
        'production',
        'retired',
        'failed'
    ) NOT NULL DEFAULT 'candidate',

    metadata JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_model_version (
        model_name,
        model_version
    ),

    INDEX idx_models_status (status),
    INDEX idx_models_target (target_metric)
) ENGINE=InnoDB;


-- =========================================================
-- 7. PREDICTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS predictions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,

    predicted_at DATETIME(3) NOT NULL,
    target_time DATETIME(3) NOT NULL,

    target_metric VARCHAR(50) NOT NULL,

    predicted_value DOUBLE NOT NULL,

    actual_value DOUBLE NULL,
    absolute_error DOUBLE NULL,

    prediction_status ENUM(
        'pending',
        'evaluated',
        'expired'
    ) NOT NULL DEFAULT 'pending',

    metadata JSON NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_predictions_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_predictions_model
        FOREIGN KEY (model_id)
        REFERENCES ml_models(id)
        ON DELETE RESTRICT,

    INDEX idx_predictions_device_target (
        device_id,
        target_time
    ),

    INDEX idx_predictions_model (
        model_id,
        predicted_at
    ),

    INDEX idx_predictions_status (
        prediction_status
    )
) ENGINE=InnoDB;


-- =========================================================
-- 8. MODEL PERFORMANCE
-- =========================================================

CREATE TABLE IF NOT EXISTS model_metrics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    model_id BIGINT UNSIGNED NOT NULL,
    device_id BIGINT UNSIGNED NULL,

    period_start DATETIME(3) NOT NULL,
    period_end DATETIME(3) NOT NULL,

    sample_count BIGINT UNSIGNED NOT NULL DEFAULT 0,

    mae DOUBLE NULL,
    rmse DOUBLE NULL,
    r2 DOUBLE NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_model_metrics_model
        FOREIGN KEY (model_id)
        REFERENCES ml_models(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_model_metrics_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    INDEX idx_model_metrics_period (
        model_id,
        period_start,
        period_end
    )
) ENGINE=InnoDB;


-- =========================================================
-- 9. ALERTS
-- =========================================================

CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    device_id BIGINT UNSIGNED NOT NULL,

    alert_type VARCHAR(50) NOT NULL,
    severity ENUM(
        'info',
        'warning',
        'critical'
    ) NOT NULL,

    metric VARCHAR(50) NULL,

    actual_value DOUBLE NULL,
    threshold_value DOUBLE NULL,

    message VARCHAR(500) NOT NULL,

    source ENUM(
        'telemetry',
        'prediction',
        'system',
        'sensor'
    ) NOT NULL,

    triggered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    resolved_at DATETIME(3) NULL,

    status ENUM(
        'active',
        'resolved',
        'acknowledged'
    ) NOT NULL DEFAULT 'active',

    metadata JSON NULL,

    CONSTRAINT fk_alerts_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE,

    INDEX idx_alerts_device_time (
        device_id,
        triggered_at
    ),

    INDEX idx_alerts_status (
        status
    )
) ENGINE=InnoDB;
