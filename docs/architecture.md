# System Architecture & Engineering Principles

The **IoT Air Quality Monitoring Platform** is engineered following modern backend software architecture principles to ensure scale, modularity, maintainability, and microservice readiness.

---

## 🏛️ Layered Architecture & Modular Structure

The codebase strictly segregates responsibilities across clean architectural layers:

```
                          ┌──────────────────────────┐
                          │   HTTP / REST / WS Layer │
                          │     (Express & Socket.IO)│
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │    Controller Layer      │
                          │(Request/Response Handlers)│
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │      Service Layer       │
                          │ (Business Logic & Math)  │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │     Repository Layer     │
                          │   (MySQL Data Access)    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │    Database Engine       │
                          │ (MySQL 8 + Connection Pool)
                          └──────────────────────────┘
```

### Layer Breakdown

1. **Controllers (`src/controllers/`)**:
   - Handle incoming HTTP requests, extract parameters, and return formatted JSON responses.
   - Completely decoupled from SQL queries and database drivers.

2. **Services (`src/services/`)**:
   - Encapsulate business logic, statistical analytics, Pearson correlation, radial score calculations, and event logging.
   - Pure JS methods allowing isolated unit testing.

3. **Repositories (`src/repositories/`)**:
   - Implements the **Repository Pattern** to abstract database operations (`mysql2/promise`).
   - Handles SQL parameter binding, transactions, and table aliases cleanly.

4. **Middleware (`src/middleware/`)**:
   - Authentication check (`authenticate.js`), Role-based access control (`authorize.js`), Request validation via Zod (`validate.js`), Rate limiting, Helmet security headers, CORS, and centralized Error Handling.

---

## 💎 SOLID Design Principles Implemented

- **Single Responsibility Principle (SRP)**: Each service and repository handles a distinct domain (Auth, Devices, Telemetry, Aggregations, Alerts, Health Diagnostics).
- **Open/Closed Principle (OCP)**: Scalable validator schemas and service modules can be extended without modifying existing handlers.
- **Dependency Inversion Principle (DIP)**: Controllers consume service singletons, and services consume repository instances, simplifying mock injection during unit tests (`npm test`).
