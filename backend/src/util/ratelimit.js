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

export function ipRateLimit({ max, windowMs, bucket = 'rl' }) {
  return function (request, reply, done) {
    const { allowed, retryAfter } = hitRateLimit(`${bucket}:${request.ip}`, max, windowMs);
    if (!allowed) {
      reply.header('Retry-After', retryAfter).code(429).send({ error: 'too many requests, try again later' });
      return;
    }
    done();
  };
}
