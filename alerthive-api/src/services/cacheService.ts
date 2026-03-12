/**
 * cacheService.ts
 * Thin Redis wrapper used by alert/incident services.
 * All methods are no-ops when Redis is unavailable, so the app works without it.
 */
import { getRedisClient, isRedisAvailable } from '../config/redis';
import { logger } from '../utils/logger';

const DEFAULT_TTL = 60; // seconds

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  try {
    const raw = await getRedisClient()!.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.debug({ msg: `[Cache] GET miss for ${key}`, err: (err as Error).message });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient()!.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.debug({ msg: `[Cache] SET failed for ${key}`, err: (err as Error).message });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient()!.del(key);
  } catch (err) {
    logger.debug({ msg: `[Cache] DEL failed for ${key}`, err: (err as Error).message });
  }
}

/** Delete all keys matching a pattern (e.g. "alert:org-1:list:*") */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return;
  const client = getRedisClient()!;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.debug({ msg: `[Cache] Invalidated ${keys.length} keys matching ${pattern}` });
    }
  } catch (err) {
    logger.debug({ msg: `[Cache] Pattern DEL failed for ${pattern}`, err: (err as Error).message });
  }
}

// ── Key builders ──────────────────────────────────────────────────────────────

export const alertKeys = {
  single: (orgId: string, id: string) => `alert:${orgId}:${id}`,
  list: (orgId: string, page: number, pageSize: number, status?: string, priority?: string) =>
    `alert:${orgId}:list:${page}:${pageSize}:${status ?? '*'}:${priority ?? '*'}`,
  listPattern: (orgId: string) => `alert:${orgId}:list:*`,
};

export const incidentKeys = {
  single: (orgId: string, id: string) => `incident:${orgId}:${id}`,
  list: (orgId: string, page: number, pageSize: number, status?: string) =>
    `incident:${orgId}:list:${page}:${pageSize}:${status ?? '*'}`,
  listPattern: (orgId: string) => `incident:${orgId}:list:*`,
};
