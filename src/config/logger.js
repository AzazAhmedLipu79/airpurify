const winston = require('winston');
const path = require('path');
const config = require('./env');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `[${timestamp}] ${level}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ''
      }`
  )
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'air-quality-backend' },
  transports: [
    new winston.transports.Console({
      format: config.env === 'development' ? consoleFormat : logFormat,
    }),
    new winston.transports.File({
      filename: path.resolve(process.cwd(), config.logging.filePath),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
