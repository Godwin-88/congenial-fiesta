import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

    const [viewsResult, clicksResult, topDeviceResult] = await Promise.all([
      supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay),
      // affiliate_click_stats has NO created_at column — query the raw clicks table
      supabase
        .from('affiliate_clicks')
        .select('retailer')
        .gte('created_at', startOfDay),
      // Top device page = MOST VIEWED device this period (not most recent)
      supabase
        .from('page_views')
        .select('path')
        .gte('created_at', startOfDay)
        .like('path', '/devices/%'),
    ])

    const pageViewsToday = viewsResult.count ?? 0
    const affiliateClicksWeek = clicksResult.data?.length ?? 0

    // Count device-page views, most-viewed first
    const deviceViews: Record<string, number> = {}
    for (const row of topDeviceResult.data ?? []) {
      deviceViews[row.path] = (deviceViews[row.path] ?? 0) + 1
    }
    const topDevicePath = Object.entries(deviceViews).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return NextResponse.json({
      pageViewsToday,
      topDevicePage: topDevicePath,
      affiliateClicksWeek,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
