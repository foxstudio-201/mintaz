import { redis, hasRedis } from './redis.js';

export async function cacheGet(key) {
  if (!hasRedis) return null;
  try {
    const v = await redis.get(key);
    return v == null ? null : JSON.parse(v);
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  if (!hasRedis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    return;
  }
}

export async function cacheDel(key) {
  if (!hasRedis) return;
  try {
    await redis.del(key);
  } catch {
    return;
  }
}
