import { redis } from '../config/redis.js';

/**
 * Middleware to cache GET request responses in Redis
 * @param {string} prefix - Key namespace (e.g. 'rooms', 'stages', 'courses')
 * @param {number} ttlSeconds - Expiration time in seconds (default: 300s = 5 mins)
 */
export const cacheMiddleware = (prefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if Redis is not connected
    if (!redis || redis.status !== 'ready') {
      return next();
    }

    const cacheKey = `cache:${prefix}:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cachedData));
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json to capture response and write to Redis
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache only successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch((err) => {
            console.warn(`[Cache] Error setting cache for ${cacheKey}: ${err.message}`);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.warn(`[Cache] Error reading from cache: ${error.message}`);
      next();
    }
  };
};

/**
 * Helper to purge cache for a specific namespace on data mutation (Create/Update/Delete)
 * @param {string} prefix - Key namespace to invalidate
 */
export const clearCache = async (prefix) => {
  if (!redis || redis.status !== 'ready') return;

  try {
    const keys = await redis.keys(`cache:${prefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] Invalidation: cleared ${keys.length} keys for prefix "${prefix}"`);
    }
  } catch (error) {
    console.warn(`[Cache] Error invalidating cache for prefix "${prefix}": ${error.message}`);
  }
};
