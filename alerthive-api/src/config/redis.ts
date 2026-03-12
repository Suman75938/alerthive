import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisAvailable = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function connectRedis(url: string): Promise<void> {
  try {
    redisClient = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });

    redisClient.on('error', (err) => {
      if (redisAvailable) {
        logger.warn({ msg: 'Redis connection lost – caching disabled', err: err.message });
      }
      redisAvailable = false;
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      logger.info('✅  Redis connected');
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn({ msg: '⚠️  Redis unavailable – running without cache (demo mode)', err: (err as Error).message });
    redisAvailable = false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisAvailable = false;
    logger.info('Redis disconnected');
  }
}
