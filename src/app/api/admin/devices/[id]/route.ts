import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

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
    if (body.score_display !== undefined) payload.score_display = body.score_display ?? null
    if (body.score_performance !== undefined) payload.score_performance = body.score_performance ?? null
    if (body.score_camera !== undefined) payload.score_camera = body.score_camera ?? null
    if (body.score_battery !== undefined) payload.score_battery = body.score_battery ?? null
    if (body.score_value !== undefined) payload.score_value = body.score_value ?? null
    payload.scores_overall = scoreOverall
    if (body.verdict_pros !== undefined) payload.verdict_pros = body.verdict_pros ?? []
    if (body.verdict_cons !== undefined) payload.verdict_cons = body.verdict_cons ?? []
    if (body.verdict_bottom_line !== undefined) payload.verdict_bottom_line = body.verdict_bottom_line?.trim() ?? null
    if (body.verdict_full !== undefined) payload.verdict_full = body.verdict_full?.trim() ?? null
    if (body.images !== undefined) payload.images = body.images ?? []
    if (body.specs_design !== undefined) payload.specs_design = body.specs_design ?? {}
    if (body.specs_display !== undefined) payload.specs_display = body.specs_display ?? {}
    if (body.specs_processor !== undefined) payload.specs_processor = body.specs_processor ?? {}
    if (body.specs_memory !== undefined) payload.specs_memory = body.specs_memory ?? {}
    if (body.specs_camera !== undefined) payload.specs_camera = body.specs_camera ?? {}
    if (body.specs_battery !== undefined) payload.specs_battery = body.specs_battery ?? {}
    if (body.specs_connectivity !== undefined) payload.specs_connectivity = body.specs_connectivity ?? {}
    if (body.specs_software !== undefined) payload.specs_software = body.specs_software ?? {}
    if (body.specs_network !== undefined) payload.specs_network = body.specs_network ?? {}
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

    // Trigger search reindex if status changed to published
    if (body.status === 'published') {
      try {
        const { indexDevice } = await import('@/lib/search/indexing')
        await indexDevice(data).catch(() => {})
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ data })
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
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await getAdminClient()

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
