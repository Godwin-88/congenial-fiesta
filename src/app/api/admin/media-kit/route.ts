import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('media_kit')
      .select('*')
      .order('id', { ascending: false })
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

    const { data: existing } = await supabase
      .from('media_kit')
      .select('id')
      .limit(1)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('media_kit')
        .update({
          short_bio: body.short_bio?.trim() ?? null,
          long_bio: body.long_bio?.trim() ?? null,
          total_followers: body.total_followers?.trim() ?? null,
          total_views: body.total_views?.trim() ?? null,
          years_active: body.years_active ?? null,
          youtube_followers: body.youtube_followers?.trim() ?? null,
          tiktok_followers: body.tiktok_followers?.trim() ?? null,
          instagram_followers: body.instagram_followers?.trim() ?? null,
          facebook_followers: body.facebook_followers?.trim() ?? null,
          logo_light_url: body.logo_light_url?.trim() ?? null,
          logo_dark_url: body.logo_dark_url?.trim() ?? null,
          logo_svg_light_url: body.logo_svg_light_url?.trim() ?? null,
          logo_svg_dark_url: body.logo_svg_dark_url?.trim() ?? null,
          headshots: body.headshots ?? [],
          brand_colours: body.brand_colours ?? [],
          active: body.active ?? true,
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('media_kit')
        .insert({
          short_bio: body.short_bio?.trim() ?? null,
          long_bio: body.long_bio?.trim() ?? null,
          total_followers: body.total_followers?.trim() ?? null,
          total_views: body.total_views?.trim() ?? null,
          years_active: body.years_active ?? null,
          youtube_followers: body.youtube_followers?.trim() ?? null,
          tiktok_followers: body.tiktok_followers?.trim() ?? null,
          instagram_followers: body.instagram_followers?.trim() ?? null,
          facebook_followers: body.facebook_followers?.trim() ?? null,
          logo_light_url: body.logo_light_url?.trim() ?? null,
          logo_dark_url: body.logo_dark_url?.trim() ?? null,
          logo_svg_light_url: body.logo_svg_light_url?.trim() ?? null,
          logo_svg_dark_url: body.logo_svg_dark_url?.trim() ?? null,
          headshots: body.headshots ?? [],
          brand_colours: body.brand_colours ?? [],
          active: body.active ?? true,
        })
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
