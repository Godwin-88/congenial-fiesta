import { createClient } from '@supabase/supabase-js'
import { fetchUpstashTopQueries } from '@/lib/upstash/search'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function periodToMs(period: string): number {
  switch (period) {
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
    case '90d': return 90 * 24 * 60 * 60 * 1000
    default: return 30 * 24 * 60 * 60 * 1000
  }
}

function sinceISO(period: string): string {
  return new Date(Date.now() - periodToMs(period)).toISOString()
}

// Total page views in period
export async function getTotalPageViews(period: string): Promise<number> {
  const since = sinceISO(period)
  const { count } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
  return count ?? 0
}

// Page views per day for the period — for line chart
export async function getPageViewsOverTime(
  period: string
): Promise<Array<{ date: string; views: number }>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (!data) return []

  // Group by date
  const grouped: Record<string, number> = {}
  for (const row of data) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    grouped[date] = (grouped[date] ?? 0) + 1
  }

  // Zero-fill every day in the selected period so the trend line is continuous
  // (a gap day just means 0 views, not "no data" — a common analytics mistake)
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const now = new Date()
  const filled: Array<{ date: string; views: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    filled.push({ date: key, views: grouped[key] ?? 0 })
  }

  return filled
}

// Top N paths by view count in period
export async function getTopPages(
  period: string,
  limit: number = 20
): Promise<Array<{ path: string; views: number }>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)

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
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('source, platform')
    .gte('created_at', since)

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
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('device_type')
    .gte('created_at', since)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    const dt = row.device_type ?? 'unknown'
    grouped[dt] = (grouped[dt] ?? 0) + 1
  }

  return Object.entries(grouped).map(([deviceType, views]) => ({ deviceType, views }))
}

// Top affiliate pages by clicks in period — from raw affiliate_clicks (has created_at)
export async function getTopAffiliatePages(
  period: string,
  limit: number = 20
): Promise<Array<{ deviceSlug: string; retailer: string; clicks: number }>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('affiliate_clicks')
    .select('device_slug, retailer')
    .gte('created_at', since)

  if (!data) return []

  const grouped: Record<string, { deviceSlug: string; retailer: string; clicks: number }> = {}
  for (const row of data) {
    const key = `${row.device_slug}:${row.retailer}`
    if (!grouped[key]) grouped[key] = { deviceSlug: row.device_slug, retailer: row.retailer, clicks: 0 }
    grouped[key].clicks++
  }

  return Object.values(grouped)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)
}

// CTR per device page (affiliate clicks / page views)
export async function getAffiliateCTR(
  period: string
): Promise<Array<{ deviceSlug: string; clicks: number; views: number; ctr: number }>> {
  // Get clicks from raw affiliate_clicks (has created_at), group by device_slug
  const since = sinceISO(period)
  const { data: clickData } = await supabase
    .from('affiliate_clicks')
    .select('device_slug')
    .gte('created_at', since)

  if (!clickData || clickData.length === 0) return []

  // Group clicks by device_slug
  const clicksByDevice: Record<string, number> = {}
  for (const row of clickData) {
    clicksByDevice[row.device_slug] = (clicksByDevice[row.device_slug] ?? 0) + 1
  }

  // Get page views for /devices/ paths
  const { data: viewData } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)
    .like('path', '/devices/%')

  // Count views per device slug
  const viewsByDevice: Record<string, number> = {}
  if (viewData) {
    for (const row of viewData) {
      // Path shape: /devices/{brand}/{slug}
      const slug = row.path.replace('/devices/', '').split('/')[1] ?? row.path.replace('/devices/', '')
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

// Clicks per retailer for period — from raw affiliate_clicks (fresh, no cron dependency)
export async function getClicksByRetailer(
  period: string
): Promise<Array<{ retailer: string; clicks: number }>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('affiliate_clicks')
    .select('retailer')
    .gte('created_at', since)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    grouped[row.retailer] = (grouped[row.retailer] ?? 0) + 1
  }

  return Object.entries(grouped)
    .map(([retailer, clicks]) => ({ retailer, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
}

// Top search queries from the first-party search_queries table (logged in /api/search).
// (The previous Upstash "/analytics/top" REST call never existed → always returned [].)
export async function getTopSearchQueries(
  limit: number = 20
): Promise<Array<{ query: string; count: number }>> {
  // 1. Try Upstash Search native analytics first (Upstash-first).
  try {
    const upstash = await fetchUpstashTopQueries(limit)
    if (upstash.length > 0) return upstash
  } catch {
    // fall through
  }

  // 2. Supabase first-party search_queries fallback.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('search_queries')
    .select('query')
    .gte('created_at', since)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) {
    const key = row.query.trim().toLowerCase().slice(0, 200)
    if (!key) continue
    grouped[key] = (grouped[key] ?? 0) + 1
  }

  return Object.entries(grouped)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Funnel / drilldown / zero-report (derived from existing tables only)
// ─────────────────────────────────────────────────────────────────────────────

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

interface DeviceViewCount {
  slug: string
  brandSlug: string
  views: number
}

// Group /devices/{brand}/{slug} page views by device slug in period
async function loadDeviceViewCounts(period: string): Promise<DeviceViewCount[]> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)
    .like('path', '/devices/%')

  if (!data) return []

  const grouped: Record<string, DeviceViewCount> = {}
  for (const row of data) {
    // Path shape: /devices/{brand}/{slug} — slug may have trailing segments e.g. /compare
    const parts = row.path.replace('/devices/', '').split('/').filter(Boolean)
    const brandSlug = parts[0] ?? ''
    const slug = parts[1] ?? parts[0] ?? ''
    if (!slug) continue
    if (!grouped[slug]) grouped[slug] = { slug, brandSlug, views: 0 }
    grouped[slug].views++
  }

  return Object.values(grouped).sort((a, b) => b.views - a.views)
}

// Total affiliate clicks per device slug in period
async function loadAffiliateClickCounts(period: string): Promise<Map<string, number>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('affiliate_clicks')
    .select('device_slug')
    .gte('created_at', since)

  const map = new Map<string, number>()
  if (data) {
    for (const row of data) {
      map.set(row.device_slug, (map.get(row.device_slug) ?? 0) + 1)
    }
  }
  return map
}
// Views → device views → affiliate clicks conversion funnel for the period
export async function getFunnelMetrics(
  period: string
): Promise<{
  totalViews: number
  deviceViews: number
  clicks: number
  deviceToClickRate: number
}> {
  const [totalViews, deviceViews, clicks] = await Promise.all([
    getTotalPageViews(period),
    loadDeviceViewCounts(period).then((rows) => rows.reduce((sum, r) => sum + r.views, 0)),
    loadAffiliateClickCounts(period).then((m) => Array.from(m.values()).reduce((a, b) => a + b, 0)),
  ])
  return {
    totalViews,
    deviceViews,
    clicks,
    deviceToClickRate: deviceViews > 0 ? Math.round((clicks / deviceViews) * 100 * 100) / 100 :  0,
  }
}

// Revenue-leakage report: device pages with views but zero affiliate clicks in period
export async function getZeroReport(
  period: string,
  limit: number = 10
): Promise<Array<{ deviceSlug: string; brandSlug: string; views: number }>> {
  const [viewRows, clickMap] = await Promise.all([
    loadDeviceViewCounts(period),
    loadAffiliateClickCounts(period),
  ])

  return viewRows
    .filter((row) => (clickMap.get(row.slug) ?? 0) === 0)
    .slice(0, limit)
    .map((row) => ({
      deviceSlug: row.slug,
      brandSlug: row.brandSlug,
      views: row.views,
    }))
}

// Top devices by page views with affiliate CTR drilldown
export async function getTopDevices(
  period: string,
  limit: number = 20
): Promise<Array<{ deviceSlug: string; brandSlug: string; views: number; clicks: number; ctr: number }>> {
  const [viewRows, clickMap] = await Promise.all([
    loadDeviceViewCounts(period),
    loadAffiliateClickCounts(period),
  ])

  return viewRows
    .map((row) => {
      const clicks = clickMap.get(row.slug) ?? 0
      return {
        deviceSlug: row.slug,
        brandSlug: row.brandSlug,
        views: row.views,
        clicks,
        ctr: row.views > 0 ? Math.round((clicks / row.views) * 10000) / 100 :  0,
      }
    })
    .slice(0, limit)
}

// Top brands by device-page views (+ clicks via a catalog map — affiliate_clicks has no brand column)

export async function getTopBrands(
  period: string,
  limit: number = 15
): Promise<Array<{ brandSlug: string; brandName: string; views: number; clicks: number; ctr: number }>> {
  // Slug → brand map from the published devices catalog
  const { data: devices } = await supabase
    .from('devices')
    .select('slug, brand:brands(slug, name)')
    .eq('status', 'published')

  const slugToBrand = new Map<string, { slug: string; name: string | null }>()
  const brandNames = new Map<string, string>()
  if (devices) {
    for (const d of devices) {
      const brand = Array.isArray(d.brand) ? d.brand[0] : d.brand
      if (brand) {
        slugToBrand.set(d.slug, { slug: brand.slug, name: brand.name })
        if (brand.slug) brandNames.set(brand.slug, brand.name ?? titleCaseSlug(brand.slug))
      }
    }
  }

  const [viewRows, clickMap] = await Promise.all([
    loadDeviceViewCounts(period),
    loadAffiliateClickCounts(period),
  ])

  // Views by brand — brand slug already lives in the path (no map needed)；clicks by brand need the catalog map
  const viewsByBrand = new Map<string, number>()
  for (const row of viewRows) {
    if (!row.brandSlug) continue
    const currViews = viewsByBrand.get(row.brandSlug) ?? 0
    viewsByBrand.set(row.brandSlug, currViews + row.views)
  }
  const clicksByBrand = new Map<string, number>()
  for (const [slug, clicks] of Array.from(clickMap.entries())) {
    const brand = slugToBrand.get(slug)
    if (!brand?.slug) continue
    const currClicks = clicksByBrand.get(brand.slug) ?? 0
    clicksByBrand.set(brand.slug, currClicks + clicks)
  }
  const keys = new Set([...viewsByBrand.keys(), ...clicksByBrand.keys()])
  const rows: Array<{ brandSlug: string; brandName: string; views: number; clicks: number; ctr: number }> = []
  for (const brandSlug of keys) {
    const views = viewsByBrand.get(brandSlug) ??  0
    const clicks = clicksByBrand.get(brandSlug) ??  0
    rows.push({
      brandSlug,
      brandName: brandNames.get(brandSlug) ?? titleCaseSlug(brandSlug),
      views,
      clicks,
      ctr: views > 0 ? Math.round((clicks / views) * 10000) / 100 :  0,
    })
  }

  return rows.sort((a, b) => b.views - a.views).slice(0, limit)
}

export type ContentSection =
  | 'devices' | 'articles' | 'videos' | 'compare' | 'search' | 'other'

// Top pages tagged with a content section — for the Content & SEO tab
export async function getTopContentPages(
  period: string,
  limit: number = 150
): Promise<Array<{ path: string; section: ContentSection; views: number }>> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)

  if (!data) return []

  const grouped: Record<string, number> = {}
  for (const row of data) grouped[row.path] = (grouped[row.path] ?? 0) + 1

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, views]) => {
      let section: ContentSection = 'other'
      if (path.startsWith('/devices/')) section = 'devices'
      else if (path.startsWith('/articles/')) section = 'articles'
      else if (path.startsWith('/videos/')) section = 'videos'
      else if (path.startsWith('/compare')) section = 'compare'
      else if (path.startsWith('/search')) section = 'search'
      return { path, section, views }
    })
}