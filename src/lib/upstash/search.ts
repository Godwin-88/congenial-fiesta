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