import { NextRequest, NextResponse } from 'next/server'
import { hybridCatalogSearch, logSearchQuery } from '@/lib/search/server-search'
import { isRedisConfigured, redis } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Lazy rate limiter: module-level `new Ratelimit({ redis: getRedisOrThrow() })`
// threw at import time when Upstash Redis isn't configured, turning EVERY
// /api/search request into a 500 (the "search isn't working" complaint).
// Now the limiter is built on first use and skipped gracefully when Redis is absent.
let limiter: Ratelimit | null | undefined
function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter
  try {
    if (!isRedisConfigured) {
      limiter = null
      return limiter
    }
    limiter = new Ratelimit({
      redis: redis as never,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
    })
  } catch {
    limiter = null
  }
  return limiter
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit (best-effort — search must work without Redis configured)
    try {
      const rateLimiter = getLimiter()
      if (rateLimiter) {
        const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
        const { success } = await rateLimiter.limit(ip)
        if (!success) {
          return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }
      }
    } catch {
      // rate limiting is non-critical — never fail search over it
    }

    const q = request.nextUrl.searchParams.get('q')
    const preview = request.nextUrl.searchParams.get('preview') === 'true'
    const type = request.nextUrl.searchParams.get('type') as 'device' | 'article' | 'video' | null

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return NextResponse.json({ results: [], query: '', total: 0 })
    }

    const query = q.trim().slice(0, 200)

    // Three-layer hybrid: Postgres full-text (always live) FIRST, then Upstash
    // BM25 + semantic in parallel. The shared helper dedupes, caps at 20 and
    // reports which layers contributed — /search renders whether the catalog
    // itself matched, never a blank "indexes warming" wall.
    const hybrid = await hybridCatalogSearch(query, { type: type ?? undefined, semanticTopK: 10 })
    const results = hybrid.results
    const layers = hybrid.layers

    // Log the search query for first-party "top searches" analytics.
    // Full page-loads only: preview keystrokes would flood search_queries with
    // one row per keystroke and inflate every count on the Search tab.
    if (!preview && query && query.trim().length > 0) {
      void logSearchQuery(query.trim(), results.length).catch(() => {})
    }

    if (preview) {
      // Return top 4 per type grouped
      const grouped = {
        devices: results.filter((r) => r.type === 'device').slice(0, 4),
        articles: results.filter((r) => r.type === 'article').slice(0, 4),
        videos: results.filter((r) => r.type === 'video').slice(0, 4),
      }
      const flat = [...grouped.devices, ...grouped.articles, ...grouped.videos]
      return NextResponse.json({ results: flat, query, total: flat.length, layers })
    }

    return NextResponse.json({ results, query, total: results.length, layers })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}