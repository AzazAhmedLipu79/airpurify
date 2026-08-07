# IoT Air Quality Monitoring Platform — Backend API

Production-grade, enterprise-ready backend platform for real-time IoT Air Quality Monitoring built with Node.js, Express.js, MySQL 8+, JWT Authentication, Zod validation, Winston structured logging, WebSockets, background workers, and explicit extension points for Python FastAPI Machine Learning services.

---

## Architecture Overview

This backend is engineered following **Clean Architecture**, **SOLID principles**, and the **Repository Pattern**:

```
[ IoT Edge Devices / Web Clients ]
               │
               ▼
[ HTTP REST API / WebSocket Gateway ]
               │
               ▼
[ Security & Middleware (Helmet, CORS, Rate Limiters, JWT Auth, Zod Validation) ]
               │
               ▼
[ Thin Controllers ]
               │
               ▼
[ Business Service Layer & Event Emitters ]
               │
               ▼
[ Encapsulated Repositories Layer (SQL Queries & Connection Pooling) ]
               │
               ▼
[ MySQL 8 Database (Host: 84.247.173.145) ]
```

### Key Architectural Highlights
- **High Throughput Telemetry Ingestion**: `POST /api/v1/telemetry` accepts batch sensor payloads and returns `202 Accepted` quickly without blocking for aggregations or ML tasks.
- **Asynchronous Event-Driven Architecture**: Telemetry ingestion fires events handled by background listeners and broadcasts real-time updates over **WebSockets (`socket.io`)**.
- **Idempotent 1-Minute Aggregations**: Cron worker computes 1-minute time bucket aggregates (`telemetry_1min`) using `measured_at`, guaranteeing deduplication.
- **Configurable Alert Engine**: Evaluates thresholds (e.g. high temperature, high humidity, hazardous gas levels, device offline status) and records active alerts into the database.
- **Python ML Pipeline Integration**: Exposes schemas & endpoints for feature export (`ml_features`), model registration (`ml_models`), predictions ingestion (`predictions`), and model evaluation metrics (`model_metrics`).

---

## Tech Stack & Dependencies

- **Runtime & Framework**: Node.js (v20+), Express.js (v4.19)
- **Database**: MySQL 8+ (`mysql2/promise` pool with fallback mock executor)
- **Security**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), `helmet`, `cors`, `express-rate-limit`
- **Validation & Logging**: `zod`, `winston` (JSON structured logging)
- **Real-Time Communication**: `socket.io`
- **Background Cron Workers**: `node-cron`
- **API Documentation**: OpenAPI 3.0 / Swagger (`swagger-ui-express`, `swagger-jsdoc`)
- **Testing**: `jest`, `supertest`

---

## Directory Structure

```
air-quality-iot/
├── .env                    # Environment configuration
├── .env.example            # Environment template
├── schema.sql              # MySQL DDL Schema
├── seed.sql                # Initial Seed Data
├── postman_collection.json # Postman API Collection
├── README.md               # Documentation
├── scripts/
│   └── init-db.js          # Database setup and seed migration script
├── src/
│   ├── app.js              # Express app setup & middleware pipeline
│   ├── server.js           # Server entry point & WebSocket attachment
│   ├── config/
│   │   ├── database.js     # MySQL2 pool configuration & fallback
│   │   ├── env.js          # Centralized dotenv parsing
│   │   ├── logger.js       # Winston structured logger
│   │   └── swagger.js      # OpenAPI specification generator
│   ├── constants/          # System roles, metrics, alert types, statuses
│   ├── utils/              # ApiResponse, errors, timeHelpers, asyncWrapper
│   ├── helpers/            # Pagination & SQL query builder helpers
│   ├── middleware/         # Auth, Authorize, Validate, ErrorHandler, RateLimiter
│   ├── validators/         # Zod schemas for input validation
│   ├── repositories/       # Encapsulated SQL database queries
│   ├── services/           # Business logic & event emission
│   ├── controllers/        # Thin HTTP request & response handlers
│   ├── routes/             # RESTful API route definitions
│   ├── events/             # EventEmitter & async listeners
│   ├── sockets/            # Socket.IO real-time WebSocket handlers
│   └── jobs/               # Independent background cron workers
└── tests/                  # Unit and integration test suites
```

---

## Quick Start & Installation

### 1. Prerequisites
- Node.js >= 18.0
- MySQL 8.0+

### 2. Environment Setup
Clone the repository and install dependencies:
```bash
npm install
```

Configure your environment in `.env`:
```env
PORT=3000
NODE_ENV=development
API_PREFIX=/api/v1

DB_HOST=84.247.173.145
DB_PORT=3306
DB_USER=iot
DB_PASSWORD=5EMrfpz75WetmmRC
DB_NAME=iot

JWT_SECRET=super-secret-jwt-key-for-air-quality-iot-platform-2026
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super-secret-refresh-key-for-air-quality-iot-platform-2026
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Database Initialization & Seeding
Run the database setup script to apply DDL schema and seed initial demo data:
```bash
npm run db:setup
```

### 4. Running the Application
Start in Development mode:
```bash
npm run dev
```

Start in Production mode:
```bash
npm start
```

---

## API Documentation (Swagger)

Once the application is running, interactively view and test all API endpoints via Swagger UI:
- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI JSON**: [http://localhost:3000/swagger.json](http://localhost:3000/swagger.json)

---

## Key API Endpoints & Example Requests

### 1. Authentication
- `POST /api/v1/auth/register` — Register User
- `POST /api/v1/auth/login` — JWT Login
- `POST /api/v1/auth/refresh` — Refresh Token Pair

**Example Login Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin@airquality.io",
    "password": "Password123!"
  }'
```

### 2. Telemetry Ingestion (High Throughput Batch Endpoint)
- `POST /api/v1/telemetry` — Ingest single or batch sensor telemetry readings.

**Example Batch Payload:**
```bash
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "device_uid": "DEV-NODE-001",
    "readings": [
      {
        "metric": "temperature_ds18b20",
        "value": 24.5,
        "unit": "C",
        "sequence_number": 1001
      },
      {
        "metric": "humidity_dht11",
        "value": 52.1,
        "unit": "%",
        "sequence_number": 1001
      },
      {
        "metric": "mq135",
        "value": 125.0,
        "unit": "ppm",
        "sequence_number": 1001
      }
    ]
  }'
```

### 3. Dashboard Overview
- `GET /api/v1/dashboard/overview` — Aggregated real-time metrics, online counts, AQI status, latest readings, and top active alerts.

### 4. Machine Learning Extension Points
- `POST /api/v1/ml/features` — Ingest preprocessed ML feature matrix.
- `GET /api/v1/ml/features/devices/:deviceId` — Query ML features for Python training pipeline.
- `POST /api/v1/ml/models` — Register trained ML model.
- `POST /api/v1/ml/predictions` — Ingest model predictions (from Python FastAPI service).

---

## Running Automated Tests

Run the test suite (Unit & Integration tests):
```bash
npm test
```

---

## License
MIT License
# airpurify
