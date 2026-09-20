import { Search } from '@upstash/search'

function getSearchClient(): Search | null {
  const url = process.env.UPSTASH_SEARCH_REST_URL
  const token = process.env.UPSTASH_SEARCH_REST_TOKEN
  if (!url || !token) return null
  try {
    return new Search({ url, token })
  } catch {
    return null
  }
}

// Use a single index for all content types (created lazily so missing env
// degrades to the Postgres fallback instead of crashing the process).
function getSearchIndex() {
  const client = getSearchClient()
  return client ? client.index<SearchDocumentContent, SearchDocumentMetadata>('fweezytech') : null
}

/** Whether the Upstash BM25 index is reachable from this runtime. */
export function isSearchConfigured(): boolean {
  return getSearchClient() !== null
}

// Document shape indexed into Upstash Search
export type SearchDocument = {
  id: string              // e.g. "device:galaxy-s25-ultra" | "article:best-phones-2025"
  type: 'device' | 'article' | 'video'
  title: string
  description: string     // tagline for devices, excerpt for articles, title for videos
  url: string             // internal site URL
  imageUrl: string        // thumbnail
  brand?: string          // devices only
  category?: string       // devices + articles
  score?: number          // Fweezy Score — devices only
  publishedAt: string     // ISO date string
}

type SearchDocumentContent = {
  title: string
  description: string
  brand: string
  category: string
}

type SearchDocumentMetadata = Omit<SearchDocument, 'id'>

// Upsert a document into the search index (no-op when unconfigured — the
// Postgres full-text fallback carries search until Upstash is wired).
export async function indexDocument(doc: SearchDocument): Promise<void> {
  const searchIndex = getSearchIndex()
  if (!searchIndex) return
  await searchIndex.upsert({
    id: doc.id,
    content: {
      title: doc.title,
      description: doc.description,
      brand: doc.brand ?? '',
      category: doc.category ?? '',
    },
    metadata: {
      type: doc.type,
      title: doc.title,
      description: doc.description,
      url: doc.url,
      imageUrl: doc.imageUrl,
      brand: doc.brand,
      category: doc.category,
      score: doc.score,
      publishedAt: doc.publishedAt,
    },
  })
}

// Delete a document from search index (no-op when unconfigured)
export async function removeDocument(id: string): Promise<void> {
  const searchIndex = getSearchIndex()
  if (!searchIndex) return
  await searchIndex.delete(id)
}

// Full-text + BM25 search across all document types.
// Returns [] when Upstash is unconfigured or errors — callers fall back to the
// Postgres full-text path (`fallbackCatalogSearch`) so search never 500s.
export async function searchDocuments(
  query: string,
  type?: 'device' | 'article' | 'video'
): Promise<SearchDocument[]> {
  const searchIndex = getSearchIndex()
  if (!searchIndex) return []
  try {
    const results = await searchIndex.search({
      query,
      limit: 20,
      filter: type ? `type = '${type}'` : undefined,
    })
    return results.map((r) => {
      const meta = r.metadata as SearchDocumentMetadata
      return {
        id: r.id,
        type: meta.type,
        title: meta.title,
        description: meta.description,
        url: meta.url,
        imageUrl: meta.imageUrl,
        brand: meta.brand,
        category: meta.category,
        score: meta.score,
        publishedAt: meta.publishedAt,
      }
    })
  } catch {
    return []
  }
}

// List a page of ids currently in the Search index (reconciliation).
// No-op (empty page) when unconfigured so reindex-all keeps working on Postgres.
//
// NOTE: the Upstash `range` endpoint caps a page at 100 documents. Passing a
// larger limit does not error — it returns an EMPTY page, which reads as "the
// index is empty" and silently breaks any coverage/reconciliation accounting.
// The clamp keeps that failure mode out of every caller.
const MAX_INDEX_PAGE = 100

export async function listIndexIds(limit = MAX_INDEX_PAGE, cursor?: string): Promise<{ ids: string[]; cursor?: string }> {
  const searchIndex = getSearchIndex()
  if (!searchIndex) return { ids: [], cursor: undefined }
  try {
    const { documents, nextCursor } = await searchIndex.range({
      cursor: cursor ?? '',
      limit: Math.min(limit, MAX_INDEX_PAGE),
      prefix: '',
    })
    return {
      ids: (documents ?? []).map((d) => d.id as string),
      cursor: nextCursor,
    }
  } catch {
    return { ids: [], cursor: undefined }
  }
}

/** Wipe the whole search index (full reconcile — used by reindex-all; no-op when unconfigured). */
export async function resetSearchIndex(): Promise<void> {
  const searchIndex = getSearchIndex()
  if (!searchIndex) return
  await searchIndex.reset()
}

/**
 * Upstash-side query volume — used to reconcile against our first-party log.
 *
 * NOTE (verified live 2026-09): Upstash Search has NO top-queries endpoint —
 * POST|GET {rest}/analytics/top returns 404 "Endpoint not found", and the SDK
 * exposes no analytics. The supported source is the account Developer API
 * (`/v2/search/{id}/stats`), which reports query COUNTS and latency, not the
 * query text. So:
 *   • WHAT was searched  → first-party `search_queries` table (always)
 *   • HOW MANY queries executed + latency → this account-API telemetry
 *
 * Kept for backward compatibility with getTopSearchQueries: returns [] when the
 * account telemetry is unavailable, so callers fall back to first-party data.
 */
export async function fetchUpstashTopQueries(limit = 10): Promise<Array<{ query: string; count: number }>> {
  // There is no Upstash source for per-query text. Returning [] is the honest
  // answer and routes callers to the first-party table — do not fabricate.
  void limit
  return []
}