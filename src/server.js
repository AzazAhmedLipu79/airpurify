const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./config/database');
const { initSocket } = require('./sockets/socketHandler');
const registerEventListeners = require('./events/telemetryListeners');
const { initAllJobs } = require('./jobs');

const server = http.createServer(app);

// Initialize Socket.IO WebSockets
initSocket(server);

// Register Asynchronous Event Listeners
registerEventListeners();

async function startServer() {
  try {
    // Verify DB Connection
    await db.testConnection();

    // Start Background Cron Jobs
    initAllJobs();

    server.listen(config.port, () => {
      logger.info(`===========================================================`);
      logger.info(` Air Quality Monitoring Platform Backend running on port ${config.port}`);
      logger.info(` Environment: ${config.env}`);
      logger.info(` API Docs available at http://localhost:${config.port}/docs`);
      logger.info(` API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`===========================================================`);
    });
  } catch (err) {
    logger.error('Failed to start server:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Graceful Shutdown
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, server, startServer };
