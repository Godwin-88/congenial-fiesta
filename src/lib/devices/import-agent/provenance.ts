// Provenance + audit persistence (Phone spec §16–18, §24–25).
// ============================================================================
// All writes go through the service-role client (RLS bypassed server-side only).
// Manual overrides are PROTECTED: automated apply never touches a field whose
// device_spec_sources row has manual_override = true.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProvenanceRow {
  deviceId: number
  fieldPath: string
  sourceId: number | null
  sourceLabel: string
  sourceUrl: string | null
  importedValue: unknown
  currentValue: unknown
  importRunId: number | null
  retrievedAt: string | null
}

export async function resolveSourceId(
  supabase: SupabaseClient,
  sourceSlug: string,
): Promise<number | null> {
  const { data } = await supabase.from('sources').select('id').eq('slug', sourceSlug).maybeSingle()
  return data?.id ?? null
}

export async function getManualOverridePaths(
  supabase: SupabaseClient,
  deviceId: number,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('device_spec_sources')
    .select('field_path')
    .eq('device_id', deviceId)
    .eq('manual_override', true)
  return new Set((data ?? []).map((r) => r.field_path))
}

/** Upsert provenance rows for a set of (path → {value, source}) merges. */
export async function upsertProvenance(
  supabase: SupabaseClient,
  rows: ProvenanceRow[],
): Promise<void> {
  if (rows.length === 0) return
  const payload = rows.map((r) => ({
    device_id: r.deviceId,
    field_path: r.fieldPath,
    source_id: r.sourceId,
    source_label: r.sourceLabel,
    source_url: r.sourceUrl,
    imported_value: r.importedValue,
    current_value: r.currentValue,
    import_run_id: r.importRunId,
    retrieved_at: r.retrievedAt,
    // A manual override row keeps its flag; upsert must NOT reset it.
  }))
  const { error } = await supabase
    .from('device_spec_sources')
    .upsert(payload, { onConflict: 'device_id,field_path', ignoreDuplicates: false })
  if (error) {
    console.error('[provenance] upsert failed:', error.message)
  }
}

export async function saveRawSourceData(
  supabase: SupabaseClient,
  args: {
    deviceId: number | null
    sourceId: number | null
    externalId: string | null
    raw: unknown
    sourceUrl: string | null
    importRunId: number | null
  },
): Promise<void> {
  const { error } = await supabase.from('device_source_raw_data').insert({
    device_id: args.deviceId,
    source_id: args.sourceId,
    external_id: args.externalId,
    raw_response: args.raw as never,
    source_url: args.sourceUrl,
    import_run_id: args.importRunId,
  })
  if (error) console.error('[raw-data] insert failed:', error.message)
}

export async function recordManualOverride(
  supabase: SupabaseClient,
  deviceId: number,
  fieldPath: string,
  value: unknown,
  sourceLabel = 'FweezyTech Admin',
): Promise<void> {
  await supabase.from('device_spec_sources').upsert(
    {
      device_id: deviceId,
      field_path: fieldPath,
      source_label: sourceLabel,
      current_value: value as never,
      verification_status: 'verified',
      manual_override: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'device_id,field_path' },
  )
}

export async function recordChange(
  supabase: SupabaseClient,
  args: {
    deviceId: number
    fieldPath: string
    oldValue: unknown
    newValue: unknown
    changedBy: string
    reason?: string | null
    importRunId?: number | null
  },
): Promise<void> {
  await supabase.from('device_changes').insert({
    device_id: args.deviceId,
    field_path: args.fieldPath,
    old_value: args.oldValue as never,
    new_value: args.newValue as never,
    changed_by: args.changedBy,
    reason: args.reason ?? null,
    import_run_id: args.importRunId ?? null,
  })
}
