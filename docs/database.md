# Database Schema & Overview

The database is built on **MySQL 8+** (`iot@84.247.173.145:3306/iot`) using connection pooling (`mysql2/promise`).

---

## 🗄️ Relational Table Inventory (11 Tables)

```
                            ┌────────────────┐
                            │     users      │
                            └───────┬────────┘
                                    │ 1
                                    │
                                    │ N
                            ┌───────┴────────┐
                            │    devices     │
                            └───────┬────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │ 1                        │ 1                        │ 1
         │                          │                          │
         │ N                        │ N                        │ N
┌────────┴────────┐        ┌────────┴────────┐        ┌────────┴────────┐
│     sensors     │        │ telemetry_data  │        │     alerts      │
└─────────────────┘        └────────┬────────┘        └─────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│telemetry_1min_  │        │telemetry_hourly_│        │telemetry_daily_ │
│aggregates       │        │aggregates       │        │aggregates       │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

### Table Definitions & Purpose

1. `users`: System users with hashed passwords (`bcrypt`) and roles (`admin`, `operator`, `viewer`).
2. `devices`: Physical edge IoT station nodes with `device_uid`, `name`, `location_name`, `status`, and `last_seen_at`.
3. `sensors`: Individual sensor hardware modules attached to devices (`DS18B20`, `DHT11`, `MQ135`, `TMP36`).
4. `telemetry_data`: High-frequency unaggregated raw telemetry sensor measurements (`metric`, `value`, `unit`, `quality`, `measured_at`).
5. `telemetry_1min_aggregates`: Pre-computed 1-minute time bucket aggregates (`avg`, `min`, `max` for Temp, Humidity, MQ-135 Gas).
6. `telemetry_hourly_aggregates`: Pre-computed hourly statistical aggregates.
7. `telemetry_daily_aggregates`: Pre-computed daily statistical aggregates.
8. `alerts`: Triggered system and sensor alert logs with severity levels (`critical`, `warning`, `info`) and state tracking (`active`, `acknowledged`, `resolved`).
9. `alert_rules`: Dynamic threshold configuration rules per metric and device.
10. `device_health_logs`: Device diagnostic state snapshots (`quality_score`, `uptime_percentage`, `packet_loss`, `sequence_gaps`).
11. `refresh_tokens`: Revocable authentication tokens for user sessions.

---

## ⚡ Indexing & Performance Strategies

- **Composite Time Index**: `(device_id, measured_at)` on `telemetry_data` for sub-millisecond sliding-window lookups.
- **Unique Bucket Index**: `UNIQUE KEY (device_id, time_bucket)` on aggregate tables enabling atomic `ON DUPLICATE KEY UPDATE` upserts.
- **Connection Pool**: Configured with `connectionLimit: 20`, auto-reconnect, and health check validation.
