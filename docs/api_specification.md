# API & WebSocket Specifications

The API follows RESTful conventions and provides interactive Swagger OpenAPI documentation at `/docs`.

---

## 🔐 Authentication & Session Security

- **Authentication**: JWT Bearer Tokens (`Authorization: Bearer <token>`).
- **Password Hashing**: `bcrypt` with salt rounds = 10.
- **Request Validation**: Zod runtime schema validation on all POST/GET parameters ([src/validators/](file:///Users/darkmac/Desktop/air-quality-iot/src/validators/)).

---

## 📡 REST API Catalog

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | POST | Public | Authenticate user & return JWT token |
| `/api/v1/auth/me` | GET | Authenticated | Fetch current user session details |
| `/api/v1/telemetry` | POST | Device/Auth | Ingest batch or single sensor reading |
| `/api/v1/devices` | GET | Authenticated | List all registered devices with search & status filters |
| `/api/v1/devices` | POST | Admin/Op | Register a new edge station node |
| `/api/v1/analytics/historical` | GET | Authenticated | Fetch time-series aggregates, correlation & heatmap data |
| `/api/v1/dashboard/overview` | GET | Authenticated | Executive dashboard summary & radial status |
| `/api/v1/alerts` | GET | Authenticated | List alerts with severity & status filters |
| `/api/v1/alerts/:id/status` | PATCH | Admin/Op | Acknowledge or resolve alert |

---

## 🌐 Socket.IO Real-Time Telemetry Stream

- **WebSocket Connection**: `ws://localhost:3000`
- **Events**:
  - `telemetry:new`: Broadcasts live sensor telemetry upon HTTP ingestion.
  - `alert:triggered`: Broadcasts instant critical/warning alert events.
