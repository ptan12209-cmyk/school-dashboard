class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Handle Sequelize Errors
 */
const handleSequelizeError = (err) => {
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return {
      statusCode: 400,
      message: 'Validation error',
      errors,
    };
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return {
      statusCode: 409,
      message: `${field} already exists`,
    };
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return {
      statusCode: 400,
      message: 'Invalid reference to related resource',
    };
  }

  if (err.name === 'SequelizeDatabaseError') {
    return {
      statusCode: 500,
      message: 'Database error',
    };
  }

  return null;
};

/**
 * Handle JWT Errors
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token',
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token expired',
    };
  }

  return null;
};

/**
 * Development Error Response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
    ...(err.errors && { errors: err.errors }),
  });
};

/**
 * Production Error Response
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }
  // Programming or unknown error: don't leak error details
  else {
    console.error('ERROR 💥:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  const sequelizeError = handleSequelizeError(err);
  if (sequelizeError) {
    err.statusCode = sequelizeError.statusCode;
    err.message = sequelizeError.message;
    err.errors = sequelizeError.errors;
    err.isOperational = true;
  }

  const jwtError = handleJWTError(err);
  if (jwtError) {
    err.statusCode = jwtError.statusCode;
    err.message = jwtError.message;
    err.isOperational = true;
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  errorHandler,
  catchAsync,
  notFound,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
};
