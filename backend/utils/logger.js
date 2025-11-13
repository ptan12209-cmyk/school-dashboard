/**
 * Winston Logger Configuration
 * =============================
 * Centralized logging for the application
 *
 * Features:
 * - Multiple log levels (error, warn, info, http, debug)
 * - Console and file transports
 * - JSON formatting for production
 * - Pretty printing for development
 * - Request logging integration
 * - Error stack traces
 *
 * Usage:
 * const logger = require('./utils/logger');
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Database error', { error: err });
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston to use these colors
winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Custom format for console logs in development
 * Shows colorized output with timestamp
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      // Remove stack trace from meta for cleaner output
      const { stack, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        metaStr = `\n${JSON.stringify(cleanMeta, null, 2)}`;
      }
      if (stack) {
        metaStr += `\n${stack}`;
      }
    }

    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * Production format - JSON for log aggregation tools
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create log directory if it doesn't exist
 */
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Define transports based on environment
 */
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: prodFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: prodFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Add debug file in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    })
  );
}

/**
 * Create the logger instance
 */
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on uncaught errors
  exitOnError: false,
});

/**
 * Stream object for Morgan HTTP request logging
 * Writes HTTP logs to winston with 'http' level
 */
logger.stream = {
  write: (message) => {
    // Remove trailing newline
    logger.http(message.trim());
  },
};

/**
 * Log request details
 * @param {Object} req - Express request object
 * @param {number} statusCode - Response status code
 * @param {number} responseTime - Response time in ms
 */
logger.logRequest = (req, statusCode, responseTime) => {
  const { method, originalUrl, ip } = req;
  const userId = req.user?.id || 'anonymous';

  const logData = {
    method,
    url: originalUrl,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userId,
    userAgent: req.get('user-agent'),
  };

  if (statusCode >= 500) {
    logger.error('Request failed', logData);
  } else if (statusCode >= 400) {
    logger.warn('Request error', logData);
  } else {
    logger.http('Request completed', logData);
  }
};

/**
 * Log database query
 * @param {string} query - SQL query
 * @param {number} duration - Query duration in ms
 * @param {string} operation - Operation type (SELECT, INSERT, etc.)
 */
logger.logQuery = (query, duration, operation = 'QUERY') => {
  if (duration > 1000) {
    logger.warn('Slow query detected', {
      operation,
      duration: `${duration}ms`,
      query: query.substring(0, 200), // Truncate long queries
    });
  } else {
    logger.debug('Database query', {
      operation,
      duration: `${duration}ms`,
    });
  }
};

/**
 * Log authentication events
 * @param {string} event - Event type (login, logout, register)
 * @param {Object} data - Event data
 */
logger.logAuth = (event, data) => {
  logger.info(`Auth: ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log AI service calls
 * @param {string} operation - AI operation (prediction, recommendation, etc.)
 * @param {Object} data - Operation data
 */
logger.logAI = (operation, data) => {
  logger.info(`AI Service: ${operation}`, {
    operation,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} data - Event data
 */
logger.logSecurity = (event, data) => {
  logger.warn(`Security: ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log performance metrics
 * @param {string} metric - Metric name
 * @param {number} value - Metric value
 * @param {Object} metadata - Additional metadata
 */
logger.logMetric = (metric, value, metadata = {}) => {
  logger.info(`Metric: ${metric}`, {
    metric,
    value,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Log startup
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  logLevel: level(),
  logsDirectory: logsDir,
});

module.exports = logger;
