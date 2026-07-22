import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function periodToInterval(period: string): string {
  switch (period) {
    case '7d': return '7 days'
    case '30d': return '30 days'
    case '90d': return '90 days'
    default: return '30 days'
  }
}

// Total page views in period
export async function getTotalPageViews(period: string): Promise<number> {
  const interval = periodToInterval(period)
  const { count } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `now() - interval '${interval}'`)
  return count ?? 0
}

// Page views per day for the period — for line chart
export async function getPageViewsOverTime(
  period: string
): Promise<Array<{ date: string; views: number }>> {
  const interval = periodToInterval(period)
  const { data } = await supabase
    .from('page_views')
    .select('created_at')
    .gte('created_at', `now() - interval '${interval}'`)
    .order('created_at', { ascending: true })

  if (!data) return []

  // Group by date
  const grouped: Record<string, number> = {}
  for (const row of data) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    grouped[date] = (grouped[date] ?? 0) + 1
  }

  return Object.entries(grouped).map(([date, views]) => ({ date, views }))
}

// Top N paths by view count in period
export async function getTopPages(
  period: string,
  limit: number = 20
): Promise<Array<{ path: string; views: number }>> {
  const interval = periodToInterval(period)
  const { data } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', `now() - interval '${interval}'`)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    grouped[row.path] = (grouped[row.path] ?? 0) + 1
  }

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, views]) => ({ path, views }))
}

// Traffic source breakdown for period
export async function getTrafficSources(
  period: string
): Promise<Array<{ source: string; platform: string | null; views: number }>> {
  const interval = periodToInterval(period)
  const { data } = await supabase
    .from('page_views')
    .select('source, platform')
    .gte('created_at', `now() - interval '${interval}'`)

  if (!data) return []

  const grouped: Record<string, { source: string; platform: string | null; views: number }> = {}
  for (const row of data) {
    const key = `${row.source}:${row.platform ?? 'null'}`
    if (!grouped[key]) {
      grouped[key] = { source: row.source, platform: row.platform, views: 0 }
    }
    grouped[key].views++
  }

  return Object.values(grouped).sort((a, b) => b.views - a.views)
}

// Device type breakdown
export async function getDeviceTypeBreakdown(
  period: string
): Promise<Array<{ deviceType: string; views: number }>> {
  const interval = periodToInterval(period)
  const { data } = await supabase
    .from('page_views')
    .select('device_type')
    .gte('created_at', `now() - interval '${interval}'`)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    const dt = row.device_type ?? 'unknown'
    grouped[dt] = (grouped[dt] ?? 0) + 1
  }

  return Object.entries(grouped).map(([deviceType, views]) => ({ deviceType, views }))
}

// Top affiliate pages by clicks in period — from affiliate_click_stats
export async function getTopAffiliatePages(
  period: string,
  limit: number = 20
): Promise<Array<{ deviceSlug: string; retailer: string; clicks: number }>> {
  const { data } = await supabase
    .from('affiliate_click_stats')
    .select('device_slug, retailer, click_count')
    .eq('period', period)
    .order('click_count', { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map((r) => ({
    deviceSlug: r.device_slug,
    retailer: r.retailer,
    clicks: r.click_count,
  }))
}

// CTR per device page (affiliate clicks / page views)
export async function getAffiliateCTR(
  period: string
): Promise<Array<{ deviceSlug: string; clicks: number; views: number; ctr: number }>> {
  // Get clicks from affiliate_click_stats
  const { data: clickData } = await supabase
    .from('affiliate_click_stats')
    .select('device_slug, retailer, click_count')
    .eq('period', period === '90d' ? '90d' : period === '7d' ? '7d' : '30d')

  if (!clickData || clickData.length === 0) return []

  // Group clicks by device_slug
  const clicksByDevice: Record<string, number> = {}
  for (const row of clickData) {
    clicksByDevice[row.device_slug] = (clicksByDevice[row.device_slug] ?? 0) + row.click_count
  }

  // Get page views for /devices/ paths
  const interval = periodToInterval(period)
  const { data: viewData } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', `now() - interval '${interval}'`)
    .like('path', '/devices/%')

  // Count views per device slug
  const viewsByDevice: Record<string, number> = {}
  if (viewData) {
    for (const row of viewData) {
      const slug = row.path.replace('/devices/', '').split('/')[0]
      viewsByDevice[slug] = (viewsByDevice[slug] ?? 0) + 1
    }
  }

  const result: Array<{ deviceSlug: string; clicks: number; views: number; ctr: number }> = []
  for (const [deviceSlug, clicks] of Object.entries(clicksByDevice)) {
    const views = viewsByDevice[deviceSlug] ?? 0
    const ctr = views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0
    result.push({ deviceSlug, clicks, views, ctr })
  }

  return result.sort((a, b) => b.clicks - a.clicks)
}

// Clicks per retailer for period
export async function getClicksByRetailer(
  period: string
): Promise<Array<{ retailer: string; clicks: number }>> {
  const { data } = await supabase
    .from('affiliate_click_stats')
    .select('retailer, click_count')
    .eq('period', period)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    grouped[row.retailer] = (grouped[row.retailer] ?? 0) + row.click_count
  }

  return Object.entries(grouped)
    .map(([retailer, clicks]) => ({ retailer, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
}

// Top search queries from Upstash Search analytics
// Note: This requires Upstash Search with analytics enabled
export async function getTopSearchQueries(
  limit: number = 20
): Promise<Array<{ query: string; count: number }>> {
  try {
    const response = await fetch(
      `${process.env.UPSTASH_SEARCH_REST_URL}/analytics/top`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_SEARCH_REST_TOKEN}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    if (!Array.isArray(data)) return []

    return data.slice(0, limit).map((item: { term?: string; count?: number }) => ({
      query: item.term ?? 'unknown',
      count: item.count ?? 0,
    }))
  } catch {
    return []
  }
}