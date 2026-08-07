const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/env');
const swaggerSpec = require('./config/swagger');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { NotFoundError } = require('./utils/errors');

const app = express();

// Security Headers & Cross-Origin settings
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP restrictive headers for inline scripts & CDN Chart.js fonts
  })
);
app.use(cors({ origin: config.cors.origin }));
app.use(compression());

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static Assets Mounting for Web Dashboard
app.use(express.static(path.resolve(__dirname, '../public')));

// Global Rate Limiting
app.use(globalRateLimiter);

// API Documentation UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => res.json(swaggerSpec));

// Chrome DevTools / Well-Known Requests Probe Handler
app.get('/.well-known/*', (req, res) => res.status(204).end());

// API Routes Mounting
app.use(config.apiPrefix, routes);

// Dashboard SPA Fallback Route
app.get(['/', '/dashboard', '/dashboard/*'], (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

// 404 Route Not Found Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route '${req.originalUrl}' not found on this server`));
});

// Centralized Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
