// Source registry constants (Phone Database §11).
// ============================================================================
// Shared by the admin sources API/UI and the import agent. Values mirror the
// CHECK constraints in migration 042 — keep them in sync.

/** Allowed sources.source_type values (migration 042 CHECK). */
export const sourceTypes = ['manufacturer', 'spec-api', 'aggregator', 'benchmark', 'manual'] as const

/** Allowed sources.auth_type values (migration 042 CHECK). */
export const authTypes = ['none', 'bearer', 'query', 'basic'] as const

/**
 * Adapter names that the import agent can bind to a source row. These must
 * match the keys of ADAPTER_FACTORIES in src/lib/devices/import-agent/run.ts.
 * A source with a null adapter_name is stored/configurable but not queried.
 */
export const adapterNames = ['mobileapi', 'gsmarena', 'nanoreview', 'manufacturer'] as const

/** Human-readable labels for the admin source editor. */
export const adapterLabels: Record<string, string> = {
  mobileapi: 'MobileAPI (spec API)',
  gsmarena: 'GSMArena (aggregator)',
  nanoreview: 'NanoReview (chipset benchmarks)',
  manufacturer: 'Manufacturer page / pasted spec sheet',
}

/** Default priority per source type — lower runs (and wins) first (§11a). */
export const defaultPriority: Record<string, number> = {
  manufacturer: 10,
  'spec-api': 20,
  aggregator: 40,
  benchmark: 60,
  manual: 90,
}

export type SourceType = (typeof sourceTypes)[number]
export type AuthType = (typeof authTypes)[number]
export type AdapterName = (typeof adapterNames)[number]