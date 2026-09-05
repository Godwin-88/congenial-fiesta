import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Whether a real Upstash Redis client has been configured.
 */
export const isRedisConfigured = Boolean(
  url && token && !url.startsWith('your_') && !token.startsWith('your_'),
)

if (!isRedisConfigured) {
  console.warn(
    'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables. ' +
    'Features requiring Redis will fail at runtime.',
  )
}

function nullRedisShim(): Record<string, (...args: unknown[]) => unknown> {
  return {
    // Reads → cache miss (callers fall through to the database)
    get: async () => null,
    mget: async () => [],
    hget: async () => null,
    exists: async () => 0,
    // Writes → silently dropped
    set: async () => null,
    setex: async () => null,
    expire: async () => null,
    del: async () => null,
    hset: async () => null,
    hdel: async () => null,
    incr: async () => 1,
    decr: async () => 0,
    keys: async () => [],
    ttl: async () => -1,
    eval: async () => null,
  }
}

/**
 * Redis client. When Upstash isn't configured this is a safe no-op shim
 * (cache misses + dropped writes) instead of `null`, so code doing
 * `await redis.get(key)` doesn't throw "Cannot read properties of null".
 */
export const redis: Redis = isRedisConfigured
  ? new Redis({ url: url!, token: token! })
  : (nullRedisShim() as unknown as Redis)

export function getRedisOrThrow(): Redis {
  if (!isRedisConfigured) {
    throw new Error(
      'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables.',
    )
  }
  return redis
}

/**
 * Normalize a value read from the cache into a JSON value.
 *
 * `@upstash/redis` enables JSON auto-deserialization by default, so `get`
 * may return either the original JSON string OR an already-parsed object.
 * Callers must handle both — e.g. `JSON.parse(cached)` on the object form
 * coerces it to `"[object Object]"` and throws, which previously caused
 * `getDevice` to return `null` (a 404) whenever a populated cache entry was
 * hit.
 *
 * Returns `null` for values that can't be interpreted as useful JSON so
 * callers fall through to the database instead of failing.
 */
export function deserializeCache<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  // Already parsed by @upstash/redis auto-deserialization
  if (typeof value === 'object') return value as T
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (parsed === null || parsed === undefined) return null
      return parsed as T
    } catch {
      // Corrupt / stale value — caller falls through to the database
      return null
    }
  }
  return null
}