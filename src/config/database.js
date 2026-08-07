const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('./logger');

let pool = null;
let isInMemoryFallback = false;

// In-Memory store fallback for standalone/test execution without MySQL daemon
const inMemoryStore = {
  users: [
    {
      id: 1,
      username: 'admin_user',
      email: 'admin@airquality.io',
      password_hash: '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W', // Password123!
      role: 'admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      username: 'operator_user',
      email: 'operator@airquality.io',
      password_hash: '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W',
      role: 'operator',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      username: 'viewer_user',
      email: 'viewer@airquality.io',
      password_hash: '$2a$10$7Dg7fdFzmcOf9bPkkO4LYedWS.mKo.rtToR9GdR/Vt.hjODzaQ/0W',
      role: 'viewer',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  refresh_tokens: [],
  devices: [
    {
      id: 1,
      device_uid: 'DEV-NODE-001',
      name: 'Downtown Station A',
      firmware_version: 'v2.1.0',
      status: 'active',
      last_seen_at: new Date(),
      location_name: 'Central Park Plaza',
      latitude: 40.785091,
      longitude: -73.968285,
      metadata: { building: 'North Pavilion', zone: 'A1' },
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      device_uid: 'DEV-NODE-002',
      name: 'Industrial Zone B',
      firmware_version: 'v2.1.0',
      status: 'active',
      last_seen_at: new Date(),
      location_name: 'Factory Complex 4',
      latitude: 40.748817,
      longitude: -73.985428,
      metadata: { building: 'Warehouse 3', zone: 'B2' },
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  sensors: [
    {
      id: 1,
      device_id: 1,
      sensor_type: 'temperature_ds18b20',
      model: 'DS18B20',
      serial_number: 'SN-DS-9821',
      status: 'active',
      installed_at: new Date(),
      removed_at: null,
      sampling_interval_ms: 5000,
      calibration_data: { offset: -0.2, unit: 'C' },
      configuration: { accuracy: 'high' },
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      device_id: 1,
      sensor_type: 'humidity_dht11',
      model: 'DHT11',
      serial_number: 'SN-DHT-1192',
      status: 'active',
      installed_at: new Date(),
      removed_at: null,
      sampling_interval_ms: 5000,
      calibration_data: { multiplier: 1.01 },
      configuration: { mode: 'continuous' },
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      device_id: 1,
      sensor_type: 'mq135',
      model: 'MQ-135',
      serial_number: 'SN-MQ-4401',
      status: 'active',
      installed_at: new Date(),
      removed_at: null,
      sampling_interval_ms: 5000,
      calibration_data: { r0: 10.5 },
      configuration: { target_gas: 'CO2_NH3' },
      metadata: {},
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  telemetry: [],
  telemetry_1min: [],
  ml_features: [],
  ml_models: [
    {
      id: 1,
      model_name: 'PM25_XGBoost_Forecaster',
      model_version: 'v1.0.0',
      algorithm: 'XGBoostRegressor',
      target_metric: 'pm25',
      prediction_horizon_minutes: 30,
      feature_version: 'v1',
      training_started_at: new Date(),
      training_finished_at: new Date(),
      training_samples: 15000,
      mae: 1.82,
      rmse: 2.45,
      r2: 0.92,
      status: 'production',
      metadata: {},
      created_at: new Date()
    }
  ],
  predictions: [],
  model_metrics: [],
  alerts: []
};

function createPool() {
  if (pool) return pool;

  try {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      timezone: 'Z',
      dateStrings: true,
    });
    logger.info(`MySQL connection pool initialized for ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`);
  } catch (err) {
    logger.warn('Failed to initialize MySQL connection pool. Switching to in-memory store mode.', { error: err.message });
    isInMemoryFallback = true;
  }

  return pool;
}

async function testConnection() {
  try {
    const p = createPool();
    if (!p || isInMemoryFallback) {
      isInMemoryFallback = true;
      logger.info('Database running in Mock In-Memory Mode.');
      return false;
    }
    const connection = await p.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection verified successfully.');
    return true;
  } catch (err) {
    logger.warn('Database connection test failed. Active fallback mode enabled.', { message: err.message });
    isInMemoryFallback = true;
    return false;
  }
}

// Wrapper for executing queries seamlessly with fallback
async function query(sql, params = []) {
  if (!isInMemoryFallback) {
    try {
      const p = createPool();
      const [rows, fields] = await p.query(sql, params);
      return [rows, fields];
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ENOTFOUND') {
        logger.warn(`MySQL connection error (${err.code}). Falling back to internal state handling.`);
        isInMemoryFallback = true;
      } else {
        throw err;
      }
    }
  }

  // If in-memory mode active
  return mockExecute(sql, params);
}

// Basic mock SQL interpreter for key CRUD operations in fallback mode
function mockExecute(sql, params = []) {
  const normalized = sql.trim().toLowerCase();
  
  if (normalized.includes('select 1')) {
    return [[{ '1': 1 }], []];
  }

  if (normalized.includes('select') && normalized.includes('from users')) {
    let rows = [...inMemoryStore.users];
    if (normalized.includes('where username =') || normalized.includes('where email =')) {
      const target = params[0];
      rows = rows.filter(u => u.username === target || u.email === target);
    } else if (normalized.includes('where id =')) {
      rows = rows.filter(u => u.id == params[0]);
    }
    return [rows, []];
  }

  if (normalized.includes('insert into users')) {
    const newUser = {
      id: inMemoryStore.users.length + 1,
      username: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'viewer',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    };
    inMemoryStore.users.push(newUser);
    return [{ insertId: newUser.id, affectedRows: 1 }, []];
  }

  if (normalized.includes('select') && normalized.includes('from devices')) {
    let rows = [...inMemoryStore.devices];
    if (normalized.includes('where id =')) {
      rows = rows.filter(d => d.id == params[0]);
    } else if (normalized.includes('where device_uid =')) {
      rows = rows.filter(d => d.device_uid == params[0]);
    }
    return [rows, []];
  }

  if (normalized.includes('insert into devices')) {
    const newDevice = {
      id: inMemoryStore.devices.length + 1,
      device_uid: params[0],
      name: params[1] || null,
      firmware_version: params[2] || null,
      status: params[3] || 'active',
      last_seen_at: new Date(),
      location_name: params[4] || null,
      latitude: params[5] || null,
      longitude: params[6] || null,
      metadata: params[7] ? JSON.parse(params[7]) : null,
      created_at: new Date(),
      updated_at: new Date()
    };
    inMemoryStore.devices.push(newDevice);
    return [{ insertId: newDevice.id, affectedRows: 1 }, []];
  }

  if (normalized.includes('select') && normalized.includes('from sensors')) {
    let rows = [...inMemoryStore.sensors];
    if (normalized.includes('where id =')) {
      rows = rows.filter(s => s.id == params[0]);
    } else if (normalized.includes('where device_id =')) {
      rows = rows.filter(s => s.device_id == params[0]);
    }
    return [rows, []];
  }

  if (normalized.includes('insert into telemetry')) {
    const newTel = {
      id: inMemoryStore.telemetry.length + 1,
      device_id: params[0],
      sensor_id: params[1],
      metric: params[2],
      value: params[3],
      unit: params[4],
      measured_at: params[5] || new Date(),
      received_at: params[6] || new Date(),
      quality: params[7] || 'good',
      sequence_number: params[8] || null,
      metadata: params[9] ? (typeof params[9] === 'string' ? JSON.parse(params[9]) : params[9]) : null,
      created_at: new Date()
    };
    inMemoryStore.telemetry.push(newTel);
    return [{ insertId: newTel.id, affectedRows: 1 }, []];
  }

  if (normalized.includes('select') && normalized.includes('from telemetry')) {
    return [[...inMemoryStore.telemetry], []];
  }

  if (normalized.includes('select') && normalized.includes('from alerts')) {
    return [[...inMemoryStore.alerts], []];
  }

  if (normalized.includes('insert into alerts')) {
    const newAlert = {
      id: inMemoryStore.alerts.length + 1,
      device_id: params[0],
      alert_type: params[1],
      severity: params[2],
      metric: params[3],
      actual_value: params[4],
      threshold_value: params[5],
      message: params[6],
      source: params[7],
      triggered_at: params[8] || new Date(),
      status: 'active',
      metadata: params[9] ? JSON.parse(params[9]) : null
    };
    inMemoryStore.alerts.push(newAlert);
    return [{ insertId: newAlert.id, affectedRows: 1 }, []];
  }

  // Generic fallback response for mock query execution
  return [[], []];
}

module.exports = {
  createPool,
  testConnection,
  query,
  execute: query,
  inMemoryStore,
  get isInMemory() { return isInMemoryFallback; }
};
