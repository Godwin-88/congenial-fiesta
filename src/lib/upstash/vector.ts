import { Index } from '@upstash/vector'

if (!process.env.UPSTASH_VECTOR_REST_URL) throw new Error('Missing UPSTASH_VECTOR_REST_URL')
if (!process.env.UPSTASH_VECTOR_REST_TOKEN) throw new Error('Missing UPSTASH_VECTOR_REST_TOKEN')

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
})

// Upsert a document into the vector index for semantic search
// If UPSTASH_VECTOR_EMBEDDING_MODEL=auto, Upstash handles embedding generation
// If UPSTASH_VECTOR_EMBEDDING_MODEL=openai, caller must provide the vector
export async function upsertVector(params: {
  id: string
  text: string            // raw text to embed (used when model=auto)
  vector?: number[]       // pre-computed vector (used when model=openai)
  metadata: Record<string, unknown>
}): Promise<void> {
  const useAuto = process.env.UPSTASH_VECTOR_EMBEDDING_MODEL === 'auto'
  if (useAuto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await vectorIndex.upsert({ id: params.id, data: params.text, metadata: params.metadata } as any)
  } else {
    if (!params.vector) throw new Error('vector required when embedding model is not auto')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await vectorIndex.upsert({ id: params.id, vector: params.vector, metadata: params.metadata } as any)
  }
}

// Semantic similarity search
export async function semanticSearch(
  query: string,
  topK: number = 5
): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
  const useAuto = process.env.UPSTASH_VECTOR_EMBEDDING_MODEL === 'auto'
  const results = useAuto
    ? await vectorIndex.query({ data: query, topK, includeMetadata: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await vectorIndex.query({ vector: await getEmbedding(query), topK, includeMetadata: true } as any)
  return results.map(r => ({ id: r.id as string, score: r.score, metadata: r.metadata as Record<string, unknown> }))
}

// OpenAI embedding fallback (only called when model=openai)
async function getEmbedding(text: string): Promise<number[]> {
  const { OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return response.data[0].embedding
}