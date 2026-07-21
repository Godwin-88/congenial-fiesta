import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token || url.startsWith('your_') || token.startsWith('your_')) {
  console.warn(
    'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables. ' +
    'Features requiring Redis will fail at runtime.',
  )
}

export const redis = url && token && !url.startsWith('your_') && !token.startsWith('your_')
  ? new Redis({ url, token })
  : (null as unknown as Redis)

export function getRedisOrThrow(): Redis {
  if (!redis) {
    throw new Error(
      'Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables.',
    )
  }
  return redis
}