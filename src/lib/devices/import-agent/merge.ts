// Merge + conflict detection for the import agent.
// ============================================================================
// Spec §15 (never silently overwrite when sources disagree), §16 (manual
// overrides are protected), §19 (duplicate detection). Deterministic — the LLM
// is never trusted to resolve factual conflicts; the ADMIN is.

import { slugify } from '@/lib/devices/import'
import type { DuplicateCandidate, SpecConflict, SpecSnapshot } from './types'

/** Flatten a snapshot's canonical specs into path→value pairs. */
export function flattenSpecs(snapshot: SpecSnapshot): Map<string, unknown> {
  const out = new Map<string, unknown>()
  for (const [section, values] of Object.entries(snapshot.specs)) {
    if (!values || typeof values !== 'object') continue
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (value != null) out.set(`${section}.${key}`, value)
    }
  }
  return out
}

/**
 * Compare snapshots from multiple sources (+ optional existing stored specs).
 * Returns per-path conflicts where >=2 distinct values exist.
 */
export function detectConflicts(
  snapshots: SpecSnapshot[],
  existingSpecs?: Record<string, unknown> | null,
  manualOverridePaths?: Set<string>,
): { conflicts: SpecConflict[]; merged: Map<string, { value: unknown; sourceSlug: string }> } {
  const byPath = new Map<string, Array<{ sourceSlug: string; sourceLabel: string; value: unknown }>>()

  if (existingSpecs) {
    for (const [section, values] of Object.entries(existingSpecs)) {
      if (!values || typeof values !== 'object') continue
      for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
        if (value != null) {
          byPath.set(`${section}.${key}`, [
            { sourceSlug: 'existing', sourceLabel: 'Existing stored value', value },
          ])
        }
      }
    }
  }

  for (const snap of snapshots) {
    for (const [path, value] of flattenSpecs(snap)) {
      const list = byPath.get(path) ?? []
      list.push({ sourceSlug: snap.match.sourceSlug, sourceLabel: snap.match.sourceLabel, value })
      byPath.set(path, list)
    }
  }

  const conflicts: SpecConflict[] = []
  const merged = new Map<string, { value: unknown; sourceSlug: string }>()

  for (const [path, entries] of byPath) {
    if (manualOverridePaths?.has(path)) {
      // §16: an admin-corrected value is authoritative — do not merge over it.
      const existing = entries.find((e) => e.sourceSlug === 'existing')
      if (existing) merged.set(path, { value: existing.value, sourceSlug: 'fweezytech-admin' })
      conflicts.push({ path, values: entries, involvesExisting: true })
      continue
    }
    // Distinct values (deep compare on JSON)
    const distinct: typeof entries = []
    for (const e of entries) {
      if (!distinct.some((d) => JSON.stringify(d.value) === JSON.stringify(e.value))) {
        distinct.push(e)
      }
    }
    if (distinct.length > 1) {
      conflicts.push({
        path,
        values: entries,
        involvesExisting: entries.some((e) => e.sourceSlug === 'existing'),
      })
    }
    // No conflict: choose the highest-priority source's value (source order in
    // `snapshots` is priority-ordered by the orchestrator).
    const first = entries.find((e) => e.sourceSlug !== 'existing') ?? entries[0]
    merged.set(path, { value: first.value, sourceSlug: first.sourceSlug })
  }

  return { conflicts, merged }
}
