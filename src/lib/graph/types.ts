// GraphRAG types (aligned with buildingagents.md Ch.7: G-indexing → G-retrieval → G-generation)
// ============================================================================
// Entity = node (device, article, brand, feature/spec, category...)
// Relation = typed directed triple (subject_id)-[predicate]->(object_id)
// Graph logic lives in the API; storage is Supabase Postgres (entities/relations
// tables from migration 032). The vector layer (Upstash) feeds dense retrieval;
// the KG feeds relational / multi-hop retrieval — merged in HybridRAG.

export type EntityType =
  | 'device'
  | 'article'
  | 'brand'
  | 'feature'
  | 'spec'
  | 'category'
  | 'person'
  | 'video'
  | 'price_tier'

export type RelationPredicate =
  | 'REVIEWS'           // video/article -> device
  | 'HAS_BRAND'         // device -> brand
  | 'HAS_SPEC'          // device -> spec value
  | 'HAS_FEATURE'       // device -> feature
  | 'IN_CATEGORY'       // device -> category
  | 'COMPETES_WITH'     // device -> device
  | 'PRICE_TIER'        // device -> price tier
  | 'MENTIONS'          // article -> device/brand
  | 'RELATED_VIDEO'     // device -> video

export interface KnowledgeEntity {
  id: string              // "device:xiaomi-poco-f9-pro"
  entity_type: EntityType
  label: string
  meta?: Record<string, unknown>
}

export interface KnowledgeRelation {
  subject_id: string
  predicate: RelationPredicate
  object_id: string
  weight?: number
  source?: string
}

// One unti of extracted knowledge from a single document snapshot
export interface ExtractionBatch {
  entities: KnowledgeEntity[]
  relations: KnowledgeRelation[]
}

// Normalize an id fragment (slug-ish) into a stable entity id.
export function entityId(type: EntityType, slug: string): string {
  return `${type}:${slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'}`
}