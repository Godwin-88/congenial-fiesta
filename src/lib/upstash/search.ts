import { Search } from '@upstash/search'

if (!process.env.UPSTASH_SEARCH_REST_URL) throw new Error('Missing UPSTASH_SEARCH_REST_URL')
if (!process.env.UPSTASH_SEARCH_REST_TOKEN) throw new Error('Missing UPSTASH_SEARCH_REST_TOKEN')

const searchClient = new Search({
  url: process.env.UPSTASH_SEARCH_REST_URL,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN,
})

// Use a single index for all content types
const searchIndex = searchClient.index<SearchDocumentContent, SearchDocumentMetadata>('fweezytech')

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

// Upsert a document into the search index
export async function indexDocument(doc: SearchDocument): Promise<void> {
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

// Delete a document from search index
export async function removeDocument(id: string): Promise<void> {
  await searchIndex.delete(id)
}

// Full-text + BM25 search across all document types
export async function searchDocuments(
  query: string,
  type?: 'device' | 'article' | 'video'
): Promise<SearchDocument[]> {
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
}

// List a page of ids currently in the Search index (reconciliation).
export async function listIndexIds(limit = 500, cursor?: string): Promise<{ ids: string[]; cursor?: string }> {
  try {
    const { documents, nextCursor } = await searchIndex.range({ cursor: cursor ?? '', limit, prefix: '' })
    return {
      ids: (documents ?? []).map((d) => d.id as string),
      cursor: nextCursor,
    }
  } catch {
    return { ids: [], cursor: undefined }
  }
}

/** Wipe the whole search index (full reconcile — used by reindex-all). */
export async function resetSearchIndex(): Promise<void> {
  await searchIndex.reset()
}

/**
 * Top search queries from Upstash's native query analytics.
 * Hits the REST `/analytics/top` endpoint directly (not exposed by the SDK
 * wrapper). Callers fall back to the first-party SQL `search_queries` table
 * when this fails — the "upstash + supabase merge" your architecture wants.
 */
export async function fetchUpstashTopQueries(limit = 10): Promise<Array<{ query: string; count: number }>> {
  const url = process.env.UPSTASH_SEARCH_REST_URL
  const token = process.env.UPSTASH_SEARCH_REST_TOKEN
  if (!url || !token) return []
  try {
    const res = await fetch(`${url}/analytics/top`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ limit }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    // Response shape: { results: [{ query, count }] } or { queries: [...] }
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown }).results)
        ? (data as { results: Array<{ query?: string; value?: string; count?: number; hits?: number }> }).results
        : Array.isArray((data as { queries?: unknown }).queries)
          ? (data as { queries: Array<{ query?: string; value?: string; count?: number; hits?: number }> }).queries
          : []
    return arr
      .map((r) => ({
        query: String(r.query ?? r.value ?? ''),
        count: Number(r.count ?? r.hits ?? 0),
      }))
      .filter((r) => r.query.length > 0)
      .slice(0, limit)
  } catch {
    return []
  }
}