import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
};

export const redis = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('[Redis] Publisher connected successfully');
});

redis.on('error', (err) => {
  console.warn(`[Redis] Publisher warning: ${err.message}`);
});

redisSubscriber.on('connect', () => {
  console.log('[Redis] Subscriber connected successfully');
});

export const connectRedis = async (io) => {
  try {
    await redis.connect();
    await redisSubscriber.connect();

    // Subscribe to timetable completion notifications from Python Solver
    await redisSubscriber.subscribe('timetable_channel');

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'timetable_channel') {
        try {
          const data = JSON.parse(message);
          console.log(`[Redis Pub/Sub] Received completion for timetable ${data.timetableId}`);

          // Broadcast to connected Next.js clients via Socket.io
          if (io) {
            io.emit('timetable_generation_completed', data);
          }
        } catch (e) {
          console.error('[Redis Pub/Sub] Error parsing solver message:', e.message);
        }
      }
    });
  } catch (error) {
    console.warn(`[Redis] Initial connect attempt skipped or failed: ${error.message}`);
  }
};
