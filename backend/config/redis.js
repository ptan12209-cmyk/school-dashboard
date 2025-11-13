/**
 * Redis Cache Configuration
 * ==========================
 * High-performance caching layer using Redis
 *
 * Features:
 * - Connection management with retry logic
 * - Cache key namespacing
 * - TTL (Time To Live) management
 * - Cache invalidation strategies
 * - Error handling and fallbacks
 *
 * Usage:
 * const cache = require('./config/redis');
 * await cache.set('key', data, 3600); // Cache for 1 hour
 * const data = await cache.get('key');
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Redis configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}`, { delay });
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  lazyConnect: true,
};

/**
 * Create Redis client
 */
let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 * @returns {Promise<Redis>} Redis client instance
 */
async function initializeRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    redisClient = new Redis(redisConfig);

    // Connection event handlers
    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected successfully', {
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (error) => {
      isConnected = false;
      logger.error('Redis connection error', {
        error: error.message,
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', (delay) => {
      logger.info('Redis reconnecting', { delay });
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    // Return null to allow application to continue without cache
    return null;
  }
}

/**
 * Get Redis client
 * @returns {Redis|null} Redis client instance or null
 */
function getClient() {
  return redisClient;
}

/**
 * Check if Redis is connected
 * @returns {boolean} Connection status
 */
function isRedisConnected() {
  return isConnected && redisClient && redisClient.status === 'ready';
}

/**
 * Cache key prefix/namespace
 * Helps organize cache keys and avoid collisions
 */
const CACHE_PREFIX = 'school_dashboard:';

/**
 * Default TTL values (in seconds)
 */
const TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 2 * 60 * 60, // 2 hours
  DAY: 24 * 60 * 60, // 24 hours
  WEEK: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Generate cache key with namespace
 * @param {string} key - Cache key
 * @param {string} namespace - Optional namespace
 * @returns {string} Prefixed cache key
 */
function generateKey(key, namespace = '') {
  return `${CACHE_PREFIX}${namespace ? `${namespace}:` : ''}${key}`;
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @param {string} namespace - Optional namespace
 * @returns {Promise<any>} Cached value or null
 */
async function get(key, namespace = '') {
  if (!isRedisConnected()) {
    logger.debug('Redis not connected, skipping cache get');
    return null;
  }

  try {
    const cacheKey = generateKey(key, namespace);
    const value = await redisClient.get(cacheKey);

    if (value) {
      logger.debug('Cache hit', { key: cacheKey });
      return JSON.parse(value);
    }

    logger.debug('Cache miss', { key: cacheKey });
    return null;
  } catch (error) {
    logger.error('Redis GET error', {
      error: error.message,
      key,
      namespace,
    });
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @param {string} namespace - Optional namespace
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttl = TTL.MEDIUM, namespace = '') {
  if (!isRedisConnected()) {
    logger.debug('Redis not connected, skipping cache set');
    return false;
  }

  try {
    const cacheKey = generateKey(key, namespace);
    const serialized = JSON.stringify(value);

    await redisClient.setex(cacheKey, ttl, serialized);

    logger.debug('Cache set', {
      key: cacheKey,
      ttl,
      size: serialized.length,
    });

    return true;
  } catch (error) {
    logger.error('Redis SET error', {
      error: error.message,
      key,
      namespace,
    });
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @param {string} namespace - Optional namespace
 * @returns {Promise<boolean>} Success status
 */
async function del(key, namespace = '') {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const cacheKey = generateKey(key, namespace);
    await redisClient.del(cacheKey);

    logger.debug('Cache deleted', { key: cacheKey });
    return true;
  } catch (error) {
    logger.error('Redis DEL error', {
      error: error.message,
      key,
      namespace,
    });
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * @param {string} pattern - Key pattern (use * for wildcard)
 * @param {string} namespace - Optional namespace
 * @returns {Promise<number>} Number of keys deleted
 */
async function deletePattern(pattern, namespace = '') {
  if (!isRedisConnected()) {
    return 0;
  }

  try {
    const cachePattern = generateKey(pattern, namespace);
    const keys = await redisClient.keys(cachePattern);

    if (keys.length === 0) {
      return 0;
    }

    await redisClient.del(...keys);

    logger.info('Cache pattern deleted', {
      pattern: cachePattern,
      count: keys.length,
    });

    return keys.length;
  } catch (error) {
    logger.error('Redis DELETE PATTERN error', {
      error: error.message,
      pattern,
      namespace,
    });
    return 0;
  }
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @param {string} namespace - Optional namespace
 * @returns {Promise<boolean>} Existence status
 */
async function exists(key, namespace = '') {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const cacheKey = generateKey(key, namespace);
    const result = await redisClient.exists(cacheKey);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error', {
      error: error.message,
      key,
      namespace,
    });
    return false;
  }
}

/**
 * Get remaining TTL for a key
 * @param {string} key - Cache key
 * @param {string} namespace - Optional namespace
 * @returns {Promise<number>} Remaining TTL in seconds (-2 if not exists, -1 if no expiry)
 */
async function ttl(key, namespace = '') {
  if (!isRedisConnected()) {
    return -2;
  }

  try {
    const cacheKey = generateKey(key, namespace);
    return await redisClient.ttl(cacheKey);
  } catch (error) {
    logger.error('Redis TTL error', {
      error: error.message,
      key,
      namespace,
    });
    return -2;
  }
}

/**
 * Flush all keys in current database
 * USE WITH CAUTION!
 * @returns {Promise<boolean>} Success status
 */
async function flushAll() {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    await redisClient.flushdb();
    logger.warn('Redis database flushed');
    return true;
  } catch (error) {
    logger.error('Redis FLUSH error', { error: error.message });
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
async function getStats() {
  if (!isRedisConnected()) {
    return {
      connected: false,
      keys: 0,
      memory: 0,
    };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbsize();
    const memory = await redisClient.info('memory');

    return {
      connected: true,
      keys: dbSize,
      info,
      memory,
    };
  } catch (error) {
    logger.error('Redis STATS error', { error: error.message });
    return {
      connected: false,
      keys: 0,
      memory: 0,
      error: error.message,
    };
  }
}

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
async function close() {
  if (redisClient) {
    await redisClient.quit();
    isConnected = false;
    logger.info('Redis connection closed');
  }
}

/**
 * Cache invalidation strategies
 */
const invalidate = {
  /**
   * Invalidate user-related cache
   * @param {number} userId - User ID
   */
  user: async (userId) => {
    await deletePattern(`user:${userId}:*`);
    await deletePattern(`student:${userId}:*`);
    await deletePattern(`teacher:${userId}:*`);
  },

  /**
   * Invalidate course-related cache
   * @param {number} courseId - Course ID
   */
  course: async (courseId) => {
    await deletePattern(`course:${courseId}:*`);
    await deletePattern(`grades:course:${courseId}:*`);
  },

  /**
   * Invalidate class-related cache
   * @param {number} classId - Class ID
   */
  class: async (classId) => {
    await deletePattern(`class:${classId}:*`);
  },

  /**
   * Invalidate dashboard cache
   */
  dashboard: async () => {
    await deletePattern('dashboard:*');
  },

  /**
   * Invalidate all analytics cache
   */
  analytics: async () => {
    await deletePattern('analytics:*');
    await deletePattern('dashboard:*');
  },
};

module.exports = {
  initializeRedis,
  getClient,
  isRedisConnected,
  get,
  set,
  del,
  deletePattern,
  exists,
  ttl,
  flushAll,
  getStats,
  close,
  invalidate,
  TTL,
};
