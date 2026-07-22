declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface RuntimeCachingOptions {
    urlPattern: RegExp
    handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'CacheOnly' | 'NetworkOnly'
    options?: {
      cacheName?: string
      expiration?: {
        maxEntries?: number
        maxAgeSeconds?: number
      }
      cacheableResponse?: {
        statuses?: number[]
      }
      networkTimeoutSeconds?: number
    }
  }

  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    runtimeCaching?: RuntimeCachingOptions[]
    sw?: string
    buildExcludes?: (string | RegExp)[]
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig

  export default withPWA
}