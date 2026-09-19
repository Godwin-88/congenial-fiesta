// Device field audit + manual-override protection + score recalculation hooks.
// ============================================================================
// Used by /api/admin/devices CRUD. Implements:
//  - §25 change history (device_changes)
//  - §16 manual overrides (admin edits are flagged manual_override=true so
//    future automated imports never silently overwrite them)
//  - Ranking §30 score recalculation when ranking-relevant specs change

import type { SupabaseClient } from '@supabase/supabase-js'
import { isRankingRelevantChange, recalculateDevice, refreshAutoBenchmarks } from '@/lib/ranking/engine'
import { SPEC_SECTION_KEYS } from '@/lib/devices/spec-schema'

const SPEC_SECTIONS = SPEC_SECTION_KEYS

/** Leaf-level diff of one JSONB section: path → {old, new}. */
function diffSection(
  section: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<{ path: string; old: unknown; next: unknown }> {
  const diffs: Array<{ path: string; old: unknown; next: unknown }> = []
  const b = before ?? {}
  const a = after ?? {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  for (const key of keys) {
    if (JSON.stringify(b[key] ?? null) !== JSON.stringify(a[key] ?? null)) {
      diffs.push({ path: `${section}.${key}`, old: b[key] ?? null, next: a[key] ?? null })
    }
  }
  return diffs
}

/**
 * Record device_changes rows for every changed field (§25). Spec sections are
 * diffed leaf-by-leaf so the history is as useful as the provenance.
 */
export async function recordDeviceChanges(
  supabase: SupabaseClient,
  args: {
    deviceId: number
    before: Record<string, unknown>
    payload: Record<string, unknown>
    changedBy: string
    reason?: string | null
  },
): Promise<number> {
  let recorded = 0
  const inserts: Array<Record<string, unknown>> = []

  for (const [key, newValue] of Object.entries(args.payload)) {
    const oldValue = args.before[key]
    if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) continue
    if (SPEC_SECTIONS.includes(key)) {
      for (const d of diffSection(key, oldValue as Record<string, unknown> | null, newValue as Record<string, unknown> | null)) {
        inserts.push({
          device_id: args.deviceId,
          field_path: d.path,
          old_value: d.old as never,
          new_value: d.next as never,
          changed_by: args.changedBy,
          reason: args.reason ?? 'Admin edit',
        })
      }
    } else {
      inserts.push({
        device_id: args.deviceId,
        field_path: key,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        changed_by: args.changedBy,
        reason: args.reason ?? 'Admin edit',
      })
    }
  }

  for (const row of inserts) {
    await supabase.from('device_changes').insert(row as never)
    recorded++
  }
  return recorded
}

/**
 * Flag admin-corrected spec leaves as manual overrides (§16). Future import
 * runs will detect conflicts instead of overwriting these values.
 */
export async function flagManualOverrides(
  supabase: SupabaseClient,
  args: {
    deviceId: number
    before: Record<string, unknown>
    payload: Record<string, unknown>
  },
): Promise<number> {
  let flagged = 0
  for (const section of SPEC_SECTIONS) {
    if (args.payload[section] === undefined) continue
    const diffs = diffSection(
      section,
      args.before[section] as Record<string, unknown> | null,
      args.payload[section] as Record<string, unknown> | null,
    )
    for (const d of diffs) {
      // Only meaningful corrections (non-null new values) become overrides.
      if (d.next == null) continue
      await supabase
        .from('device_spec_sources')
        .upsert(
          {
            device_id: args.deviceId,
            field_path: d.path,
            current_value: d.next as never,
            source_label: 'FweezyTech Admin',
            verification_status: 'verified',
            manual_override: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_id,field_path' },
        )
      flagged++
    }
  }
  return flagged
}

/**
 * Recalculate the Fair Phone Score when ranking-relevant specs changed or the
 * device was (un)published. Non-blocking for the request on failure.
 */
export async function maybeRecalculateRanking(
  supabase: SupabaseClient,
  deviceId: number,
  before: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<number | null> {
  try {
    const relevant = isRankingRelevantChange(before, payload)
    const statusChanged = payload.status !== undefined && payload.status !== before.status
    if (!relevant && !statusChanged) return null
    const breakdown = await recalculateDevice(supabase, deviceId)
    return breakdown?.total ?? null
  } catch (err) {
    console.warn('[ranking] recalculation failed:', (err as Error).message)
    return null
  }
}

/**
 * Publishing a device can move the global bests it defines (Ranking §31, §44):
 * a new brightest display, largest battery, fastest chipset or biggest sensor
 * raises the bar for every other device. This refreshes the auto-calculated
 * benchmarks and recalculates the affected devices so no score is left stale
 * and no launch-era score is ever frozen (§31).
 *
 * Only fires on a real transition into 'published' — never on routine edits,
 * and never on un-publish (removing a device cannot lower a global best).
 */
export async function maybeRefreshBenchmarksOnPublish(
  supabase: SupabaseClient,
  before: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<{ benchmarksMoved: string[]; devicesRecalculated: number } | null> {
  const publishing =
    payload.status === 'published' && before.status !== 'published'
  if (!publishing) return null
  try {
    const result = await refreshAutoBenchmarks(supabase, { recalcAll: true })
    return { benchmarksMoved: result.updated, devicesRecalculated: result.recalculated }
  } catch (err) {
    console.warn('[ranking] benchmark refresh on publish failed:', (err as Error).message)
    return null
  }
}
