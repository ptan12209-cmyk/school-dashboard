/**
 * Performance Monitoring Middleware
 * ==================================
 * Tracks and logs performance metrics for all requests
 *
 * Features:
 * - Response time tracking
 * - Slow endpoint detection
 * - Memory usage monitoring
 * - Request/response size tracking
 * - Performance metrics aggregation
 *
 * Usage:
 * app.use(performanceMonitoring());
 */

const logger = require('../utils/logger');

/**
 * Performance thresholds (milliseconds)
 */
const THRESHOLDS = {
  FAST: 100, // < 100ms - fast
  NORMAL: 500, // < 500ms - normal
  SLOW: 1000, // < 1000ms - slow
  CRITICAL: 3000, // >= 3000ms - critical
};

/**
 * Performance metrics store
 * In production, use Redis or a metrics service like Prometheus
 */
const metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
    byEndpoint: {},
  },
  responseTimes: {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
    avg: 0,
  },
  errors: {
    total: 0,
    by5xx: 0,
    by4xx: 0,
  },
  slowEndpoints: [],
};

/**
 * Performance monitoring middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function performanceMonitoring(options = {}) {
  const slowThreshold = options.slowThreshold || THRESHOLDS.SLOW;
  const logAll = options.logAll || false;

  return (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Track request size
    const requestSize = parseInt(req.get('content-length'), 10) || 0;

    // Store original end function
    const originalEnd = res.end;
    let responseSize = 0;

    // Override end to capture response size
    res.end = function (chunk, ...args) {
      if (chunk) {
        responseSize = Buffer.byteLength(chunk);
      }

      // Call original end
      originalEnd.call(this, chunk, ...args);
    };

    // On response finish
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      // Update metrics
      updateMetrics(req, res, responseTime);

      // Log performance data
      logPerformance({
        req,
        res,
        responseTime,
        requestSize,
        responseSize,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
        },
        slowThreshold,
        logAll,
      });
    });

    next();
  };
}

/**
 * Update performance metrics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {number} responseTime - Response time in ms
 */
function updateMetrics(req, res, responseTime) {
  // Total requests
  metrics.requests.total++;

  // By method
  metrics.requests.byMethod[req.method] =
    (metrics.requests.byMethod[req.method] || 0) + 1;

  // By status code
  const statusCategory = `${Math.floor(res.statusCode / 100)}xx`;
  metrics.requests.byStatus[statusCategory] =
    (metrics.requests.byStatus[statusCategory] || 0) + 1;

  // By endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  if (!metrics.requests.byEndpoint[endpoint]) {
    metrics.requests.byEndpoint[endpoint] = {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
    };
  }

  const endpointMetrics = metrics.requests.byEndpoint[endpoint];
  endpointMetrics.count++;
  endpointMetrics.totalTime += responseTime;
  endpointMetrics.avgTime = endpointMetrics.totalTime / endpointMetrics.count;
  endpointMetrics.minTime = Math.min(endpointMetrics.minTime, responseTime);
  endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, responseTime);

  // Response times
  metrics.responseTimes.total += responseTime;
  metrics.responseTimes.count++;
  metrics.responseTimes.avg =
    metrics.responseTimes.total / metrics.responseTimes.count;
  metrics.responseTimes.min = Math.min(
    metrics.responseTimes.min,
    responseTime
  );
  metrics.responseTimes.max = Math.max(
    metrics.responseTimes.max,
    responseTime
  );

  // Errors
  if (res.statusCode >= 500) {
    metrics.errors.total++;
    metrics.errors.by5xx++;
  } else if (res.statusCode >= 400) {
    metrics.errors.by4xx++;
  }

  // Track slow endpoints
  if (responseTime >= THRESHOLDS.SLOW) {
    metrics.slowEndpoints.push({
      endpoint,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 slow requests
    if (metrics.slowEndpoints.length > 100) {
      metrics.slowEndpoints.shift();
    }
  }
}

/**
 * Log performance data
 * @param {Object} data - Performance data
 */
function logPerformance(data) {
  const {
    req,
    res,
    responseTime,
    requestSize,
    responseSize,
    memoryDelta,
    slowThreshold,
    logAll,
  } = data;

  const logData = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    requestSize: `${(requestSize / 1024).toFixed(2)}KB`,
    responseSize: `${(responseSize / 1024).toFixed(2)}KB`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  };

  // Categorize response time
  let category;
  if (responseTime < THRESHOLDS.FAST) category = 'fast';
  else if (responseTime < THRESHOLDS.NORMAL) category = 'normal';
  else if (responseTime < THRESHOLDS.SLOW) category = 'slow';
  else if (responseTime < THRESHOLDS.CRITICAL) category = 'critical';
  else category = 'very_critical';

  // Log based on response time
  if (responseTime >= THRESHOLDS.CRITICAL) {
    logger.error('Very slow request detected', {
      ...logData,
      category,
      memoryDelta,
      threshold: THRESHOLDS.CRITICAL,
    });
  } else if (responseTime >= slowThreshold) {
    logger.warn('Slow request detected', {
      ...logData,
      category,
      memoryDelta,
      threshold: slowThreshold,
    });
  } else if (logAll) {
    logger.logRequest(req, res.statusCode, responseTime);
  }

  // Log metric
  logger.logMetric('api_response_time', responseTime, {
    endpoint: req.path,
    method: req.method,
    statusCode: res.statusCode,
    category,
  });
}

/**
 * Get current metrics
 * @returns {Object} Performance metrics
 */
function getMetrics() {
  return {
    ...metrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset metrics
 */
function resetMetrics() {
  metrics.requests = {
    total: 0,
    byMethod: {},
    byStatus: {},
    byEndpoint: {},
  };
  metrics.responseTimes = {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
    avg: 0,
  };
  metrics.errors = {
    total: 0,
    by5xx: 0,
    by4xx: 0,
  };
  metrics.slowEndpoints = [];

  logger.info('Performance metrics reset');
}

/**
 * Get performance report
 * @returns {Object} Performance report
 */
function getPerformanceReport() {
  const totalRequests = metrics.requests.total;
  const errorRate = totalRequests > 0
    ? ((metrics.errors.total / totalRequests) * 100).toFixed(2)
    : 0;

  // Top 10 slowest endpoints
  const slowestEndpoints = Object.entries(metrics.requests.byEndpoint)
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10);

  // Top 10 most requested endpoints
  const mostRequested = Object.entries(metrics.requests.byEndpoint)
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    summary: {
      totalRequests,
      errorRate: `${errorRate}%`,
      avgResponseTime: `${metrics.responseTimes.avg.toFixed(2)}ms`,
      minResponseTime: `${metrics.responseTimes.min}ms`,
      maxResponseTime: `${metrics.responseTimes.max}ms`,
      uptime: `${(process.uptime() / 3600).toFixed(2)} hours`,
    },
    requests: {
      byMethod: metrics.requests.byMethod,
      byStatus: metrics.requests.byStatus,
    },
    errors: {
      total: metrics.errors.total,
      by5xx: metrics.errors.by5xx,
      by4xx: metrics.errors.by4xx,
      errorRate: `${errorRate}%`,
    },
    performance: {
      slowestEndpoints,
      mostRequested,
      recentSlowRequests: metrics.slowEndpoints.slice(-10),
    },
    memory: process.memoryUsage(),
  };
}

/**
 * Performance report endpoint handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function performanceReportHandler(req, res) {
  try {
    const report = getPerformanceReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Performance report error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate performance report',
      },
    });
  }
}

/**
 * Health check endpoint handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function healthCheckHandler(req, res) {
  const memory = process.memoryUsage();
  const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memory.external / 1024 / 1024).toFixed(2)}MB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
    },
    metrics: {
      totalRequests: metrics.requests.total,
      avgResponseTime: `${metrics.responseTimes.avg.toFixed(2)}ms`,
      errorRate: metrics.requests.total > 0
        ? `${((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)}%`
        : '0%',
    },
  };

  // Check if system is unhealthy
  if (memoryUsagePercent > 90) {
    health.status = 'unhealthy';
    health.warnings = ['High memory usage'];
  }

  if (metrics.responseTimes.avg > THRESHOLDS.CRITICAL) {
    health.status = 'degraded';
    health.warnings = health.warnings || [];
    health.warnings.push('High average response time');
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health,
  });
}

module.exports = {
  performanceMonitoring,
  getMetrics,
  resetMetrics,
  getPerformanceReport,
  performanceReportHandler,
  healthCheckHandler,
  THRESHOLDS,
};
