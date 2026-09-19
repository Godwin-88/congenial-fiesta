// Import agent deliverable inventory (Phone spec §12–16, §24–25; Ranking §11–17).
// =================================================================================
// Lists the concrete files backing each planned module so reviewers can verify
// coverage against the unified plan without reading the code first.
//
// Phase 3 — Import agent engine (src/lib/devices/import-agent/)
//   .run.ts          — orchestrator/workflow (search → fetch → preview → apply)
//   .brain.ts        — Groq match resolution + free-text spec extraction
//   .merge.ts        — priority merge + conflict detection + manual-override guard
//   .dedupe.ts       — slug / model-number / name-similarity duplicate detection
//   .provenance.ts   — device_spec_sources / device_source_raw_data / device_changes
//   .types.ts        — SourceMatch, SpecSnapshot, SpecConflict, DuplicateCandidate, SourceAdapter
//   .index.ts        — public re-export surface
//   adapters/
//     .mobileapi.ts  — MobileAPI.dev full adapter (search + fetchSpecs, 9 sections)
//     .gsmarena.ts   — GSMArena self-contained HTML parser
//     .manufacturer.ts — paste / URL mode
//     .nanoreview.ts — chipset benchmark enrichment only
//
// Phase 4 — Ranking engine (src/lib/ranking/)
//   .config.ts       — FTS-1.0 factor tables + thresholds
//   .formula.ts      — Build / Display / Performance / Cameras / Battery scorers + proration
//   .benchmarks.ts   — median chipset benchmark aggregation
//   .engine.ts       — computeRanking, recalculateDevice, refreshAutoBenchmarks, isRankingRelevantChange
//
// Phase 2 — Canonical spec schema + normalization
//   .spec-schema.ts      — zod section schemas + validateSpecs gate
//   .spec-normalize.ts   — pure parsers (never invent, never throw)
//
// Phase 5+6 — admin API routes + admin UI panels
//   api/admin/devices/import/{search,specs,apply}
//   api/admin/sources[/id]
//   api/admin/ranking/{recalculate,benchmarks,breakdown/[id]}
//   api/admin/devices/[id]/provenance
//   components/admin/{SpecImportPanel,RankingBreakdownPanel,ProvenancePanel}
//   form-mapping.ts    — canonical specs → admin form prefill
//   audit.ts          — device_changes helper + recalc hooks on POST/PATCH
//   source-config.ts  — shared constants mirroring migration 042 CHECK constraints
//   docs/phone-database-field-mapping.md — Phase 0 field-mapping + ranking-relevant extract map
