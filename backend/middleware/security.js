/**
 * Security Middleware
 * ===================
 * Comprehensive security middleware for input sanitization,
 * XSS protection, and security headers
 *
 * Features:
 * - Input sanitization (NoSQL injection, XSS)
 * - SQL injection prevention
 * - Security headers enhancement
 * - Request size limiting
 * - Parameter pollution prevention
 */

const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes $ and . from user input
 */
const sanitizeInput = mongoSanitize({
  replaceWith: '_', // Replace $ and . with _
  onSanitize: ({ req, key }) => {
    logger.logSecurity('input_sanitized', {
      ip: req.ip,
      path: req.path,
      key,
      method: req.method,
    });
  },
});

/**
 * Custom XSS protection middleware
 * Sanitizes HTML and JavaScript from input
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const xssProtection = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object properties
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  str = str.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  str = str.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  str = str.replace(/javascript:/gi, '');

  // Remove data: protocol
  str = str.replace(/data:text\/html/gi, '');

  // Escape HTML entities
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return str;
}

/**
 * SQL Injection Prevention
 * Validates and sanitizes SQL-related input
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const sqlInjectionPrevention = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(;|\-\-|\/\*|\*\/|xp_|sp_|0x)/gi,
    /('|(\\')|(;)|(\-\-)|(\||<|>))/gi,
  ];

  // Check all input sources
  const inputSources = [req.body, req.query, req.params];

  for (const source of inputSources) {
    if (checkForSQLInjection(source, sqlPatterns)) {
      logger.logSecurity('sql_injection_attempt', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
      });

      return res.status(400).json({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Invalid input detected',
          code: 'INVALID_INPUT',
          statusCode: 400,
        },
      });
    }
  }

  next();
};

/**
 * Check object for SQL injection patterns
 * @param {any} obj - Object to check
 * @param {Array} patterns - SQL patterns to match
 * @returns {boolean} True if SQL injection detected
 */
function checkForSQLInjection(obj, patterns) {
  if (typeof obj === 'string') {
    return patterns.some(pattern => pattern.test(obj));
  }

  if (Array.isArray(obj)) {
    return obj.some(item => checkForSQLInjection(item, patterns));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).some(value => checkForSQLInjection(value, patterns));
  }

  return false;
}

/**
 * Enhanced Security Headers
 * Adds additional security headers beyond Helmet
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const enhancedSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );
  }

  next();
};

/**
 * Parameter Pollution Prevention
 * Prevents HTTP parameter pollution attacks
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const parameterPollutionPrevention = (req, res, next) => {
  // Whitelist of parameters that can appear multiple times
  const whitelist = ['tags', 'subjects', 'ids'];

  // Check query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value) && !whitelist.includes(key)) {
      logger.logSecurity('parameter_pollution_attempt', {
        ip: req.ip,
        path: req.path,
        parameter: key,
      });

      // Use only the first value
      req.query[key] = value[0];
    }
  }

  next();
};

/**
 * Request Size Validator
 * Prevents large payload attacks
 * @param {Object} options - Size limits
 * @returns {Function} Middleware function
 */
const requestSizeValidator = (options = {}) => {
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default

  return (req, res, next) => {
    const contentLength = req.get('content-length');

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      logger.logSecurity('large_payload_rejected', {
        ip: req.ip,
        path: req.path,
        size: contentLength,
        maxSize,
      });

      return res.status(413).json({
        success: false,
        error: {
          name: 'PayloadTooLargeError',
          message: 'Request payload too large',
          code: 'PAYLOAD_TOO_LARGE',
          statusCode: 413,
          details: {
            maxSize: `${maxSize / 1024 / 1024}MB`,
          },
        },
      });
    }

    next();
  };
};

/**
 * Suspicious Activity Detector
 * Detects and logs suspicious patterns
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = {
    // Path traversal attempts
    pathTraversal: /(\.\.(\/|\\))+/g,

    // Command injection attempts
    commandInjection: /[;&|`$()]/g,

    // XXE injection attempts
    xxeInjection: /<!DOCTYPE|<!ENTITY/gi,

    // LDAP injection
    ldapInjection: /[*()\\]/g,
  };

  const path = req.path.toLowerCase();
  const body = JSON.stringify(req.body);
  const query = JSON.stringify(req.query);

  for (const [type, pattern] of Object.entries(suspiciousPatterns)) {
    if (
      pattern.test(path) ||
      pattern.test(body) ||
      pattern.test(query)
    ) {
      logger.logSecurity(`suspicious_activity_${type}`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
        type,
      });

      // Don't block, just log (to avoid false positives)
      // In production, you might want to block these
    }
  }

  next();
};

/**
 * CORS Security Validator
 * Additional CORS validation beyond basic CORS middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const corsSecurityValidator = (req, res, next) => {
  const origin = req.get('origin');

  if (origin && process.env.NODE_ENV === 'production') {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');

    if (!allowedOrigins.includes(origin)) {
      logger.logSecurity('cors_violation', {
        ip: req.ip,
        origin,
        path: req.path,
      });
    }
  }

  next();
};

module.exports = {
  sanitizeInput,
  xssProtection,
  sqlInjectionPrevention,
  enhancedSecurityHeaders,
  parameterPollutionPrevention,
  requestSizeValidator,
  suspiciousActivityDetector,
  corsSecurityValidator,
};
