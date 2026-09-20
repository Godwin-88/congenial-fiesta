import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { previewRanking, loadGlobalBenchmarks } from '@/lib/ranking/engine'
import { FORMULA_VERSION, BENCHMARK_VERSION, CATEGORY_MAX } from '@/lib/ranking/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/ranking/preview
 *
 * Live ranking preview for UNSAVED form data (§36): the create/edit forms send
 * their current spec sections and get back the exact breakdown the engine
 * would compute on save — same canonical write gate, same chipset matching,
 * same global benchmarks. Nothing is persisted.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const body = (await request.json()) as Record<string, unknown>
    const specSections: Record<string, unknown> = {}
    for (const key of [
      'specs_design', 'specs_display', 'specs_processor', 'specs_memory',
      'specs_camera', 'specs_battery', 'specs_connectivity', 'specs_software',
      'specs_network',
    ]) {
      if (body[key] !== undefined && body[key] !== null) specSections[key] = body[key]
    }

    const result = await previewRanking(supabase, specSections)
    const benchmarks = result ? result.benchmarks : await loadGlobalBenchmarks(supabase)
    return NextResponse.json({
      breakdown: result?.breakdown ?? null,
      benchmarks,
      formula: { version: FORMULA_VERSION, benchmarkVersion: BENCHMARK_VERSION, categoryMax: CATEGORY_MAX },
      note:
        result == null
          ? 'No ranking-relevant specs in the form yet.'
          : 'Live preview from unsaved form data — the deterministic engine computes it exactly like this on save.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
