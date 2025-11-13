/**
 * Custom Error Classes
 * =====================
 * Centralized error handling with custom error classes
 *
 * Usage:
 * throw new ValidationError('Invalid email format');
 * throw new NotFoundError('User not found');
 * throw new UnauthorizedError('Invalid credentials');
 */

/**
 * Base Application Error
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application-specific error code
   * @param {Object} details - Additional error details
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      success: false,
      error: {
        name: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Validation Error (400)
 * Used for input validation failures
 * @class ValidationError
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} details - Validation error details
   * @example
   * throw new ValidationError('Invalid input', { email: 'Invalid email format' });
   */
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error (401)
 * Used for authentication failures
 * @class UnauthorizedError
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Error message
   * @example
   * throw new UnauthorizedError('Invalid credentials');
   */
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Authorization Error (403)
 * Used for permission/access denied
 * @class ForbiddenError
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} message - Error message
   * @example
   * throw new ForbiddenError('Insufficient permissions');
   */
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Resource Not Found Error (404)
 * Used when a requested resource doesn't exist
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * @param {string} resource - Resource name
   * @param {string|number} identifier - Resource identifier
   * @example
   * throw new NotFoundError('User', userId);
   */
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict Error (409)
 * Used for resource conflicts (e.g., duplicate entries)
 * @class ConflictError
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} details - Conflict details
   * @example
   * throw new ConflictError('Email already exists', { email: 'user@example.com' });
   */
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Too Many Requests Error (429)
 * Used for rate limiting
 * @class RateLimitError
 * @extends AppError
 */
class RateLimitError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {number} retryAfter - Seconds until retry is allowed
   * @example
   * throw new RateLimitError('Too many requests', 60);
   */
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 * @class InternalServerError
 * @extends AppError
 */
class InternalServerError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Error} originalError - Original error object
   * @example
   * throw new InternalServerError('Database connection failed', error);
   */
  constructor(message = 'Internal server error', originalError = null) {
    super(message, 500, 'INTERNAL_ERROR');
    if (originalError) {
      this.originalError = originalError.message;
      this.stack = originalError.stack;
    }
  }
}

/**
 * Bad Gateway Error (502)
 * Used for external service failures
 * @class BadGatewayError
 * @extends AppError
 */
class BadGatewayError extends AppError {
  /**
   * @param {string} service - Service name
   * @param {string} message - Error message
   * @example
   * throw new BadGatewayError('AI Service', 'Google Gemini API unavailable');
   */
  constructor(service, message = 'Service unavailable') {
    super(`${service}: ${message}`, 502, 'BAD_GATEWAY', { service });
  }
}

/**
 * Service Unavailable Error (503)
 * Used for temporary service unavailability
 * @class ServiceUnavailableError
 * @extends AppError
 */
class ServiceUnavailableError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {number} retryAfter - Seconds until service is expected to be available
   * @example
   * throw new ServiceUnavailableError('Database maintenance in progress', 300);
   */
  constructor(message = 'Service temporarily unavailable', retryAfter = 0) {
    super(message, 503, 'SERVICE_UNAVAILABLE', { retryAfter });
  }
}

/**
 * Database Error
 * Used for database-related errors
 * @class DatabaseError
 * @extends AppError
 */
class DatabaseError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Error} originalError - Original database error
   * @example
   * throw new DatabaseError('Query failed', error);
   */
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    if (originalError) {
      this.originalError = originalError.message;
      this.details = {
        type: originalError.name,
        sql: originalError.sql,
      };
    }
  }
}

/**
 * External API Error
 * Used for third-party API errors
 * @class ExternalAPIError
 * @extends AppError
 */
class ExternalAPIError extends AppError {
  /**
   * @param {string} apiName - API name
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @example
   * throw new ExternalAPIError('Google Gemini', 'API rate limit exceeded', 429);
   */
  constructor(apiName, message, statusCode = 500) {
    super(`${apiName} API Error: ${message}`, statusCode, 'EXTERNAL_API_ERROR', { apiName });
  }
}

/**
 * Error Handler Middleware
 * Express middleware for centralized error handling
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  const logger = require('./logger');

  if (err.isOperational) {
    logger.warn(`Operational Error: ${err.message}`, {
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.error(`System Error: ${err.message}`, {
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message,
        })),
      },
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: {
        name: 'ConflictError',
        message: 'Duplicate entry',
        code: 'CONFLICT',
        statusCode: 409,
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message,
        })),
      },
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      error: {
        name: 'DatabaseError',
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'Invalid token',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
      },
    });
  }

  // Handle unknown errors
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      name: 'InternalServerError',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      code: 'INTERNAL_ERROR',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 * @example
 * router.get('/users', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  BadGatewayError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalAPIError,
  errorHandler,
  asyncHandler,
};
