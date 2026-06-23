import { redis, hasRedis } from './redis.js';
import { getClientIp } from './clientip.js';

const buckets = new Map();

function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

export function hitRateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    sweep(now);
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  return {
    allowed: b.count <= max,
    retryAfter: Math.ceil((b.resetAt - now) / 1000),
  };
}

async function hitRedis(key, max, windowMs) {
  const k = `rl:${key}`;
  const ttl = Math.ceil(windowMs / 1000);
  try {
    const count = await redis.incr(k);
    if (count === 1) await redis.expire(k, ttl);
    let retryAfter = ttl;
    if (count > max) {
      const t = await redis.ttl(k);
      if (t > 0) retryAfter = t;
    }
    return { allowed: count <= max, retryAfter };
  } catch {
    return hitRateLimit(key, max, windowMs);
  }
}

export function ipRateLimit({ max, windowMs, bucket = 'rl' }) {
  return async function (request, reply) {
    const key = `${bucket}:${getClientIp(request)}`;
    const { allowed, retryAfter } = hasRedis
      ? await hitRedis(key, max, windowMs)
      : hitRateLimit(key, max, windowMs);
    if (!allowed) {
      reply.header('Retry-After', retryAfter).code(429).send({ error: 'too many requests, try again later' });
      return reply;
    }
  };
}
