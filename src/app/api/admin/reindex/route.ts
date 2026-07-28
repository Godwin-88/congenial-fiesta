import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { indexDevice, indexArticle, indexVideo } from '@/lib/search/indexing'

export async function POST() {
  try {
    await requireAdminAuth()
    const supabase = getAdminClient()

    const [
      { data: devices },
      { data: articles },
      { data: videos },
    ] = await Promise.all([
      supabase.from('devices').select('*').eq('status', 'published'),
      supabase.from('articles').select('*').eq('status', 'published'),
      supabase.from('videos').select('id, title, thumbnail_url, published_at, created_at'),
    ])

    const results = await Promise.all([
      ...(devices ?? []).map((d) => indexDevice(d as unknown as Parameters<typeof indexDevice>[0]).catch(() => {})),
      ...(articles ?? []).map((a) => indexArticle(a as unknown as Parameters<typeof indexArticle>[0]).catch(() => {})),
      ...(videos ?? []).map((v) => indexVideo(v as unknown as Parameters<typeof indexVideo>[0]).catch(() => {})),
    ])

    return NextResponse.json({
      success: true,
      indexed: results.length,
      devices: devices?.length ?? 0,
      articles: articles?.length ?? 0,
      videos: videos?.length ?? 0,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
