import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isEditorRole } from '@/lib/admin/roles'
import { recalculateDevice, refreshAutoBenchmarks } from '@/lib/ranking/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/ranking/recalculate
 *
 * Deterministic recalculation (§30, §31, §44). Never calls an LLM (§33).
 *
 * Body:
 *   { deviceId: number }                 → recalculate one device
 *   { all: true, refreshBenchmarks?: bool } → refresh global bests + recalc all
 *   { refreshBenchmarks: true }          → move global bests, then recalc affected
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isEditorRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { deviceId?: number; all?: boolean; refreshBenchmarks?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // empty body = refresh benchmarks only
    }

    const supabase = await getAdminClient()

    // 1. Single device.
    if (body.deviceId !== undefined) {
      const deviceId = Number(body.deviceId)
      if (!Number.isFinite(deviceId)) {
        return NextResponse.json({ error: 'Invalid device id' }, { status: 400 })
      }
      const breakdown = await recalculateDevice(supabase, deviceId)
      if (!breakdown) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 })
      }
      return NextResponse.json({ deviceId, breakdown, message: 'Ranking recalculated.' })
    }

    // 2. Global refresh (+ optional full recalculation).
    const result = await refreshAutoBenchmarks(supabase, { recalcAll: body.all !== false })
    return NextResponse.json({
      benchmarksMoved: result.updated,
      devicesRecalculated: result.recalculated,
      message: result.updated.length
        ? `Global bests updated: ${result.updated.join(', ')}`
        : 'No global bests moved; scores re-verified.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}