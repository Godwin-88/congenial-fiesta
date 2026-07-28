import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    const payload: Record<string, unknown> = {}
    if (body.score_weight_display !== undefined) payload.score_weight_display = body.score_weight_display
    if (body.score_weight_performance !== undefined) payload.score_weight_performance = body.score_weight_performance
    if (body.score_weight_camera !== undefined) payload.score_weight_camera = body.score_weight_camera
    if (body.score_weight_battery !== undefined) payload.score_weight_battery = body.score_weight_battery
    if (body.score_weight_value !== undefined) payload.score_weight_value = body.score_weight_value
    if (body.admin_email !== undefined) payload.admin_email = body.admin_email?.trim() ?? null
    if (body.advertise_page_indexed !== undefined) payload.advertise_page_indexed = body.advertise_page_indexed

    const weightsSum =
      (typeof payload.score_weight_display === 'number' ? payload.score_weight_display : 0) +
      (typeof payload.score_weight_performance === 'number' ? payload.score_weight_performance : 0) +
      (typeof payload.score_weight_camera === 'number' ? payload.score_weight_camera : 0) +
      (typeof payload.score_weight_battery === 'number' ? payload.score_weight_battery : 0) +
      (typeof payload.score_weight_value === 'number' ? payload.score_weight_value : 0)

    if (
      payload.score_weight_display !== undefined ||
      payload.score_weight_performance !== undefined ||
      payload.score_weight_camera !== undefined ||
      payload.score_weight_battery !== undefined ||
      payload.score_weight_value !== undefined
    ) {
      if (Math.abs(weightsSum - 1) > 0.01) {
        return NextResponse.json(
          { error: `Score weights must sum to 1.00 (currently ${weightsSum.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('site_settings')
        .insert(payload)
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
