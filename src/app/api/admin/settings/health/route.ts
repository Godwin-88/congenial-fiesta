import { NextRequest, NextResponse } from 'next/server'
import { getHealthCached, summarizeHealth } from '@/lib/settings/health'
import { requireAdminAuth } from '@/lib/admin/require-admin'

// GET /api/admin/settings/health?refresh=1
// Integration status for the Settings console (Pillar 2).
// Any signed-in admin can view health (no credentials are exposed).
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const refresh = request.nextUrl.searchParams.get('refresh') === '1'
    const probes = await getHealthCached(refresh)
    const summary = summarizeHealth(probes)
    return NextResponse.json({ probes, summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}