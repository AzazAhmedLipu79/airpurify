# Background Workers & Cron Jobs Architecture

Background tasks run asynchronously in Node.js via lightweight `node-cron` schedules ([src/jobs/index.js](file:///Users/darkmac/Desktop/air-quality-iot/src/jobs/index.js)).

---

## ⚙️ Worker Roster & Specifications

### 1. Telemetry Aggregation Worker
- **File**: [telemetryAggregation.job.js](file:///Users/darkmac/Desktop/air-quality-iot/src/jobs/telemetryAggregation.job.js) & [aggregation.service.js](file:///Users/darkmac/Desktop/air-quality-iot/src/services/aggregation.service.js)
- **Schedule**: Every 1 minute (`*/1 * * * *`)
- **Operations**:
  1. Pulls raw unaggregated measurements from `telemetry_data` over a 3-minute sliding lookback window.
  2. Groups measurements by `device_id` and 1-minute timestamp bucket (`YYYY-MM-DD HH:mm:00`).
  3. Computes statistical metrics (`avg`, `min`, `max`) for Temperature (`DS18B20`, `DHT11`, `TMP36`), Humidity, and MQ-135 Gas.
  4. Evaluates data quality ratio (`good` samples vs corrupted/missing samples) to tag bucket health (`good`, `partial`, `poor`).
  5. Atomically upserts records into `telemetry_1min_aggregates` table.

---

### 2. Offline Device Detection Worker
- **File**: [offlineDeviceDetection.job.js](file:///Users/darkmac/Desktop/air-quality-iot/src/jobs/offlineDeviceDetection.job.js)
- **Schedule**: Every 2 minutes (`*/2 * * * *`)
- **Operations**:
  1. Scans `devices` table for active nodes where `last_seen_at < NOW() - INTERVAL 5 MINUTE`.
  2. Mutates status from `active` → `inactive`.
  3. Triggers a `CRITICAL` alert entry in the `alerts` table and emits a real-time Socket.IO WebSocket notification to all active web dashboard instances.

---

### 3. Telemetry Cleanup & Retention Worker
- **File**: [telemetryCleanup.job.js](file:///Users/darkmac/Desktop/air-quality-iot/src/jobs/telemetryCleanup.job.js)
- **Schedule**: Daily at 02:00 AM (`0 2 * * *`)
- **Operations**:
  1. Purges high-frequency raw telemetry records older than 30 days.
  2. Preserves 1-minute, hourly, and daily aggregate tables to ensure permanent historical trends without database bloat.
