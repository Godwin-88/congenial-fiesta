// Import agent public API.
// ============================================================================
// Brain (Groq, zod-gated) + Perception (source adapters) + Action (draft
// upserts, provenance, audit). See docs/phone-database-field-mapping.md.

export * from './types'
export {
  resolveBestMatch,
  extractSpecsFromText,
  type ExtractionFailure,
} from './brain'
export {
  textSpecsSchema,
  TEXT_SPECS_FIELD_DICTIONARY,
  type TextSpecsExtraction,
} from './text-specs'
export {
  normalizeDesign,
  normalizeDisplay,
  normalizeProcessor,
  normalizeMemory,
  normalizeCamera,
  normalizeBattery,
  normalizeConnectivity,
  normalizeNetwork,
  normalizeSoftware,
  normalizeExtraction,
} from './normalize-extract'
export { createMobileApiAdapter, mapMobileApiDevice } from './adapters/mobileapi'
export { createGsmArenaAdapter, parseSpecRows, mapGsmArenaRows } from './adapters/gsmarena'
export { createNanoReviewAdapter } from './adapters/nanoreview'
export { createManufacturerAdapter, pasteMatch, decodePaste, fetchPageText } from './adapters/manufacturer'
export { detectConflicts, flattenSpecs } from './merge'
export { findDuplicates } from './dedupe'
export {
  analyzeYouTubeVideo,
  candidateToSnapshot,
  collectProvidedPaths,
  youtubeWatchUrl,
  YOUTUBE_SOURCE_SLUG,
  YOUTUBE_SOURCE_LABEL,
  type YouTubeDeviceCandidate,
} from './youtube'
export {
  recordManualOverride,
  recordChange,
  getManualOverridePaths,
  upsertProvenance,
} from './provenance'
export {
  searchAllSources,
  fetchSnapshots,
  previewImport,
  applyImport,
  ensureChipset,
  loadActiveSources,
  type ImportPreview,
  type ApplyImportResult,
  type FetchSnapshotsArgs,
  type ExtractionDiagnostics,
  type SourceConfigRow,
} from './run'
