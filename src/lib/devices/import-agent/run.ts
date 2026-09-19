// Import agent orchestrator (Phone spec §12–16, §24–25).
// ============================================================================
// Pipeline:  sources.search → (brain resolves match) → adapter.fetchSpecs
//   → canonical normalization (adapters) → merge + conflict detection
//   → duplicate detection → DRAFT upsert (never auto-publish)
//   → provenance + raw data + import_runs + agent_run_log.
//
// The orchestrator is deterministic: the LLM only disambiguates identity, and
// every value written to the DB passes through the zod spec-schema gate.

import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/devices/import'
import { logAgentRun } from '@/lib/devices/import'
import { validateSpecs, type DeviceSpecs } from '@/lib/devices/spec-schema'
import { createMobileApiAdapter } from './adapters/mobileapi'
import { createGsmArenaAdapter } from './adapters/gsmarena'
import { createManufacturerAdapter, pasteMatch } from './adapters/manufacturer'
import { createNanoReviewAdapter } from './adapters/nanoreview'
import { extractSpecsFromText, resolveBestMatch } from './brain'
import { normalizeExtraction } from './normalize-extract'
import { findDuplicates } from './dedupe'
import { detectConflicts, flattenSpecs } from './merge'
import {
  recordChange,
  resolveSourceId,
  saveRawSourceData,
  getManualOverridePaths,
  upsertProvenance,
} from './provenance'
import type { SourceAdapter, SourceMatch, SourceSearchResult, SpecSnapshot, SpecConflict, DuplicateCandidate } from './types'

// ── Adapter registry (bound to the `sources` table config) ───────────────────

const ADAPTER_FACTORIES: Record<string, () => SourceAdapter> = {
  mobileapi: createMobileApiAdapter,
  gsmarena: createGsmArenaAdapter,
  manufacturer: createManufacturerAdapter,
}

/** Chipset benchmark enrichment helper (Ranking §12a) — called separately. */
const nanoreviewAdapter = createNanoReviewAdapter


export interface SourceConfigRow {
  id: number
  slug: string
  name: string
  priority: number
  active: boolean
  adapter_name: string | null
}

export async function loadActiveSources(
  supabase: SupabaseClient,
): Promise<SourceConfigRow[]> {
  const { data } = await supabase
    .from('sources')
    .select('id, slug, name, priority, active, adapter_name')
    .eq('active', true)
    .order('priority', { ascending: true })
  return (data ?? []) as SourceConfigRow[]
}

async function recordSourceHealth(
  supabase: SupabaseClient,
  sourceSlug: string,
  ok: boolean,
  error?: string | null,
): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .from('sources')
    .update(
      ok
        ? { last_success_at: now, last_error: null }
        : { last_failure_at: now, last_error: error ?? 'unknown error' },
    )
    .eq('slug', sourceSlug)
}

// ── 1. Search across active sources ──────────────────────────────────────────

export async function searchAllSources(
  supabase: SupabaseClient,
  query: string,
  limit = 8,
): Promise<SourceSearchResult[]> {
  const sources = await loadActiveSources(supabase)
  const results = await Promise.all(
    sources.map(async (src): Promise<SourceSearchResult> => {
      const factory = src.adapter_name ? ADAPTER_FACTORIES[src.adapter_name] : undefined
      if (!factory) {
        return {
          sourceSlug: src.slug,
          sourceLabel: src.name,
          matches: [],
          error: 'no adapter bound',
          durationMs: 0,
        }
      }
      const adapter = factory()
      if (!adapter.isConfigured()) {
        return {
          sourceSlug: src.slug,
          sourceLabel: src.name,
          matches: [],
          error: 'adapter not configured (missing env / disabled)',
          durationMs: 0,
        }
      }
      const started = Date.now()
      try {
        const matches = await adapter.search(query, limit)
        await recordSourceHealth(supabase, src.slug, true)
        return {
          sourceSlug: src.slug,
          sourceLabel: src.name,
          matches,
          error: null,
          durationMs: Date.now() - started,
        }
      } catch (err) {
        const message = (err as Error).message.slice(0, 300)
        await recordSourceHealth(supabase, src.slug, false, message)
        return {
          sourceSlug: src.slug,
          sourceLabel: src.name,
          matches: [],
          error: message,
          durationMs: Date.now() - started,
        }
      }
    }),
  )
  return results
}

// ── 2. Fetch spec snapshots for chosen matches ───────────────────────────────

export interface FetchSnapshotsArgs {
  /** The admin's selected match per source (or one match for a single import). */
  selections: SourceMatch[]
  /** Optional pasted manufacturer text (spec §10d) — highest authority. */
  manufacturerText?: string | null
  /**
   * Display label for the pasted sheet — normally the admin's search query, so a
   * paste-only import still produces a sensibly named device instead of the
   * generic placeholder.
   */
  manufacturerLabel?: string | null
  manufacturerUrl?: string | null
}

/** Placeholder name for a pasted spec sheet when no better label is available. */
export const PASTE_LABEL = 'Pasted spec sheet'

/**
 * Build canonical SpecSnapshots for the chosen matches, in source order.
 *
 * Priority (§10d, §11a): a pasted (or URL-fetched) manufacturer sheet is
 * authoritative for specs, so it is placed FIRST — `detectConflicts` resolves
 * non-conflicting paths to the first source's value, and the admin still decides
 * any genuine disagreement.
 *
 * NOTE: the pasted text MUST be converted into a match here. It previously
 * arrived as `args.manufacturerText` and was silently dropped, so pasting a spec
 * sheet contributed nothing to the merge.
 */
/**
 * Why a pasted-sheet extraction produced nothing usable. Returned alongside
 * snapshots so the panel can explain "0 fields" instead of implying the sheet
 * was empty (Phone spec §14 vs pipeline failure must be distinguishable).
 */
export interface ExtractionDiagnostics {
  attempted: boolean
  /** Machine-readable cause when attempted but nothing was extracted. */
  failureReason: 'no_key' | 'circuit_open' | 'too_short' | 'llm_error' | 'all_dropped' | null
  /** Human-readable one-liner for the admin. */
  message: string | null
  /** Canonical sections dropped by the normalizer (empty/unusable). */
  droppedSections: string[]
  /** Canonical sections rejected by validateSpecs after normalization. */
  rejectedSections: string[]
}

export async function fetchSnapshots(args: FetchSnapshotsArgs): Promise<{
  snapshots: SpecSnapshot[]
  errors: Array<{ sourceSlug: string; error: string }>
  extractionDiagnostics: ExtractionDiagnostics
}> {
  const snapshots: SpecSnapshot[] = []
  const errors: Array<{ sourceSlug: string; error: string }> = []

  // 0. Manufacturer paste / product URL — highest authority, so first in order.
  const label = args.manufacturerLabel?.trim() || PASTE_LABEL
  const matches: SourceMatch[] = []
  const pastedText = (args.manufacturerText ?? '').trim()
  const diag: ExtractionDiagnostics = {
    attempted: false,
    failureReason: null,
    message: null,
    droppedSections: [],
    rejectedSections: [],
  }
  if (pastedText.length >= 20) {
    diag.attempted = true
    matches.push(pasteMatch(pastedText, label))
  } else if (pastedText.length > 0) {
    diag.attempted = true
    diag.failureReason = 'too_short'
    diag.message = `Pasted text is only ${pastedText.length} characters — at least 20 are needed for extraction.`
    errors.push({
      sourceSlug: 'manufacturer',
      error: 'The pasted specification text is too short to parse (minimum 20 characters).',
    })
  } else if (args.manufacturerUrl) {
    matches.push({
      externalId: args.manufacturerUrl,
      name: label,
      brand: null,
      releaseYear: null,
      modelNumber: null,
      region: null,
      variantLabel: null,
      url: args.manufacturerUrl,
      thumbnail: null,
      sourceSlug: 'manufacturer',
      sourceLabel: 'Manufacturer (official specs)',
    })
  }

  matches.push(...args.selections)

  for (const match of matches) {
    const factory = ADAPTER_FACTORIES[match.sourceSlug]
    if (!factory) {
      errors.push({ sourceSlug: match.sourceSlug, error: 'no adapter bound' })
      continue
    }
    const adapter = factory()
    try {
      const snap = await adapter.fetchSpecs(match)
      if (snap) {
        // Manufacturer paste: run the brain to canonicalize free text.
        // Schema enforces canonical keys; the normalizer strips units
        // ("161.42 mm" → 161.42) before validateSpecs gates storage.
        const rawText =
          (snap.raw as { text?: string } | null)?.text ??
          (match.sourceSlug === 'manufacturer' ? decodePasteText(match.externalId) : null)
        if (rawText && Object.keys(snap.specs).length === 0) {
          const result = await extractSpecsFromText(rawText)
          if ('failure' in result) {
            diag.failureReason = result.failure.reason
            diag.message =
              result.failure.reason === 'no_key'
                ? 'AI extraction is not configured (GROQ_API_KEY missing) — the paste contributed nothing. Ask an admin to configure the key, then fetch again.'
                : result.failure.reason === 'circuit_open'
                  ? 'AI extraction is temporarily unavailable (service circuit open) — try again in a few minutes.'
                  : result.failure.reason === 'too_short'
                    ? 'Pasted text is too short for extraction.'
                    : `AI extraction failed: ${(result.failure as { message?: string }).message ?? 'unknown error'}`.slice(0, 300)
          } else {
            const { sections, dropped } = normalizeExtraction(result.extraction)
            diag.droppedSections = [...new Set([...diag.droppedSections, ...dropped])]
            const parsed = validateSpecs(sections)
            diag.rejectedSections = [...new Set([...diag.rejectedSections, ...parsed.rejected])]
            snap.specs = parsed.valid as Partial<DeviceSpecs>
            snap.identity = {
              name: result.extraction.name ?? snap.identity.name,
              brand: result.extraction.brand ?? snap.identity.brand,
              modelNumber: result.extraction.model_number ?? snap.identity.modelNumber,
              releaseYear: result.extraction.release_year ?? snap.identity.releaseYear,
              variantLabel: snap.identity.variantLabel,
              region: snap.identity.region,
              tagline: result.extraction.tagline ?? snap.identity.tagline,
            }
            snap.providedPaths = collectProvidedPaths(snap.specs)
            if (Object.keys(snap.specs).length === 0) {
              diag.failureReason = diag.failureReason ?? 'all_dropped'
              diag.message =
                diag.message ??
                'Extraction returned text but every section was dropped' +
                  (diag.droppedSections.length > 0 ? ` (empty: ${diag.droppedSections.join(', ')})` : '') +
                  (diag.rejectedSections.length > 0 ? ` (rejected: ${diag.rejectedSections.join(', ')})` : '') +
                  '.'
            }
          }
        }
      // A manufacturer/source snapshot that yielded no fields contributes
        // nothing to the merge — report it rather than appearing to succeed.
        if (match.sourceSlug === 'manufacturer' && snap.providedPaths.length === 0) {
          errors.push({
            sourceSlug: 'manufacturer',
            error: diag.message ?? 'No specification fields were extracted from the pasted sheet.',
          })
        }

        snapshots.push(snap)
      } else {
        // Adapter returned nothing (e.g. the product URL had no readable specs).
        errors.push({ sourceSlug: match.sourceSlug, error: 'no specs returned' })
      }
    } catch (err) {
      errors.push({ sourceSlug: match.sourceSlug, error: (err as Error).message.slice(0, 300) })
    }
  }
  return { snapshots, errors, extractionDiagnostics: diag }
}

// ── 3. Preview: merge + conflicts + duplicates + missing fields (no writes) ──

export interface ImportPreview {
  snapshots: SpecSnapshot[]
  merged: Record<string, { value: unknown; sourceSlug: string }>
  conflicts: SpecConflict[]
  duplicates: DuplicateCandidate[]
  fieldsImported: number
  fieldsMissing: number
  missingPaths: string[]
  identity: {
    name: string
    brand: string | null
    modelNumber: string | null
    releaseYear: number | null
    variantLabel: string | null
    region: string | null
    tagline: string | null
  }
  specs: Partial<DeviceSpecs>
  rawPayloads: Array<{ sourceSlug: string; sourceLabel: string; raw: unknown; sourceUrl: string | null }>
}

export async function previewImport(
  supabase: SupabaseClient,
  args: {
    snapshots: SpecSnapshot[]
    existingDeviceId?: number | null
    manufacturerText?: string | null
  },
): Promise<ImportPreview | null> {
  const snapshots = args.snapshots
  if (snapshots.length === 0) return null

  // Existing device values (if updating) + its manual overrides (§16).
  let existingSpecs: Record<string, unknown> | null = null
  if (args.existingDeviceId) {
    const { data } = await supabase
      .from('devices')
      .select(
        'specs_design, specs_display, specs_processor, specs_memory, specs_camera, specs_battery, specs_connectivity, specs_network, specs_software',
      )
      .eq('id', args.existingDeviceId)
      .maybeSingle()
    existingSpecs = (data as Record<string, unknown> | null) ?? null
  }
  const overridePaths = args.existingDeviceId
    ? await getManualOverridePaths(supabase, args.existingDeviceId)
    : new Set<string>()

  const { conflicts, merged } = detectConflicts(snapshots, existingSpecs, overridePaths)

  // Merge back into per-section shape (validated by the schema gate).
  const sections: Record<string, Record<string, unknown>> = {}
  for (const [path, entry] of merged) {
    const [section, ...rest] = path.split('.')
    const key = rest.join('.')
    if (!sections[section]) sections[section] = {}
    sections[section][key] = entry.value
  }
  const { valid } = validateSpecs(sections)
  const specs = valid as Partial<DeviceSpecs>

  // Canonical leaf paths for missing-field metrics (spec §14: missing = null).
  const provided = new Set<string>()
  for (const snap of snapshots) for (const p of snap.providedPaths) provided.add(p)
  const canonicalLeaves = canonicalLeafPaths()
  const missingPaths = canonicalLeaves.filter((p) => !merged.has(p))

  // Duplicate detection (§19) — only when this would create a new device.
  const duplicates = args.existingDeviceId
    ? []
    : await findDuplicates(supabase, snapshots[0])

  // Identity comes from the highest-priority snapshot that carries a REAL
  // device name — the generic paste placeholder must never name the device.
  const named = snapshots.find((s) => s.identity.name && s.identity.name !== PASTE_LABEL)
  const first = named ?? snapshots[0]
  return {
    snapshots,
    merged: Object.fromEntries(merged),
    conflicts,
    duplicates,
    fieldsImported: merged.size,
    fieldsMissing: missingPaths.length,
    missingPaths,
    identity: {
      name: first.identity.name,
      brand: first.identity.brand,
      modelNumber: first.identity.modelNumber,
      releaseYear: first.identity.releaseYear,
      variantLabel: first.identity.variantLabel,
      region: first.identity.region,
      tagline: first.identity.tagline,
    },
    specs,
    rawPayloads: snapshots.map((s) => ({
      sourceSlug: s.match.sourceSlug,
      sourceLabel: s.match.sourceLabel,
      raw: s.raw,
      sourceUrl: s.sourceUrl,
    })),
  }
}

const CANONICAL_LEAVES: string[] = [
  'specs_design.height_mm', 'specs_design.width_mm', 'specs_design.thickness_mm',
  'specs_design.weight_g', 'specs_design.ip_rating', 'specs_design.frame_material',
  'specs_design.back_material', 'specs_design.front_glass_protection',
  'specs_display.size_inches', 'specs_display.display_type', 'specs_display.resolution_width',
  'specs_display.resolution_height', 'specs_display.refresh_hz',
  'specs_display.peak_brightness_nits', 'specs_display.hdr',
  'specs_processor.chipset_name', 'specs_processor.cpu', 'specs_processor.gpu',
  'specs_processor.process_node',
  'specs_memory.ram_gb', 'specs_memory.ram_type', 'specs_memory.storage_gb',
  'specs_memory.storage_type',
  'specs_camera.rear', 'specs_camera.selfie', 'specs_camera.video_features',
  'specs_battery.capacity_mah', 'specs_battery.battery_type', 'specs_battery.wired_w',
  'specs_battery.wireless_w', 'specs_battery.reverse_wireless_w', 'specs_battery.protocols',
  'specs_connectivity.wifi', 'specs_connectivity.bluetooth', 'specs_connectivity.nfc',
  'specs_connectivity.usb', 'specs_connectivity.ir_blaster',
  'specs_network.sim', 'specs_network.technology', 'specs_network.bands_2g',
  'specs_network.bands_3g', 'specs_network.bands_4g', 'specs_network.bands_5g',
  'specs_software.os', 'specs_software.ui', 'specs_software.os_upgrades',
  'specs_software.security_patches',
]

function canonicalLeafPaths(): string[] {
  return CANONICAL_LEAVES
}

/**
 * Canonical leaf paths present in a validated specs object, e.g.
 * 'specs_display.refresh_hz'. Mirrors the section-merge path format used by
 * detectConflicts, so provided/missing metrics line up.
 */
function collectProvidedPaths(specs: Partial<DeviceSpecs>): string[] {
  return Object.entries(specs).flatMap(([section, values]) =>
    values && typeof values === 'object'
      ? Object.entries(values as Record<string, unknown>)
          .filter(([, v]) => v != null)
          .map(([key]) => `${section}.${key}`)
      : [],
  )
}

function decodePasteText(externalId: string): string | null {
  try {
    if (!externalId.startsWith('paste:')) return null
    return Buffer.from(externalId.slice(6), 'base64url').toString('utf-8')
  } catch {
    return null
  }
}

// ── 4. Apply: write the DRAFT device + provenance + audit (§13, §16, §24) ────

export interface ApplyImportArgs {
  supabase: SupabaseClient
  preview: ImportPreview
  /** path → value chosen by the admin (conflict resolutions / manual edits) */
  resolutions?: Record<string, unknown>
  existingDeviceId?: number | null
  /** Create as variant of an existing device (§20) */
  parentDeviceId?: number | null
  variantLabel?: string | null
  /**
   * Major category slug resolved from the live `device_types` taxonomy
   * (see `resolveMajorCategory`). NEVER hardcoded and NEVER guessed: `null`
   * means the taxonomy had no match, and `devices.major_category` is nullable.
   */
  majorCategory?: string | null
  /** Optional granular device type from the live taxonomy (device_types.id). */
  deviceTypeId?: number | null
  /**
   * YouTube review video id to link on the draft (`related_video_id`), so the
   * device page can surface the review behind a YouTube-sourced import.
   */
  relatedVideoId?: string | null
  /** Price tier from the review pipeline (flagship / mid-range / …). */
  priceTier?: string | null
  changedBy: string
}

export interface ApplyImportResult {
  deviceId: number
  created: boolean
  importRunId: number
  fieldsImported: number
  conflictsFlagged: number
  changesRecorded: number
}

export async function applyImport(args: ApplyImportArgs): Promise<ApplyImportResult> {
  const { supabase, preview, changedBy } = args
  const startedAt = new Date()

  // 1. Open an import run row.
  const primary = preview.snapshots[0]
  const sourceId = await resolveSourceId(supabase, primary.match.sourceSlug)
  const { data: runRow, error: runErr } = await supabase
    .from('import_runs')
    .insert({
      device_id: args.existingDeviceId ?? null,
      source_id: sourceId,
      run_name: `import-${primary.match.sourceSlug}`,
      status: 'running',
    })
    .select('id')
    .single()
  if (runErr || !runRow) {
    throw new Error(`Could not open import run: ${runErr?.message ?? 'no row'}`)
  }
  const importRunId = runRow.id

  try {
    // 2. Final specs = merged + admin resolutions (admin has final authority).
    const finalMerged = new Map<string, { value: unknown; sourceSlug: string }>(
      Object.entries(preview.merged).map(([p, v]) => [p, v]),
    )
    for (const [path, value] of Object.entries(args.resolutions ?? {})) {
      finalMerged.set(path, { value, sourceSlug: 'fweezytech-admin' })
    }
    const sections: Record<string, Record<string, unknown>> = {}
    for (const [path, entry] of finalMerged) {
      const [section, ...rest] = path.split('.')
      const key = rest.join('.')
      if (!sections[section]) sections[section] = {}
      sections[section][key] = entry.value
    }
    const { valid } = validateSpecs(sections)
    const specs = valid as Partial<DeviceSpecs>

    // 3. Identity + brand resolution.
    const brandSlug = slugify(preview.identity.brand ?? '') || 'unknown'
    const brandId = await ensureBrandId(supabase, preview.identity.brand, brandSlug)
    const slugBase = slugify(preview.identity.name) || brandSlug
    const slug = args.variantLabel ? `${slugBase}-${slugify(args.variantLabel)}` : slugBase

    const allowedTiers = new Set(['flagship', 'mid-range', 'budget', 'ultra-premium'])
    const priceTier = typeof args.priceTier === 'string' && allowedTiers.has(args.priceTier)
      ? args.priceTier
      : null

    const payload: Record<string, unknown> = {
      name: preview.identity.name,
      slug,
      brand_id: brandId,
      release_year: preview.identity.releaseYear,
      tagline: preview.identity.tagline,
      price_tier: priceTier,
      major_category: args.majorCategory ?? null,
      device_type_id: args.deviceTypeId ?? null,
      status: 'draft', // NEVER auto-publish (§13a)
      import_status: preview.conflicts.length > 0 ? 'conflict' : 'imported',
      model_number: preview.identity.modelNumber,
      variant_label: args.variantLabel ?? preview.identity.variantLabel,
      region: preview.identity.region,
      parent_device_id: args.parentDeviceId ?? null,
      import_run_id: importRunId,
      related_video_id: args.relatedVideoId ?? null,
      ...specs,
    }

    // 4. Create or update the device.
    let deviceId: number
    let created = false
    let changesRecorded = 0
    if (args.existingDeviceId) {
      const { data: existing, error: selErr } = await supabase
        .from('devices')
        .select('*')
        .eq('id', args.existingDeviceId)
        .single()
      if (selErr || !existing) throw new Error('Existing device not found')
      const updates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(payload)) {
        if (['slug', 'parent_device_id', 'variant_label'].includes(key)) continue
        if (JSON.stringify((existing as Record<string, unknown>)[key]) !== JSON.stringify(value)) {
          updates[key] = value
        }
      }
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', args.existingDeviceId)
      if (error) throw new Error(`Device update failed: ${error.message}`)
      deviceId = args.existingDeviceId

      for (const [field, newValue] of Object.entries(updates)) {
        if (field === 'updated_at') continue
        await recordChange(supabase, {
          deviceId,
          fieldPath: field,
          oldValue: (existing as Record<string, unknown>)[field],
          newValue,
          changedBy,
          reason: `Import run #${importRunId} (${primary.match.sourceLabel})`,
          importRunId,
        })
        changesRecorded++
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('devices')
        .insert(payload)
        .select('id')
        .single()
      if (error || !inserted) throw new Error(`Device insert failed: ${error?.message}`)
      deviceId = inserted.id
      created = true
    }

    // 5. Provenance per field (§17) + raw payload retention (§18).
    const provenanceRows = []
    for (const [fieldPath, entry] of finalMerged) {
      provenanceRows.push({
        deviceId,
        fieldPath,
        sourceId: entry.sourceSlug === 'fweezytech-admin' ? null : await resolveSourceId(supabase, entry.sourceSlug),
        sourceLabel: entry.sourceSlug === 'fweezytech-admin' ? 'FweezyTech Admin' : entry.sourceSlug,
        sourceUrl: primary.sourceUrl,
        importedValue: entry.value,
        currentValue: entry.value,
        importRunId,
        retrievedAt: startedAt.toISOString(),
      })
    }
    await upsertProvenance(supabase, provenanceRows)

    for (const raw of preview.rawPayloads) {
      const rawSourceId = await resolveSourceId(supabase, raw.sourceSlug)
      await saveRawSourceData(supabase, {
        deviceId,
        sourceId: rawSourceId,
        externalId: primary.match.externalId,
        raw: raw.raw,
        sourceUrl: raw.sourceUrl,
        importRunId,
      })
    }

    // 6. Chipset linking + optional benchmark enrichment (Ranking §12a/§15).
    const chipsetVal = (specs.specs_processor as Record<string, unknown> | undefined)?.chipset_name
    if (typeof chipsetVal === 'string' && chipsetVal.length > 2) {
      try {
        await ensureChipset(supabase, chipsetVal, primary.match.sourceSlug, importRunId)
      } catch (err) {
        console.warn('[import] chipset enrich failed:', (err as Error).message)
      }
    }

    // 7. Close the run.
    const conflictsFlagged = preview.conflicts.length
    await supabase
      .from('import_runs')
      .update({
        status: conflictsFlagged > 0 ? 'partial' : 'success',
        completed_at: new Date().toISOString(),
        fields_imported: finalMerged.size,
        fields_missing: preview.fieldsMissing,
        conflicts_detected: conflictsFlagged,
        duplicates_detected: preview.duplicates.length,
        summary: {
          device: preview.identity.name,
          device_id: deviceId,
          created,
          sources: preview.snapshots.map((s) => s.match.sourceSlug),
        },
      })
      .eq('id', importRunId)

    await logAgentRun(supabase, {
      agent: 'import-specs',
      runName: `import-${primary.match.sourceSlug}`,
      status: 'ok',
      summary: { deviceId, created, fields: finalMerged.size, conflicts: conflictsFlagged },
    }).catch(() => {})

    return {
      deviceId,
      created,
      importRunId,
      fieldsImported: finalMerged.size,
      conflictsFlagged,
      changesRecorded,
    }
  } catch (err) {
    await supabase
      .from('import_runs')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        error_message: (err as Error).message.slice(0, 500),
      })
      .eq('id', importRunId)
    throw err
  }
}

async function ensureBrandId(
  supabase: SupabaseClient,
  brandName: string | null,
  brandSlug: string,
): Promise<number | null> {
  if (!brandName) return null
  const { data } = await supabase.from('brands').select('id').eq('slug', brandSlug).maybeSingle()
  if (data) return data.id
  const { data: created, error } = await supabase
    .from('brands')
    .insert({ name: brandName, slug: brandSlug })
    .select('id')
    .single()
  if (error) {
    console.error('[import] brand insert failed:', error.message)
    return null
  }
  return created.id
}

export async function ensureChipset(
  supabase: SupabaseClient,
  chipsetName: string,
  _sourceSlug: string,
  importRunId: number | null,
): Promise<number> {
  const slug = slugify(chipsetName)
  const { data: existing } = await supabase
    .from('chipsets')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('chipsets')
    .insert({ name: chipsetName, slug })
    .select('id')
    .single()
  if (error) {
    // Race: another run inserted it first.
    const { data: retry } = await supabase.from('chipsets').select('id').eq('slug', slug).maybeSingle()
    if (retry) return retry.id
    throw new Error(`Chipset insert failed: ${error.message}`)
  }

  // Optional NanoReview enrichment when the source is enabled (Ranking §12a).
  const adapter = nanoreviewAdapter()
  if (adapter.isConfigured()) {
    try {
      const benchmarks = await adapter.fetchChipsetBenchmarks(chipsetName)
      const sourceId = await resolveSourceId(supabase, 'nanoreview')
      for (const b of benchmarks) {
        await supabase.from('chipset_benchmarks').insert({
          chipset_id: created.id,
          benchmark_name: b.benchmark_name,
          single_core: b.single_core,
          multi_core: b.multi_core,
          gpu_score: b.gpu_score,
          source_id: sourceId,
          source_label: b.source_label,
          source_url: b.source_url,
          date_collected: b.date_collected,
          confidence: 'medium',
          import_run_id: importRunId,
        })
      }
      await recordSourceHealth(supabase, 'nanoreview', true)
    } catch (err) {
      await recordSourceHealth(supabase, 'nanoreview', false, (err as Error).message)
    }
  }
  return created.id
}
