import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments, type SearchDocument } from '@/lib/upstash/search'
import { semanticSearch } from '@/lib/upstash/vector'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
})

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const q = request.nextUrl.searchParams.get('q')
    const preview = request.nextUrl.searchParams.get('preview') === 'true'
    const type = request.nextUrl.searchParams.get('type') as 'device' | 'article' | 'video' | null

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return NextResponse.json({ results: [], query: '', total: 0 })
    }

    const query = q.trim().slice(0, 200)

    // Run both BM25 text search and semantic vector search in parallel
    const [textResults, semanticResults] = await Promise.all([
      searchDocuments(query, type ?? undefined),
      semanticSearch(query, 10),
    ])

    // Merge + deduplicate by id
    const seen = new Set<string>()
    const merged: SearchDocument[] = []

    // Text results first (exact match priority)
    for (const doc of textResults) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id)
        merged.push(doc)
      }
    }

    // Add semantic results not already included
    for (const sr of semanticResults) {
      if (!seen.has(sr.id)) {
        seen.add(sr.id)
        // Try to find metadata matching the SearchDocument shape
        const doc: SearchDocument = {
          id: sr.id,
          type: (sr.metadata.type as 'device' | 'article' | 'video') ?? 'device',
          title: (sr.metadata.title as string) ?? sr.id,
          description: (sr.metadata.description as string) ?? '',
          url: (sr.metadata.url as string) ?? '',
          imageUrl: (sr.metadata.imageUrl as string) ?? '',
          publishedAt: new Date().toISOString(),
        }
        merged.push(doc)
      }
    }

    // Cap at 20 results
    const results = merged.slice(0, 20)

    if (preview) {
      // Return top 4 per type grouped
      const grouped = {
        devices: results.filter((r) => r.type === 'device').slice(0, 4),
        articles: results.filter((r) => r.type === 'article').slice(0, 4),
        videos: results.filter((r) => r.type === 'video').slice(0, 4),
      }
      const flat = [...grouped.devices, ...grouped.articles, ...grouped.videos]
      return NextResponse.json({ results: flat, query, total: flat.length })
    }

    return NextResponse.json({ results, query, total: results.length })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}