import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/devices/:id/provenance
 *
 * Everything needed to verify where a device's data came from (§17, §18, §24,
 * §25): field-level provenance, raw source payloads, import runs and the full
 * change history. Read-only; admin/editor/viewer may inspect.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminAuth()
    const { id } = await params
    const deviceId = parseInt(id)
    if (!Number.isFinite(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    const supabase = await getAdminClient()

    const [device, provenance, raw, runs, changes] = await Promise.all([
      supabase
        .from('devices')
        .select('id, name, slug, status, import_status, verified_at, model_number, variant_label, region, parent_device_id, updated_at')
        .eq('id', deviceId)
        .maybeSingle(),
      supabase
        .from('device_spec_sources')
        .select('*')
        .eq('device_id', deviceId)
        .order('field_path', { ascending: true }),
      supabase
        .from('device_source_raw_data')
        .select('id, source_id, external_id, source_url, retrieved_at, import_run_id')
        .eq('device_id', deviceId)
        .order('retrieved_at', { ascending: false })
        .limit(50),
      supabase
        .from('import_runs')
        .select('*')
        .eq('device_id', deviceId)
        .order('started_at', { ascending: false })
        .limit(25),
      supabase
        .from('device_changes')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    if (device.error) {
      return NextResponse.json({ error: device.error.message }, { status: 500 })
    }
    if (!device.data) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({
      device: device.data,
      provenance: provenance.data ?? [],
      rawSources: raw.data ?? [],
      importRuns: runs.data ?? [],
      changes: changes.data ?? [],
      counts: {
        fieldsTracked: (provenance.data ?? []).length,
        manualOverrides: (provenance.data ?? []).filter((p) => p.manual_override).length,
        conflicts: (provenance.data ?? []).filter((p) => p.verification_status === 'conflict').length,
        rawPayloads: (raw.data ?? []).length,
        changesRecorded: (changes.data ?? []).length,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

/**
 * PATCH /api/admin/devices/:id/provenance
 *
 * Verification workflow (§31): mark a field verified, flag it as a conflict, or
 * set/clear a manual override (§16). Admin/editor only.
 *
 * Body: { field_path: string,
 *         verification_status?: 'pending'|'verified'|'conflict'|'rejected',
 *         manual_override?: boolean, note?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const deviceId = parseInt(id)
    if (!Number.isFinite(deviceId)) {
      return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
    }

    let body: {
      field_path?: string
      verification_status?: string
      manual_override?: boolean
      note?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const fieldPath = String(body.field_path ?? '').trim()
    if (!fieldPath) {
      return NextResponse.json({ error: 'field_path is required.' }, { status: 400 })
    }
    const allowed = ['pending', 'verified', 'conflict', 'rejected']
    if (body.verification_status !== undefined && !allowed.includes(String(body.verification_status))) {
      return NextResponse.json({ error: 'Unknown verification status.' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.verification_status !== undefined) payload.verification_status = String(body.verification_status)
    if (body.manual_override !== undefined) payload.manual_override = Boolean(body.manual_override)
    if (body.note !== undefined) payload.source_label = body.note ? String(body.note) : 'FweezyTech Admin'

    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('device_spec_sources')
      .update(payload)
      .eq('device_id', deviceId)
      .eq('field_path', fieldPath)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'No provenance row for that field on this device.' }, { status: 404 })
    }

    // Verification decisions are themselves auditable (§25).
    await supabase.from('device_changes').insert({
      device_id: deviceId,
      field_path: fieldPath,
      old_value: null,
      new_value: { verification_status: payload.verification_status ?? data.verification_status } as never,
      changed_by: adminUser.display_name ?? adminUser.id,
      reason: body.note ? String(body.note) : 'Provenance verification updated',
    })

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}