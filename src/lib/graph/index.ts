// GraphRAG orchestrator (G-indexing + G-retrieval).
// ============================================================================
// Wires the deterministic KG extraction, Supabase graph store, and the
// content-index-state table together so a single call can keep every layer
// (Search, Vector, KG, index state) in sync with the CMS.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Device, Article } from '@/types/cms'
import { extractDeviceBatch, extractArticleEntities } from './extract'
import { upsertGraphBatch, clearGraphFor, getNeighborhood, searchEntityIdsByTerm } from './store'
import { buildDeviceText, sha256Hex } from '@/lib/search/spec-text'
import type { KnowledgeEntity, KnowledgeRelation } from './types'

type DbClient = Pick<SupabaseClient, 'from'>

async function upsertIndexState(
  db: DbClient,
  id: string,
  contentType: 'device' | 'article' | 'video',
  slug: string,
  hash: string,
): Promise<void> {
  await db.from('content_index_state').upsert(
    { id, content_type: contentType, slug, content_hash: hash, indexed_at: new Date().toISOString() },
    { onConflict: 'id' },
  )
}

/** Index a device into the KG + record its index state (search/vector handled by indexing.ts). */
export async function indexDeviceGraph(db: DbClient, device: Device): Promise<void> {
  const batch = extractDeviceBatch(device)
  const id = `device:${device.slug}`
  await clearGraphFor(db, id)
  await upsertGraphBatch(db, batch)
  await upsertIndexState(db, id, 'device', device.slug, sha256Hex(buildDeviceText(device)))
}

/** Index an article into the KG + record its index state. */
export async function indexArticleGraph(db: DbClient, article: Article): Promise<void> {
  const batch = extractArticleEntities(article)
  const id = `article:${article.slug}`
  await clearGraphFor(db, id)
  await upsertGraphBatch(db, batch)
  await upsertIndexState(db, id, 'article', article.slug, sha256Hex(article.title + (article.excerpt ?? '')))
}

/**
 * HybridRAG retrieval (the book's recommendation — merge vector + graph).
 * 1. Maps the raw query to candidate entities via label search.
 * 2. Expands 1–2 hop neighborhoods around those entities.
 * 3. Returns both the graph blast (nodes/edges) and a compact text rendering;
 *    callers merge with dense vector results for final context.
 */
export async function graphRetrieve(
  db: DbClient,
  query: string,
  opts: { maxNodes?: number; maxEdges?: number } = {},
): Promise<{ nodes: KnowledgeEntity[]; edges: KnowledgeRelation[]; text: string }> {
  const maxNodes = opts.maxNodes ?? 12
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2)

  const seedIds = new Set<string>()
  // Broad label search on the whole query first
  for (const id of await searchEntityIdsByTerm(db, query, undefined, 4)) seedIds.add(id)
  // Then per-term (multi-word queries like "poco f9 pro" match device labels)
  for (const term of terms.slice(0, 4)) {
    for (const id of await searchEntityIdsByTerm(db, term, undefined, 4)) seedIds.add(id)
  }

  const nodes: KnowledgeEntity[] = []
  const edges: KnowledgeRelation[] = []
  const seenNodes = new Set<string>()
  const seenEdges = new Set<string>()

  for (const seed of [...seedIds].slice(0, 4)) {
    if (seenNodes.size >= maxNodes) break
    const { nodes: hopNodes, edges: hopEdges } = await getNeighborhood(db, seed, 2, maxNodes)
    for (const n of hopNodes) {
      if (!seenNodes.has(n.id)) {
        seenNodes.add(n.id)
        nodes.push(n)
      }
    }
    for (const e of hopEdges) {
      const key = `${e.subject_id}->${e.predicate}->${e.object_id}`
      if (!seenEdges.has(key)) {
        seenEdges.add(key)
        edges.push(e)
      }
    }
    if (!seenNodes.has(seed)) {
      seenNodes.add(seed)
    }
  }

  const text = renderGraphText(nodes, edges)
  return { nodes, edges, text }
}

function renderGraphText(nodes: KnowledgeEntity[], edges: KnowledgeRelation[]): string {
  if (nodes.length === 0 && edges.length === 0) return ''
  const lines: string[] = ['## Knowledge Graph Context']
  const nodeLabels = new Map(nodes.map((n) => [n.id, n.label]))
  const addLabel = (id: string): string => nodeLabels.get(id) ?? id
  for (const e of edges.slice(0, 40)) {
    lines.push(`- ${addLabel(e.subject_id)} --[${e.predicate}]--> ${addLabel(e.object_id)}`)
  }
  return lines.join('\n')
}

// Re-export for callers that want storage-only access
export { upsertGraphBatch, clearGraphFor, getNeighborhood, searchEntityIdsByTerm }