import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole } from '@/lib/admin/roles'
import { recalculateDevice } from '@/lib/ranking/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/admin/ranking/benchmarks
 *
 * The dynamic global benchmark table (§30): current-best values the formula
 * compares every device against, with their provenance and whether they are
 * auto-calculated or admin-overridden (§50).
 */
export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('ranking_benchmarks')
      .select('*')
      .order('key', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

/**
 * PATCH /api/admin/ranking/benchmarks
 *
 * Admin override of a global best (§50). Overridden rows are pinned
 * (auto_calculated = false) so future automatic refreshes never silently
 * replace the administrator's decision. Affected device scores are then
 * recalculated (§31).
 *
 * Body: { key: string, value?: number, reference_label?: string, active?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { key?: string; value?: number; reference_label?: string; active?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const key = String(body.key ?? '').trim()
    if (!key) {
      return NextResponse.json({ error: 'A benchmark key is required.' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      // Admin decisions are authoritative and protected from auto-refresh.
      auto_calculated: false,
    }
    if (body.value !== undefined) {
      const value = Number(body.value)
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: 'Value must be a positive number.' }, { status: 400 })
      }
      payload.value = value
    }
    if (body.reference_label !== undefined) {
      payload.reference_label = body.reference_label ? String(body.reference_label) : null
    }
    if (body.active !== undefined) payload.active = Boolean(body.active)

    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('ranking_benchmarks')
      .update(payload)
      .eq('key', key)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // §31: a moved benchmark invalidates downstream scores — recalculate.
    let recalculated = 0
    const { data: ranked } = await supabase.from('device_rankings').select('device_id').limit(5000)
    for (const row of ranked ?? []) {
      await recalculateDevice(supabase, row.device_id)
      recalculated++
    }

    return NextResponse.json({ data, devicesRecalculated: recalculated })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}