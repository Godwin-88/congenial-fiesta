import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole } from '@/lib/admin/roles'
import { recordDeviceChanges, flagManualOverrides, maybeRecalculateRanking, maybeRefreshBenchmarksOnPublish } from '@/lib/devices/audit'
import { recalculateDevice } from '@/lib/ranking/engine'
import { canonicalizeSpecSections } from '@/lib/devices/canonical-write'

/** Spec sections the deterministic ranking engine reads (§30). */
const RANKING_SPEC_FIELDS = [
  'specs_design',
  'specs_display',
  'specs_processor',
  'specs_memory',
  'specs_camera',
  'specs_battery',
]

async function getScoreWeights(supabase: ReturnType<typeof getAdminClient>) {
  const { data } = await supabase
    .from('site_settings')
    .select('score_weight_display, score_weight_performance, score_weight_camera, score_weight_battery, score_weight_value')
    .limit(1)
    .maybeSingle()

  return {
    display: data?.score_weight_display ?? 0.20,
    performance: data?.score_weight_performance ?? 0.25,
    camera: data?.score_weight_camera ?? 0.25,
    battery: data?.score_weight_battery ?? 0.15,
    value: data?.score_weight_value ?? 0.15,
  }
}

type ScoreWeights = {
  display: number
  performance: number
  camera: number
  battery: number
  value: number
}

function computeOverallScore(scores: {
  display?: number | null
  performance?: number | null
  camera?: number | null
  battery?: number | null
  value?: number | null
}, weights: ScoreWeights): number | null {
  const d = scores.display ?? 0
  const p = scores.performance ?? 0
  const c = scores.camera ?? 0
  const b = scores.battery ?? 0
  const v = scores.value ?? 0
  const overall = (d * weights.display + p * weights.performance + c * weights.camera + b * weights.battery + v * weights.value) * 10
  return Math.round(overall * 10) / 10
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth()
    const { id } = await params
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('devices')
      .select('*, brand:brands(*)')
      .eq('id', parseInt(id))
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await getAdminClient()

    // Validate slug uniqueness if changed
    if (body.slug) {
      const { data: existing } = await supabase
        .from('devices')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', parseInt(id))
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
    }

    // Validate brand exists if being changed
    if (body.brand_id) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .eq('id', body.brand_id)
        .single()
      if (!brandData) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 400 })
      }
    }

    // Resolve device type + major category if provided
    let majorCategory: string | null | undefined = body.major_category
    if (body.device_type_id !== undefined && body.device_type_id) {
      const { data: typeData } = await supabase
        .from('device_types')
        .select('id, major_category')
        .eq('id', body.device_type_id)
        .single()
      if (!typeData) {
        return NextResponse.json({ error: 'Device type not found' }, { status: 400 })
      }
      majorCategory = typeData.major_category
    }

    const weights = await getScoreWeights(supabase)
    const scoreOverall = computeOverallScore({
      display: body.score_display,
      performance: body.score_performance,
      camera: body.score_camera,
      battery: body.score_battery,
      value: body.score_value,
    }, weights)

    // Ranking-relevant spec edits are handled by the deterministic engine
    // (§26a, §30) — it owns the final score. Manual component scores remain a
    // fallback for devices the engine cannot yet score (missing spec data).
    const hasSpecChanges = RANKING_SPEC_FIELDS.some((f) => body[f] !== undefined)

    // ── Canonical write gate (§24b) ──────────────────────────────────────
    // Only the sections the admin actually sent. The form (and the chat
    // prefill) may carry label-keyed sections ("Dimensions", "RAM" …) — map
    // them onto the canonical schema the ranking engine reads BEFORE
    // persisting (see canonical-write.ts header for the 9.1 incident).
    // Never destructive: unmappable sections are preserved as-is.
    const specInput: Record<string, unknown> = {}
    for (const key of [
      'specs_design', 'specs_display', 'specs_processor', 'specs_memory',
      'specs_camera', 'specs_battery', 'specs_connectivity', 'specs_software',
      'specs_network',
    ]) {
      if ((body as Record<string, unknown>)[key] !== undefined) specInput[key] = (body as Record<string, unknown>)[key]
    }
    const canonicalSpecs = canonicalizeSpecSections(specInput)
    const canonSection = (key: string): Record<string, unknown> =>
      (canonicalSpecs.sections[key] as Record<string, unknown> | undefined) ?? {}


    // Existing row is needed for the change history (§25) and to detect
    // which spec leaves the administrator corrected (§16 overrides).
    const { data: before } = await supabase
      .from('devices')
      .select('*')
      .eq('id', parseInt(id))
      .maybeSingle()

    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = body.name.trim()
    if (body.slug !== undefined) payload.slug = body.slug.trim()
    if (body.brand_id !== undefined) payload.brand_id = body.brand_id ?? null
    if (body.release_year !== undefined) payload.release_year = body.release_year ?? null
    if (body.price_tier !== undefined) payload.price_tier = body.price_tier ?? null
    if (body.major_category !== undefined) payload.major_category = majorCategory ?? null
    if (body.device_type_id !== undefined) payload.device_type_id = body.device_type_id ?? null
    if (body.price_kes !== undefined) payload.price_kes = body.price_kes ?? null
    if (body.price_usd !== undefined) payload.price_usd = body.price_usd ?? null
    if (body.tagline !== undefined) payload.tagline = body.tagline?.trim() ?? null
    if (body.status !== undefined) payload.status = body.status
    if (body.availability !== undefined) payload.availability = body.availability ?? null
    // Phone Database §13/§20 — variant + verification identity fields.
    if (body.model_number !== undefined) payload.model_number = body.model_number?.trim() ?? null
    if (body.variant_label !== undefined) payload.variant_label = body.variant_label?.trim() ?? null
    if (body.region !== undefined) payload.region = body.region?.trim() ?? null
    if (body.parent_device_id !== undefined) payload.parent_device_id = body.parent_device_id ?? null
    if (body.import_status !== undefined) payload.import_status = body.import_status
    if (body.verified_at !== undefined) payload.verified_at = body.verified_at ?? null
    if (body.score_display !== undefined) payload.score_display = body.score_display ?? null
    if (body.score_performance !== undefined) payload.score_performance = body.score_performance ?? null
    if (body.score_camera !== undefined) payload.score_camera = body.score_camera ?? null
    if (body.score_battery !== undefined) payload.score_battery = body.score_battery ?? null
    if (body.score_value !== undefined) payload.score_value = body.score_value ?? null
    // ── Score precedence (§48): the admin's Fweezy Score supersedes the
    // agent's computation in any event. ─────────────────────────────────────
    const scoreFieldsSent = [
      'score_display', 'score_performance', 'score_camera', 'score_battery', 'score_value',
    ].some((k) => (body as Record<string, unknown>)[k] !== undefined)
    const adminScored = [
      body.score_display, body.score_performance, body.score_camera,
      body.score_battery, body.score_value,
    ].some((v) => v != null)
    if (adminScored) {
      // Admin owns the score: write the weighted overall and mark it so the
      // engine (recalculateDevice) never overwrites scores_overall.
      payload.score_source = 'admin'
      payload.scores_overall = scoreOverall
    } else if (scoreFieldsSent) {
      // Admin cleared all five sub-scores — hand the score back to the agent.
      payload.score_source = 'engine'
      payload.scores_overall = null
    }
    // No score fields in the request (specs-only patch): scores_overall and
    // score_source stay untouched; the engine may mirror only if the score is
    // not admin-owned (guarded inside recalculateDevice).
    if (body.verdict_pros !== undefined) payload.verdict_pros = body.verdict_pros ?? []
    if (body.verdict_cons !== undefined) payload.verdict_cons = body.verdict_cons ?? []
    if (body.verdict_bottom_line !== undefined) payload.verdict_bottom_line = body.verdict_bottom_line?.trim() ?? null
    if (body.verdict_full !== undefined) payload.verdict_full = body.verdict_full?.trim() ?? null
    if (body.images !== undefined) payload.images = body.images ?? []
    if (body.specs_design !== undefined) payload.specs_design = canonSection('specs_design')
    if (body.specs_display !== undefined) payload.specs_display = canonSection('specs_display')
    if (body.specs_processor !== undefined) payload.specs_processor = canonSection('specs_processor')
    if (body.specs_memory !== undefined) payload.specs_memory = canonSection('specs_memory')
    if (body.specs_camera !== undefined) payload.specs_camera = canonSection('specs_camera')
    if (body.specs_battery !== undefined) payload.specs_battery = canonSection('specs_battery')
    if (body.specs_connectivity !== undefined) payload.specs_connectivity = canonSection('specs_connectivity')
    if (body.specs_software !== undefined) payload.specs_software = canonSection('specs_software')
    if (body.specs_network !== undefined) payload.specs_network = canonSection('specs_network')
    if (body.buy_links !== undefined) payload.buy_links = body.buy_links ?? []
    if (body.related_video_id !== undefined) payload.related_video_id = body.related_video_id?.trim() ?? null
    if (body.related_tiktok_url !== undefined) payload.related_tiktok_url = body.related_tiktok_url?.trim() ?? null
    if (body.seo_title !== undefined) payload.seo_title = body.seo_title?.trim() ?? null
    if (body.seo_description !== undefined) payload.seo_description = body.seo_description?.trim() ?? null

    const { data, error } = await supabase
      .from('devices')
      .update(payload)
      .eq('id', parseInt(id))
      .select('*, brand:brands(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // ── Audit + provenance + ranking (§16, §25, §30) ─────────────
    // All three are best-effort: a ranking/audit hiccup must not fail the save.
    const changedBy = adminUser.display_name ?? adminUser.id
    let changesRecorded = 0
    let overridesFlagged = 0
    let rankingTotal: number | null = null
    let benchmarksMoved: string[] = []
    let devicesRecalculated = 0
    if (before) {
      try {
        changesRecorded = await recordDeviceChanges(supabase, {
          deviceId: parseInt(id),
          before: before as Record<string, unknown>,
          payload,
          changedBy,
          reason: 'Admin edit via device form',
        })
        overridesFlagged = await flagManualOverrides(supabase, {
          deviceId: parseInt(id),
          before: before as Record<string, unknown>,
          payload,
        })
      } catch (err) {
        console.warn('[audit] device change recording failed:', (err as Error).message)
      }
      try {
        rankingTotal = await maybeRecalculateRanking(
          supabase,
          parseInt(id),
          before as Record<string, unknown>,
          payload,
        )
        // Admin handed the score back to the agent (cleared all sub-scores):
        // recompute immediately so the engine number reappears without waiting
        // for the next spec change.
        if (scoreFieldsSent && !adminScored) {
          await recalculateDevice(supabase, parseInt(id))
        }
        // Publishing can raise a global best → refresh + recalc everyone (§31).
        const bench = await maybeRefreshBenchmarksOnPublish(
          supabase,
          before as Record<string, unknown>,
          payload,
        )
        if (bench) {
          benchmarksMoved = bench.benchmarksMoved
          devicesRecalculated = bench.devicesRecalculated
        }
      } catch (err) {
        console.warn('[ranking] recalculation failed:', (err as Error).message)
      }
    }

    // Search index sync — index when published, evict when unpublished/draft so
    // /search never serves a device that is no longer live.
    try {
      const { syncDeviceIndex } = await import('@/lib/search/indexing')
      await syncDeviceIndex(data).catch(() => {})
    } catch {
      // Non-blocking: search indexing is optional
    }

    return NextResponse.json({
      data,
      audit: { changesRecorded, overridesFlagged, rankingTotal, benchmarksMoved, devicesRecalculated },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await getAdminClient()

    // Grab the slug first — the index key is `device:<slug>` and the row is
    // about to disappear.
    const { data: existing } = await supabase
      .from('devices')
      .select('slug')
      .eq('id', parseInt(id))
      .maybeSingle()

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Evict from the search + vector indexes so a deleted device can never be
    // served by /search again.
    if (existing?.slug) {
      try {
        const { removeFromIndex } = await import('@/lib/search/indexing')
        await removeFromIndex(`device:${existing.slug}`).catch(() => {})
      } catch {
        // Non-blocking: search indexing is optional
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
