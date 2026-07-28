import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

    const [viewsResult, clicksResult] = await Promise.all([
      supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay),
      supabase
        .from('affiliate_click_stats')
        .select('click_count')
        .gte('created_at', startOfDay),
    ])

    const pageViewsToday = viewsResult.count ?? 0
    const affiliateClicksWeek = clicksResult.data?.reduce((sum, r) => sum + (r.click_count ?? 0), 0) ?? 0

    const { data: topDevicePage } = await supabase
      .from('page_views')
      .select('path')
      .gte('created_at', startOfDay)
      .like('path', '/devices/%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      pageViewsToday,
      topDevicePage: topDevicePage?.path ?? null,
      affiliateClicksWeek,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
