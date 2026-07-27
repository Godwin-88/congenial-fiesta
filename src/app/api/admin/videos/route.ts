import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('published_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
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

    if (!body.title || !body.platform || !body.embed_id) {
      return NextResponse.json({ error: 'Title, platform, and embed ID are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title: body.title.trim(),
        platform: body.platform,
        embed_id: body.embed_id.trim(),
        thumbnail_url: body.thumbnail_url?.trim() ?? null,
        view_count: body.view_count ?? 0,
        duration: body.duration?.trim() ?? null,
        associated_device_id: body.associated_device_id ?? null,
        published_at: body.published_at ?? null,
        featured: body.featured ?? false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
