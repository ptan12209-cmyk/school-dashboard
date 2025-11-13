/**
 * Cache Middleware
 * ================
 * Express middleware for caching API responses
 *
 * Features:
 * - Automatic response caching
 * - User-specific cache keys
 * - Role-based caching
 * - Cache bypassing options
 * - Custom TTL per route
 *
 * Usage:
 * router.get('/users', cacheMiddleware(300), controller.getUsers);
 * router.get('/dashboard', cacheMiddleware(TTL.MEDIUM, 'user'), controller.getDashboard);
 */

const cache = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {string} keyStrategy - Cache key strategy ('global', 'user', 'role')
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = cache.TTL.MEDIUM, keyStrategy = 'global', options = {}) {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if requested
    if (req.query.nocache === 'true' || req.headers['cache-control'] === 'no-cache') {
      logger.debug('Cache bypassed', { path: req.path });
      return next();
    }

    // Skip cache if Redis is not connected
    if (!cache.isRedisConnected()) {
      return next();
    }

    try {
      // Generate cache key based on strategy
      const cacheKey = generateCacheKey(req, keyStrategy);

      // Try to get from cache
      const cachedResponse = await cache.get(cacheKey, 'api');

      if (cachedResponse) {
        logger.debug('Serving from cache', {
          key: cacheKey,
          path: req.path,
        });

        // Send cached response
        return res.status(200).json({
          ...cachedResponse,
          _cached: true,
          _cacheKey: cacheKey,
        });
      }

      // Cache miss - intercept response
      const originalJson = res.json.bind(res);

      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Don't include cache metadata in stored response
          const dataToCache = { ...body };
          delete dataToCache._cached;
          delete dataToCache._cacheKey;

          cache.set(cacheKey, dataToCache, ttl, 'api')
            .then(() => {
              logger.debug('Response cached', {
                key: cacheKey,
                path: req.path,
                ttl,
              });
            })
            .catch((error) => {
              logger.error('Cache set failed', {
                error: error.message,
                key: cacheKey,
              });
            });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error: error.message,
        path: req.path,
      });
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate cache key based on request and strategy
 * @param {Object} req - Express request
 * @param {string} strategy - Cache key strategy
 * @returns {string} Cache key
 */
function generateCacheKey(req, strategy) {
  const baseKey = `${req.method}:${req.path}`;

  // Include query parameters in key
  const queryString = Object.keys(req.query)
    .sort()
    .filter(key => key !== 'nocache') // Exclude nocache parameter
    .map(key => `${key}=${req.query[key]}`)
    .join('&');

  const queryKey = queryString ? `:${queryString}` : '';

  switch (strategy) {
    case 'user':
      // Cache per user
      return `${baseKey}:user:${req.user?.id || 'anonymous'}${queryKey}`;

    case 'role':
      // Cache per role
      return `${baseKey}:role:${req.user?.role || 'guest'}${queryKey}`;

    case 'global':
    default:
      // Global cache (same for all users)
      return `${baseKey}${queryKey}`;
  }
}

/**
 * Cache invalidation middleware
 * Automatically invalidate cache after write operations
 * @param {string|Function} invalidationPattern - Pattern or function to generate pattern
 * @returns {Function} Express middleware
 */
function cacheInvalidation(invalidationPattern) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Only invalidate on successful write operations
      if (
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
        res.statusCode >= 200 &&
        res.statusCode < 300
      ) {
        try {
          // Generate pattern from function or use string
          const pattern = typeof invalidationPattern === 'function'
            ? invalidationPattern(req, res, body)
            : invalidationPattern;

          if (pattern) {
            await cache.deletePattern(pattern, 'api');
            logger.debug('Cache invalidated', {
              pattern,
              method: req.method,
              path: req.path,
            });
          }
        } catch (error) {
          logger.error('Cache invalidation failed', {
            error: error.message,
            path: req.path,
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Specific cache invalidation helpers
 */
const invalidate = {
  /**
   * Invalidate user-specific cache
   */
  user: (userId) => cacheInvalidation((req) => `*:user:${userId || req.params.id || req.user?.id}*`),

  /**
   * Invalidate course cache
   */
  course: (courseId) => cacheInvalidation((req) => `*course*${courseId || req.params.id || req.params.courseId}*`),

  /**
   * Invalidate class cache
   */
  class: (classId) => cacheInvalidation((req) => `*class*${classId || req.params.id || req.params.classId}*`),

  /**
   * Invalidate dashboard cache
   */
  dashboard: () => cacheInvalidation('*dashboard*'),

  /**
   * Invalidate all API cache
   */
  all: () => cacheInvalidation('*'),
};

/**
 * Cache warming - preload frequently accessed data
 * @param {Array} routes - Routes to warm up
 * @returns {Promise<void>}
 */
async function warmCache(routes) {
  logger.info('Starting cache warm-up', { routes: routes.length });

  for (const route of routes) {
    try {
      const { key, data, ttl, namespace } = route;
      await cache.set(key, data, ttl, namespace || 'api');
      logger.debug('Cache warmed', { key });
    } catch (error) {
      logger.error('Cache warm-up failed', {
        error: error.message,
        route,
      });
    }
  }

  logger.info('Cache warm-up completed');
}

/**
 * Cache statistics endpoint handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function cacheStatsHandler(req, res) {
  try {
    const stats = await cache.getStats();

    // Get API cache keys count
    const apiKeys = await cache.getClient()?.keys(`${cache.generateKey('*', 'api')}`);

    res.json({
      success: true,
      data: {
        connected: cache.isRedisConnected(),
        totalKeys: stats.keys,
        apiCacheKeys: apiKeys ? apiKeys.length : 0,
        ...stats,
      },
    });
  } catch (error) {
    logger.error('Cache stats error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve cache statistics',
      },
    });
  }
}

/**
 * Cache clear endpoint handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function cacheClearHandler(req, res) {
  try {
    const { pattern } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Pattern is required',
        },
      });
    }

    const count = await cache.deletePattern(pattern, 'api');

    logger.info('Cache cleared via API', {
      pattern,
      count,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: {
        pattern,
        keysDeleted: count,
      },
    });
  } catch (error) {
    logger.error('Cache clear error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear cache',
      },
    });
  }
}

module.exports = {
  cacheMiddleware,
  cacheInvalidation,
  invalidate,
  warmCache,
  cacheStatsHandler,
  cacheClearHandler,
};
