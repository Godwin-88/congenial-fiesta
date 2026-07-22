import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"

function createSafeRatelimit(limiter: ReturnType<typeof Ratelimit.slidingWindow>) {
  if (!redis) {
    // Return a no-op ratelimit that always allows through when Redis isn't configured
    return {
      limit: async (_identifier: string) => ({ success: true, limit: 9999, remaining: 9999, reset: 0 }),
      blockUntil: async (_identifier: string) => ({ success: true, limit: 9999, remaining: 9999, reset: 0 }),
    } as unknown as Ratelimit
  }
  return new Ratelimit({ redis, limiter })
}

export const apiRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(10, "10 s"))

export const formRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(3, "1 m"))

export const outboundRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(20, "1 m"))

export const analyticsRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(60, "1 m"))

export const pdfRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(5, "10 m"))

export const zipRateLimit = createSafeRatelimit(Ratelimit.slidingWindow(5, "10 m"))