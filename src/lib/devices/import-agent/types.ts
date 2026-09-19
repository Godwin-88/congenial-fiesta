// Import agent — shared types ("perception" layer of the phone-database agent).
// ============================================================================
// A SourceAdapter is one sense: it knows how to search an external source and
// fetch a device's raw spec payload. Everything above this layer (normalization,
// conflict detection, dedupe, provenance, drafting) is source-agnostic — so a
// source can be replaced without touching the rest of the system (spec §11b).

import type { DeviceSpecs } from '@/lib/devices/spec-schema'

/** A candidate device returned by a source's search. */
export interface SourceMatch {
  externalId: string
  name: string
  brand?: string | null
  releaseYear?: number | null
  modelNumber?: string | null
  region?: string | null
  variantLabel?: string | null
  url?: string | null
  thumbnail?: string | null
  sourceSlug: string
  sourceLabel: string
}

/** Normalized spec snapshot from exactly one source (before merge/conflicts). */
export interface SpecSnapshot {
  match: SourceMatch
  /** Canonical, validated spec sections this source provided. */
  specs: Partial<DeviceSpecs>
  /** Identity fields this source claims. */
  identity: {
    name: string
    brand: string | null
    modelNumber: string | null
    releaseYear: number | null
    variantLabel: string | null
    region: string | null
    tagline: string | null
  }
  raw: unknown
  sourceUrl: string | null
  /** Canonical field paths present — everything else counts as missing (§14). */
  providedPaths: string[]
}

/** A disagreement between sources / existing value for one canonical path. */
export interface SpecConflict {
  path: string
  values: Array<{ sourceSlug: string; sourceLabel: string; value: unknown }>
  /** Whether a stored (existing) value disagrees with every incoming source. */
  involvesExisting: boolean
}

/** Duplicate-detection candidate (§19). */
export interface DuplicateCandidate {
  deviceId: number
  name: string
  slug: string
  brand: string | null
  variantLabel: string | null
  modelNumber: string | null
  status: 'draft' | 'published'
  matchType: 'slug' | 'name' | 'model' | 'semantic'
  score: number // 0..1 confidence
}

/** Adapter contract — the only source-specific code in the system. */
export interface SourceAdapter {
  /** Must equal sources.slug so the registry can bind config + health. */
  slug: string
  label: string
  /** True when the adapter's env credentials are present. */
  isConfigured(): boolean
  search(query: string, limit?: number): Promise<SourceMatch[]>
  fetchSpecs(match: SourceMatch): Promise<SpecSnapshot | null>
}

export interface SourceSearchResult {
  sourceSlug: string
  sourceLabel: string
  matches: SourceMatch[]
  error: string | null
  durationMs: number
}
