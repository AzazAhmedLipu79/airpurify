const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../src/config/env');

async function initDatabase() {
  console.log(`Connecting to MySQL server at ${config.db.host}:${config.db.port} as user '${config.db.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      multipleStatements: true,
    });

    console.log('Connected to MySQL server successfully!');

    // Read schema.sql & seed.sql
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.resolve(__dirname, '../seed.sql'), 'utf8');

    console.log(`Ensuring database '${config.db.name}' exists and running DDL schema migration...`);
    const preparedSchema = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS air_quality/gi, `CREATE DATABASE IF NOT EXISTS \`${config.db.name}\``)
      .replace(/USE air_quality;/gi, `USE \`${config.db.name}\`;`);

    await connection.query(preparedSchema);
    console.log('Database schema created/updated successfully!');

    console.log('Seeding initial data...');
    const preparedSeed = seedSql.replace(/USE air_quality;/gi, `USE \`${config.db.name}\`;`);
    await connection.query(preparedSeed);

    // Seed 30 days of historical aggregates for device 1 and 2 if not present
    console.log('Seeding historical telemetry aggregates (30-day timeline)...');
    const [existingCount] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${config.db.name}\`.telemetry_1min`);
    
    if (existingCount[0].cnt < 50) {
      const now = new Date();
      const insertSql = `
        INSERT INTO \`${config.db.name}\`.telemetry_1min (
          device_id, time_bucket, temperature_ds18b20_avg, temperature_dht11_avg,
          humidity_dht11_avg, mq135_avg, temperature_ds18b20_min, temperature_ds18b20_max,
          humidity_dht11_min, humidity_dht11_max, mq135_min, mq135_max, sample_count, data_quality
        ) VALUES ?
        ON DUPLICATE KEY UPDATE sample_count = VALUES(sample_count)
      `;

      const rowsToInsert = [];
      // Generate hourly points over 30 days for rich timeline rendering
      for (let d = 30; d >= 0; d--) {
        for (let h = 0; h < 24; h += 2) { // every 2 hours
          const bucketTime = new Date(now.getTime() - (d * 24 * 3600 * 1000) - (h * 3600 * 1000));
          bucketTime.setMinutes(0, 0);

          const timeStr = bucketTime.toISOString().slice(0, 19).replace('T', ' ');

          // Temperature diurnal variation (colder at night, warmer at noon)
          const hourOfDay = bucketTime.getHours();
          const baseTemp = 22 + Math.sin((hourOfDay - 6) * (Math.PI / 12)) * 6 + (Math.random() * 2 - 1);
          const baseHumidity = 60 - Math.sin((hourOfDay - 6) * (Math.PI / 12)) * 15 + (Math.random() * 4 - 2);
          const baseGas = 120 + (hourOfDay >= 7 && hourOfDay <= 19 ? Math.random() * 80 : Math.random() * 20);

          // Device 1
          rowsToInsert.push([
            1,
            timeStr,
            parseFloat(baseTemp.toFixed(2)),
            parseFloat((baseTemp + 0.3).toFixed(2)),
            parseFloat(baseHumidity.toFixed(2)),
            parseFloat(baseGas.toFixed(2)),
            parseFloat((baseTemp - 1.2).toFixed(2)),
            parseFloat((baseTemp + 1.5).toFixed(2)),
            parseFloat((baseHumidity - 3).toFixed(2)),
            parseFloat((baseHumidity + 4).toFixed(2)),
            parseFloat((baseGas - 10).toFixed(2)),
            parseFloat((baseGas + 25).toFixed(2)),
            12,
            'good',
          ]);

          // Device 2
          rowsToInsert.push([
            2,
            timeStr,
            parseFloat((baseTemp + 2.0).toFixed(2)),
            parseFloat((baseTemp + 2.1).toFixed(2)),
            parseFloat((baseHumidity - 5.0).toFixed(2)),
            parseFloat((baseGas + 45.0).toFixed(2)),
            parseFloat((baseTemp + 1.0).toFixed(2)),
            parseFloat((baseTemp + 3.2).toFixed(2)),
            parseFloat((baseHumidity - 8).toFixed(2)),
            parseFloat((baseHumidity - 2).toFixed(2)),
            parseFloat((baseGas + 20).toFixed(2)),
            parseFloat((baseGas + 80).toFixed(2)),
            12,
            'good',
          ]);
        }
      }

      await connection.query(insertSql, [rowsToInsert]);
      console.log(`Seeded ${rowsToInsert.length} historical aggregate rows into telemetry_1min!`);
    }

    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Database setup failed:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
