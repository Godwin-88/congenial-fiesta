import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { recalculateDevice, loadGlobalBenchmarks } from '@/lib/ranking/engine'
import { FORMULA_VERSION, BENCHMARK_VERSION, CATEGORY_MAX } from '@/lib/ranking/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET /api/admin/ranking/breakdown/:id
 *
 * Full deterministic breakdown for one device (§36) — every component, its
 * inputs and its points, so an administrator can audit the score. The public
 * site only ever shows the single final number; this route is admin-only.
 *
 * Query: ?recalculate=1 to recompute before returning.
 */
export async function GET(
  request: NextRequest,
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
    const { data: device } = await supabase
      .from('devices')
      .select('id, name, slug, status, scores_overall, specs_processor')
      .eq('id', deviceId)
      .maybeSingle()

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    let breakdown = null
    if (searchParams.get('recalculate') === '1') {
      breakdown = await recalculateDevice(supabase, deviceId)
    } else {
      const { data } = await supabase
        .from('device_rankings')
        .select('*')
        .eq('device_id', deviceId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      breakdown = data?.breakdown ?? null
    }

    const benchmarks = await loadGlobalBenchmarks(supabase)

    return NextResponse.json({
      device,
      breakdown,
      benchmarks,
      formula: { version: FORMULA_VERSION, benchmarkVersion: BENCHMARK_VERSION, categoryMax: CATEGORY_MAX },
      note:
        breakdown == null
          ? 'No score yet — the device is missing too much ranking-relevant data, or has not been calculated.'
          : 'Internal precision is kept; only the displayed score is rounded.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}