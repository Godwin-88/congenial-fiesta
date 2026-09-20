// Shared server-side hybrid search — one implementation for /api/search AND
// /search (server-component), so the dropdown, the page and the analytics logs
// can never disagree about what "search" found.
//
// Layers (in priority order):
//   1. Postgres full-text — devices (name/tagline + search_vector) + articles
//      (title/excerpt) + videos (title). Always live, no env needed.
//   2. Upstash BM25 (`searchDocuments`) — exact-match priority when configured.
//   3. Upstash semantic (`semanticSearch`) — synonym/spec intent when configured.
//
// Merge order: Postgres → BM25 → semantic, deduplicated by id, capped at 20.
// `layers` reports which engines contributed so the UI can say "catalog matched"
// vs "index warming" honestly.
import { createClient } from '@supabase/supabase-js'
import { searchDocuments, isSearchConfigured, type SearchDocument } from '@/lib/upstash/search'
import { semanticSearch, isVectorConfigured } from '@/lib/upstash/vector'

export type SearchLayer = 'postgres' | 'upstash' | 'semantic'

export interface HybridSearchResult {
  results: SearchDocument[]
  layers: SearchLayer[]
}

type HybridOpts = {
  type?: 'device' | 'article' | 'video'
  semanticTopK?: number
  limit?: number
}

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

function firstImageUrl(images: unknown): string {
  if (!Array.isArray(images)) return ''
  const first = images[0] as { url?: unknown } | undefined
  return typeof first?.url === 'string' ? first.url : ''
}


/**
 * Postgres full-text fallback — the catalog answering for itself.
 * Full-text ranked first, ilike as the recall net for short queries.
 * Never throws: returns [] on any error so Upstash layers still get a chance.
 */
export async function fallbackCatalogSearch(
  rawQuery: string,
  type?: 'device' | 'article' | 'video',
): Promise<SearchDocument[]> {
  const query = rawQuery.trim().slice(0, 200)
  if (query.length === 0) return []
  const supabase = supabaseServer()
  if (!supabase) return []
  try {
    const like = `%${query}%`
    const out: SearchDocument[] = []

    if (!type || type === 'device') {
      const fts = await supabase
        .from('devices')
        .select('slug, name, tagline, scores_overall, images, brand:brands(name, slug)')
        .eq('status', 'published')
        .textSearch('search_vector', query.split(/\s+/).join(' & '), { type: 'plain', config: 'english' })
        .limit(10)
      let deviceRows = fts.data ?? []
      if (deviceRows.length === 0 || query.length <= 3) {
        const ilikeRes = await supabase
          .from('devices')
          .select('slug, name, tagline, scores_overall, images, brand:brands(name, slug)')
          .eq('status', 'published')
          .or(`name.ilike.${like},tagline.ilike.${like}`)
          .limit(10)
        const seen = new Set(deviceRows.map((d) => d.slug))
        for (const row of ilikeRes.data ?? []) {
          if (!seen.has(row.slug)) {
            seen.add(row.slug)
            deviceRows = [...deviceRows, row]
          }
        }
      }
      for (const row of deviceRows.slice(0, 10)) {
        const brand = row.brand as { name?: string; slug?: string } | null
        out.push({
          id: `device:${row.slug}`,
          type: 'device',
          title: row.name,
          description: row.tagline ?? '',
          url: `/devices/${brand?.slug ?? 'brand'}/${row.slug}`,
          imageUrl: firstImageUrl(row.images),
          brand: brand?.name ?? undefined,
          score: row.scores_overall ?? undefined,
          publishedAt: new Date().toISOString(),
        })
      }
    }

    if (!type || type === 'article') {
      const { data } = await supabase
        .from('articles')
        .select('slug, title, excerpt, featured_image, category')
        .eq('status', 'published')
        .or(`title.ilike.${like},excerpt.ilike.${like}`)
        .limit(6)
      for (const row of data ?? []) {
        out.push({
          id: `article:${row.slug}`,
          type: 'article',
          title: row.title,
          description: row.excerpt ?? '',
          url: `/articles/${row.slug}`,
          imageUrl: row.featured_image ?? '',
          category: row.category ?? undefined,
          publishedAt: new Date().toISOString(),
        })
      }
    }

    if (!type || type === 'video') {
      const { data } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, published_at')
        .or(`title.ilike.${like}`)
        .limit(6)
      for (const row of data ?? []) {
        out.push({
          id: `video:${row.id}`,
          type: 'video',
          title: row.title,
          description: row.title,
          url: `/videos#${row.id}`,
          imageUrl: row.thumbnail_url ?? '',
          publishedAt: row.published_at ?? new Date().toISOString(),
        })
      }
    }

    return out
  } catch {
    return []
  }
}

/** Merge + dedupe by id, preserving priority order, capped at `limit`. */
function mergeResults(lists: SearchDocument[][], limit: number): SearchDocument[] {
  const seen = new Set<string>()
  const merged: SearchDocument[] = []
  for (const list of lists) {
    for (const doc of list) {
      if (seen.has(doc.id)) continue
      seen.add(doc.id)
      merged.push(doc)
      if (merged.length >= limit) return merged
    }
  }
  return merged
}

/** Full hybrid: Postgres + (Upstash BM25, semantic) when configured. */
export async function hybridCatalogSearch(rawQuery: string, opts: HybridOpts = {}): Promise<HybridSearchResult> {
  const query = rawQuery.trim().slice(0, 200)
  const limit = opts.limit ?? 20
  if (query.length === 0) return { results: [], layers: [] }

  const wantUpstash = isSearchConfigured()
  const wantSemantic = isVectorConfigured()

  const [pgResults, textResults, semanticResults] = await Promise.all([
    fallbackCatalogSearch(query, opts.type),
    wantUpstash ? searchDocuments(query, opts.type).catch(() => [] as SearchDocument[]) : Promise.resolve([] as SearchDocument[]),
    wantSemantic ? semanticSearch(query, opts.semanticTopK ?? 8).catch(() => []) : Promise.resolve([] as Array<{ id: string; metadata: Record<string, unknown> }>),
  ])

  const semanticDocs: SearchDocument[] = semanticResults.map((sr) => {
    const t = sr.metadata.type as string
    return {
      id: sr.id,
      type: (t === 'article' || t === 'video' ? t : 'device') as 'device' | 'article' | 'video',
      title: (sr.metadata.title as string) ?? sr.id,
      description: (sr.metadata.description as string) ?? '',
      url: (sr.metadata.url as string) ?? '',
      imageUrl: (sr.metadata.imageUrl as string) ?? '',
      brand: (sr.metadata.brand as string) ?? undefined,
      category: (sr.metadata.category as string) ?? undefined,
      publishedAt: new Date().toISOString(),
    }
  })

  const lists: SearchDocument[][] = opts.type
    ? [pgResults.filter((d) => d.type === opts.type), textResults, semanticDocs.filter((d) => d.type === opts.type)]
    : [pgResults, textResults, semanticDocs]
  const results = mergeResults(lists, limit)

  const layers: SearchLayer[] = []
  if (pgResults.length > 0) layers.push('postgres')
  if (textResults.length > 0) layers.push('upstash')
  if (semanticDocs.length > 0) layers.push('semantic')
  return { results, layers }
}

/**
 * First-party search logging — one row per committed search.
 * Callers pass the final (merged) result count so `zero_result` is honest
 * across all three layers, not just whichever engine answered first.
 * Never throws; analytics must not break search.
 */
export async function logSearchQuery(query: string, resultsCount: number): Promise<void> {
  try {
    const q = query.trim().slice(0, 200)
    if (q.length === 0) return
    const supabase = supabaseServer()
    if (!supabase) return
    await supabase.from('search_queries').insert({
      query: q,
      results_count: resultsCount,
      zero_result: resultsCount === 0,
    })
  } catch {
    // ignore logging failures
  }
}

/** Whether any remote search layer is configured (for honest empty-states). */
export function remoteSearchConfigured(): boolean {
  return isSearchConfigured() || isVectorConfigured()
}

