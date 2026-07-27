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

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const brand = searchParams.get('brand')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const page = parseInt(searchParams.get('page') ?? '1')
    const offset = (page - 1) * limit

    let query = supabase
      .from('devices')
      .select('*, brand:brands(*)', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && ['draft', 'published'].includes(status)) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (brand) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand)
        .single()
      if (brandData) {
        query = query.eq('brand_id', brandData.id)
      }
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }
    if (!body.slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    // Validate brand exists
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

    const weights = await getScoreWeights(supabase)
    const scoreOverall = computeOverallScore({
      display: body.score_display,
      performance: body.score_performance,
      camera: body.score_camera,
      battery: body.score_battery,
      value: body.score_value,
    }, weights)

    const payload: Record<string, unknown> = {
      name: body.name.trim(),
      slug: body.slug.trim(),
      brand_id: body.brand_id ?? null,
      release_year: body.release_year ?? null,
      category: body.category ?? null,
      price_kes: body.price_kes ?? null,
      price_usd: body.price_usd ?? null,
      tagline: body.tagline?.trim() ?? null,
      status: body.status ?? 'draft',
      score_display: body.score_display ?? null,
      score_performance: body.score_performance ?? null,
      score_camera: body.score_camera ?? null,
      score_battery: body.score_battery ?? null,
      score_value: body.score_value ?? null,
      score_overall: scoreOverall,
      verdict_pros: body.verdict_pros ?? [],
      verdict_cons: body.verdict_cons ?? [],
      verdict_bottom_line: body.verdict_bottom_line?.trim() ?? null,
      verdict_full: body.verdict_full?.trim() ?? null,
      images: body.images ?? [],
      specs_design: body.specs_design ?? {},
      specs_display: body.specs_display ?? {},
      specs_processor: body.specs_processor ?? {},
      specs_memory: body.specs_memory ?? {},
      specs_camera: body.specs_camera ?? {},
      specs_battery: body.specs_battery ?? {},
      specs_connectivity: body.specs_connectivity ?? {},
      specs_software: body.specs_software ?? {},
      benchmark_geekbench_single: body.benchmark_geekbench_single ?? null,
      benchmark_geekbench_multi: body.benchmark_geekbench_multi ?? null,
      benchmark_antutu: body.benchmark_antutu ?? null,
      benchmark_pcmark: body.benchmark_pcmark ?? null,
      buy_links: body.buy_links ?? [],
      related_video_id: body.related_video_id?.trim() ?? null,
      related_tiktok_url: body.related_tiktok_url?.trim() ?? null,
      seo_title: body.seo_title?.trim() ?? null,
      seo_description: body.seo_description?.trim() ?? null,
    }

    const { data, error } = await supabase
      .from('devices')
      .insert(payload)
      .select('*, brand:brands(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger search reindex if published
    if (body.status === 'published') {
      try {
        const { indexDevice } = await import('@/lib/search/indexing')
        await indexDevice(data).catch(() => {})
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
