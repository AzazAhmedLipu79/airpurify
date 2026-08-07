const logger = require('../config/logger');
const config = require('../config/env');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload structure';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry conflict in database';
  }

  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - ${message}`, {
    stack: err.stack,
    errors,
    ip: req.ip,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(config.env === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
