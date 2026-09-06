// Knowledge Graph extraction (G-indexing).
// ============================================================================
// Deterministic rule-based extraction from our own structured content (devices,
// articles) builds the bulk of the KG cheaply and reliably. Optional Groq
// structured extraction enriches cross-document relations (COMPETES_WITH,
// article MENTIONS device) where the LLM genuinely adds value. Never throws:
// failures degrade to the rule-based subset.

import type { Device, Article } from '@/types/cms'
import { entityId, type EntityType, type ExtractionBatch, type KnowledgeEntity, type KnowledgeRelation, type RelationPredicate } from './types'
import { buildDeviceText } from '@/lib/search/spec-text'

function makeDeviceEntity(device: Device): KnowledgeEntity {
  return {
    id: entityId('device', device.slug),
    entity_type: 'device',
    label: device.name,
    meta: {
      slug: device.slug,
      url: device.brand?.slug ? `/devices/${device.brand.slug}/${device.slug}` : `/devices/x/${device.slug}`,
      priceKes: device.price_kes,
      score: device.scores_overall,
      status: device.status,
    },
  }
}

// ── Rule-based extraction (device) ─────────────────────────────────────────
export function extractDeviceEntities(device: Device): ExtractionBatch {
  const entities: KnowledgeEntity[] = []
  const relations: KnowledgeRelation[] = []
  const deviceEnt = makeDeviceEntity(device)
  entities.push(deviceEnt)

  // Brand
  if (device.brand?.name) {
    const brandEnt: KnowledgeEntity = {
      id: entityId('brand', device.brand.slug ?? device.brand.name),
      entity_type: 'brand',
      label: device.brand.name,
      meta: { slug: device.brand.slug, url: `/devices/${device.brand.slug}` },
    }
    entities.push(brandEnt)
    relations.push({ subject_id: deviceEnt.id, predicate: 'HAS_BRAND', object_id: brandEnt.id, source: 'rule-device' })
  }

  // Category + price tier
  const category = device.device_type?.label ?? device.major_category
  if (category) {
    const catEnt = { id: entityId('category', category), entity_type: 'category' as EntityType, label: category }
    entities.push(catEnt)
    relations.push({ subject_id: deviceEnt.id, predicate: 'IN_CATEGORY', object_id: catEnt.id, source: 'rule-device' })
  }
  if (device.price_tier) {
    const tierEnt = { id: entityId('price_tier', device.price_tier), entity_type: 'price_tier' as EntityType, label: device.price_tier }
    entities.push(tierEnt)
    relations.push({ subject_id: deviceEnt.id, predicate: 'PRICE_TIER', object_id: tierEnt.id, source: 'rule-device' })
  }
  return { entities, relations }
}

// ── Spec entities + relations ──────────────────────────────────────────────
function extractSpecRelations(device: Device, deviceEnt: KnowledgeEntity, entities: KnowledgeEntity[], relations: KnowledgeRelation[]) {
  const specSections = [
    ['specs_display', 'Display', 'HAS_SPEC'],
    ['specs_processor', 'Processor', 'HAS_SPEC'],
    ['specs_memory', 'Memory', 'HAS_SPEC'],
    ['specs_camera', 'Camera', 'HAS_FEATURE'],
    ['specs_battery', 'Battery', 'HAS_SPEC'],
    ['specs_connectivity', 'Connectivity', 'HAS_SPEC'],
    ['specs_network', 'Network', 'HAS_SPEC'],
    ['specs_software', 'Software', 'HAS_SPEC'],
  ] as const

  for (const [section, sectionLabel, predicate] of specSections) {
    const spec = device[section as keyof Device] as Record<string, unknown> | undefined
    if (!spec || typeof spec !== 'object') continue
    for (const [key, value] of Object.entries(spec)) {
      if (value === null || value === undefined || value === '') continue
      const valueLabel = typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : String(value)
      if (valueLabel.length === 0 || valueLabel.length > 160) continue
      const label = `${sectionLabel} ${key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')} = ${valueLabel}`.slice(0, 200)
      const specEnt: KnowledgeEntity = {
        id: entityId('spec', `${device.slug}-${section}-${key}`),
        entity_type: 'spec',
        label,
        meta: { section, key, value: valueLabel },
      }
      entities.push(specEnt)
      relations.push({
        subject_id: deviceEnt.id,
        predicate: predicate as RelationPredicate,
        object_id: specEnt.id,
        weight: 0.4,
        source: 'rule-device',
      })
    }
  }

  // Verdict
  if (device.verdict_bottom_line) {
    const verdictEnt: KnowledgeEntity = {
      id: entityId('feature', `${device.slug}-verdict`),
      entity_type: 'feature',
      label: `Verdict: ${device.verdict_bottom_line}`.slice(0, 220),
      meta: { kind: 'verdict' },
    }
    entities.push(verdictEnt)
    relations.push({ subject_id: deviceEnt.id, predicate: 'HAS_FEATURE', object_id: verdictEnt.id, source: 'rule-device' })
  }

  // Related video
  if (device.related_video_id) {
    const vidEnt: KnowledgeEntity = {
      id: entityId('video', device.related_video_id),
      entity_type: 'video',
      label: `Video ${device.related_video_id}`,
      meta: { youtubeId: device.related_video_id },
    }
    entities.push(vidEnt)
    relations.push({ subject_id: deviceEnt.id, predicate: 'RELATED_VIDEO', object_id: vidEnt.id, source: 'rule-device' })
  }
}

// Convenience: extract the full device batch (used by store + indexing)
export function extractDeviceBatch(device: Device): ExtractionBatch {
  const { entities, relations } = extractDeviceEntities(device)
  const deviceEnt = entities[0]
  extractSpecRelations(device, deviceEnt, entities, relations)
  return dedupe(entities, relations)
}
// ── Rule-based extraction (article) ────────────────────────────────────────
export function extractArticleEntities(article: Article): ExtractionBatch {
  const entities: KnowledgeEntity[] = []
  const relations: KnowledgeRelation[] = []

  const articleEnt: KnowledgeEntity = {
    id: entityId('article', article.slug),
    entity_type: 'article',
    label: article.title,
    meta: { slug: article.slug, url: `/articles/${article.slug}`, category: article.category },
  }
  entities.push(articleEnt)

  if (article.category) {
    const catEnt = { id: entityId('category', article.category), entity_type: 'category' as EntityType, label: article.category }
    entities.push(catEnt)
    relations.push({ subject_id: articleEnt.id, predicate: 'IN_CATEGORY', object_id: catEnt.id, source: 'rule-article' })
  }

  // Associated device
  if (article.associated_device_id && article.associated_device?.slug) {
    const devEnt: KnowledgeEntity = {
      id: entityId('device', article.associated_device.slug),
      entity_type: 'device',
      label: article.associated_device.name,
      meta: { slug: article.associated_device.slug },
    }
    entities.push(devEnt)
    relations.push({ subject_id: articleEnt.id, predicate: 'MENTIONS', object_id: devEnt.id, source: 'rule-article' })
  }

  return dedupe(entities, relations)
}

function dedupe(entities: KnowledgeEntity[], relations: KnowledgeRelation[]): ExtractionBatch {
  const eMap = new Map<string, KnowledgeEntity>()
  for (const e of entities) if (!eMap.has(e.id)) eMap.set(e.id, e)
  const rMap = new Map<string, KnowledgeRelation>()
  for (const r of relations) {
    const key = `${r.subject_id}->${r.predicate}->${r.object_id}`
    if (!rMap.has(key)) rMap.set(key, r)
  }
  return { entities: [...eMap.values()], relations: [...rMap.values()] }
}

export { buildDeviceText }