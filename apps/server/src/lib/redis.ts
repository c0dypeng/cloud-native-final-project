import { Redis } from "ioredis";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis: Redis = new Redis(REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redis.on("error", (err: Error) => {
  logger.error({ err }, "redis connection error");
});

redis.on("ready", () => {
  logger.info({ url: REDIS_URL.replace(/:[^:@]*@/, ":***@") }, "redis ready");
});

/**
 * Read JSON from cache, returning `null` on miss.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ err, key }, "cacheGet failed");
    return null;
  }
}

/**
 * Write JSON to cache with TTL (seconds). Best-effort — failures are logged
 * but never thrown.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "cacheSet failed");
  }
}

/**
 * Delete one or more cache keys. Used to invalidate stats after report upsert.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, "cacheDel failed");
  }
}

/**
 * Bump a counter under a key with a TTL on first write. Returns the new value,
 * or `Infinity` if redis is unavailable so callers treat it as "limit exceeded"
 * (fail-closed for rate-limiting purposes).
 */
export async function counterIncrWithTtl(
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, ttlSeconds, "NX");
  const results = await multi.exec();
  if (!results || !results[0]) return Number.POSITIVE_INFINITY;
  const [err, value] = results[0];
  if (err) throw err;
  return typeof value === "number" ? value : Number(value);
}

export function statsCacheKey(eventId: string, locale = "zh-TW"): string {
  return `stats:${eventId}:${locale}`;
}

export function statsCacheKeys(eventId: string): string[] {
  return [
    statsCacheKey(eventId, "zh-TW"),
    statsCacheKey(eventId, "en"),
    statsCacheKey(eventId, "ja"),
  ];
}

/**
 * Acquire a Redis-backed distributed lock with TTL. Returns `true` if this
 * caller won the lock, `false` if another pod already holds it. Used to keep
 * the reminder cron singleton across `replicas: N` deployments.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    const res = await redis.set(key, "1", "EX", ttlSeconds, "NX");
    return res === "OK";
  } catch (err) {
    logger.warn({ err, key }, "acquireLock failed; treating as not-acquired");
    return false;
  }
}

export function reminderCounterKey(eventId: string, userId: string): string {
  return `reminder:${eventId}:${userId}`;
}
