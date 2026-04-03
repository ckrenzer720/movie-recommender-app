/**
 * Production-ready(ish) rate limiting with optional Redis backing.
 *
 * - If REDIS_URL is set and Redis is reachable, counters are shared across instances.
 * - Otherwise, falls back to in-memory counters (single-process).
 *
 * Fixed window algorithm:
 * - Key is bucketed by floor(now / windowMs)
 * - Counter is incremented per bucket
 */

let Redis = null;
try {
  // Optional dependency: only required when REDIS_URL is set.
  // eslint-disable-next-line global-require
  Redis = require('redis');
} catch (_) {
  Redis = null;
}

function isRedisEnabled() {
  return Boolean(process.env.REDIS_URL);
}

function createMemoryStore() {
  const map = new Map();

  return {
    async incr({ key, windowMs }) {
      const now = Date.now();
      const entry = map.get(key);
      if (!entry || entry.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return { count: 1, resetAt: now + windowMs };
      }
      entry.count += 1;
      return { count: entry.count, resetAt: entry.resetAt };
    },
    cleanup() {
      const now = Date.now();
      for (const [k, entry] of map.entries()) {
        if (!entry || entry.resetAt <= now) map.delete(k);
      }
    }
  };
}

async function createRedisStore() {
  if (!Redis) throw new Error('redis package not installed');
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL missing');

  const client = Redis.createClient({ url });
  client.on('error', () => {
    // Keep errors silent here; caller decides fallback behavior.
  });
  await client.connect();

  // Lua script: INCR then set PEXPIRE only when key is new.
  // Returns {count, ttlMs}
  const script = `
    local c = redis.call('INCR', KEYS[1])
    if c == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return {c, ttl}
  `;

  return {
    async incr({ key, windowMs }) {
      const res = await client.eval(script, {
        keys: [key],
        arguments: [String(windowMs)]
      });
      const count = Array.isArray(res) ? Number(res[0]) : Number(res);
      const ttlMs = Array.isArray(res) ? Number(res[1]) : windowMs;
      const resetAt = Date.now() + (Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs);
      return { count, resetAt };
    },
    cleanup() {},
    async close() {
      try { await client.quit(); } catch (_) {}
    }
  };
}

async function createRateLimiter() {
  const memory = createMemoryStore();

  let store = memory;
  if (isRedisEnabled()) {
    try {
      store = await createRedisStore();
    } catch (_) {
      store = memory;
    }
  }

  // Only memory store needs cleanup; Redis keys expire automatically.
  if (store === memory) {
    setInterval(() => memory.cleanup(), 5 * 60 * 1000).unref?.();
  }

  function rateLimit({ windowMs, max, keyFn, message, prefix }) {
    const win = Number(windowMs) || 60000;
    const limit = Number(max) || 60;
    const getKey = typeof keyFn === 'function' ? keyFn : (req) => req.ip;
    const msg = message || 'Too many requests. Try again soon.';
    const pfx = prefix || 'rl';

    return async function rateLimitMiddleware(req, res, next) {
      try {
        const now = Date.now();
        const bucket = Math.floor(now / win);
        const raw = String(getKey(req) || req.ip || 'unknown');
        const key = `${pfx}:${bucket}:${raw}`;

        const { count, resetAt } = await store.incr({ key, windowMs: win });
        if (count <= limit) return next();

        const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
        res.set('Retry-After', String(retryAfterSec));
        return res.status(429).json({ error: msg, retryAfterSec });
      } catch (err) {
        return next();
      }
    };
  }

  return { rateLimit };
}

module.exports = { createRateLimiter };

