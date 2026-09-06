// Knowledge Graph storage + retrieval (Supabase Postgres).
// ============================================================================
// Graph logic lives here, in the API, per your choice. Vector search (Upstash)
// stays the dense layer; this module handles the typed entity/relation store
// and the 1–2 hop graph traversal that feeds HybridRAG retrieval.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExtractionBatch, KnowledgeEntity, KnowledgeRelation, RelationPredicate } from './types'

interface EntityRow {
  id: string
  entity_type: string
  label: string
  meta: Record<string, unknown>
}

interface RelationRow {
  id: number
  subject_id: string
  predicate: string
  object_id: string
  weight: number
  source: string
}

type DbClient = Pick<SupabaseClient, 'from'>

/** Upsert an extraction batch (entities + relations) into the graph. */
export async function upsertGraphBatch(db: DbClient, batch: ExtractionBatch): Promise<void> {
  if (batch.entities.length === 0 && batch.relations.length === 0) return

  if (batch.entities.length > 0) {
    const entityRows = batch.entities.map((e) => ({
      id: e.id,
      entity_type: e.entity_type,
      label: e.label,
      meta: e.meta ?? {},
    }))
    const { error } = await db.from('entities').upsert(entityRows, { onConflict: 'id' })
    if (error) throw new Error(`entities upsert failed: ${error.message}`)
  }

  if (batch.relations.length > 0) {
    const relRows = batch.relations.map((r) => ({
      subject_id: r.subject_id,
      predicate: r.predicate,
      object_id: r.object_id,
      weight: r.weight ?? 1,
      source: r.source ?? 'kg-extractor',
    }))
    const { error } = await db.from('relations').upsert(relRows, { onConflict: 'subject_id,predicate,object_id' })
    if (error) throw new Error(`relations upsert failed: ${error.message}`)
  }
}

/** Remove all relations + orphaned entities for a given root entity id. */
export async function clearGraphFor(db: DbClient, rootId: string): Promise<void> {
  await db.from('relations').delete().or(`subject_id.eq.${rootId},object_id.eq.${rootId}`)
  // Remove entity nodes that no longer have any relations
  const { error } = await db.from('relations').select('subject_id').limit(1).eq('subject_id', rootId)
  if (error) throw new Error(`relations cleanup failed: ${error.message}`)
  // Note: we keep the root entity row itself (cheap, avoids FK churn)
}

/** Fetch an entity row by id (null if missing). */
export async function getEntity(db: DbClient, id: string): Promise<KnowledgeEntity | null> {
  const { data } = await db.from('entities').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const row = data as unknown as EntityRow
  return { id: row.id, entity_type: row.entity_type as KnowledgeEntity['entity_type'], label: row.label, meta: row.meta }
}

/** Full-text label search across the graph (used to map free-form queries → entities). */
export async function searchEntitiesByLabel(db: DbClient, query: string, limit = 6): Promise<KnowledgeEntity[]> {
  const { data } = await db
    .from('entities')
    .select('*')
    .ilike('label', `%${query}%`)
    .limit(limit)
  if (!data) return []
  return (data as unknown as EntityRow[]).map((r) => ({
    id: r.id,
    entity_type: r.entity_type as KnowledgeEntity['entity_type'],
    label: r.label,
    meta: r.meta,
  }))
}

/** Entity ids that share an entity_type with the given label (multi-word forgiving). */
export async function searchEntityIdsByTerm(db: DbClient, term: string, kind?: string, limit = 8): Promise<string[]> {
  let q = db.from('entities').select('id').ilike('label', `%${term}%`)
  if (kind) q = q.eq('entity_type', kind)
  const { data } = await q.limit(limit)
  if (!data) return []
  return (data as unknown as Array<{ id: string }>).map((r) => r.id)
}

/**
 * 1–2 hop neighborhood retrieval: given a seed entity id, return the adjacent
 * relations and the 2-hop nodes reachable within `depth` (default 2).
 */
export async function getNeighborhood(
  db: DbClient,
  seedId: string,
  depth = 2,
  maxNodes = 14,
): Promise<{
  nodes: KnowledgeEntity[]
  edges: KnowledgeRelation[]
}> {
  const nodes: KnowledgeEntity[] = []
  const edges: KnowledgeRelation[] = []
  const visited = new Set<string>([seedId])
  let frontier = [seedId]

  for (let hop = 0; hop < depth && frontier.length > 0 && nodes.length < maxNodes; hop++) {
    const orFilter = frontier.map((id) => `subject_id.eq.${id}`).join(',')
    const { data, error } = await db
      .from('relations')
      .select('*')
      .or(orFilter)
      .limit(40)
    if (error) break
    const rows = (data ?? []) as unknown as RelationRow[]
    const frontierIds = new Set<string>()

    for (const row of rows) {
      const pair: [string, string] = [row.subject_id, row.object_id]
      for (const nodeId of pair) {
        if (!visited.has(nodeId)) {
          visited.add(nodeId)
          frontierIds.add(nodeId)
        }
      }
      edges.push({
        subject_id: row.subject_id,
        predicate: row.predicate as RelationPredicate,
        object_id: row.object_id,
        weight: row.weight,
        source: row.source,
      })
    }

    // Batch-fetch entity rows for newly discovered ids
    const newIds = [...frontierIds]
    if (newIds.length > 0) {
      const { data: entRows } = await db.from('entities').select('*').in('id', newIds.slice(0, 40))
      if (entRows) {
        for (const r of entRows as unknown as EntityRow[]) {
          nodes.push({
            id: r.id,
            entity_type: r.entity_type as KnowledgeEntity['entity_type'],
            label: r.label,
            meta: r.meta,
          })
        }
      }
    }
    frontier = [...frontierIds]
  }

  return { nodes, edges }
}