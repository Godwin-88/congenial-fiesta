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
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — FP-id audience, consideration intent, UTM campaigns, trust, revenue
// ─────────────────────────────────────────────────────────────────────────────

// Unique first-party visitors (distinct fp_id) + return rate in period
export async function getAudienceMetrics(
  period: string
): Promise<{ uniqueVisitors: number; returnRate: number }> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('page_views')
    .select('fp_id')
    .gte('created_at', since)

  const ids = new Set<string>()
  for (const row of data ?? []) {
    if (row.fp_id) ids.add(row.fp_id)
  }
  const uniqueVisitors = ids.size
  const totalViews = data?.length ?? 0
  const returnRate =
    totalViews > 0 ? Math.round(((totalViews - uniqueVisitors) / totalViews) * 10000) / 100 : 0
  return { uniqueVisitors, returnRate }
}

// Consideration intent from the interactions beacon (Phase 2)
export async function getConsiderationMetrics(
  period: string
): Promise<{
  total: number
  saves: number
  addToCompare: number
  watches: number
  relatedClicks: number
  topDevices: Array<{ deviceSlug: string; count: number }>
}> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('interactions')
    .select('action, device_slug')
    .gte('created_at', since)

  const rows = data ?? []
  let saves = 0
  let addToCompare = 0
  let watches = 0
  let relatedClicks = 0
  const perDevice: Record<string, number> = {}
  for (const row of rows) {
    if (row.action === 'save') saves++
    else if (row.action === 'add_to_compare') addToCompare++
    else if (row.action === 'watch') watches++
    else if (row.action === 'related_click') relatedClicks++
    if (row.device_slug) perDevice[row.device_slug] = (perDevice[row.device_slug] ?? 0) + 1
  }
  const topDevices = Object.entries(perDevice)
    .map(([deviceSlug, count]) => ({ deviceSlug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  return { total: rows.length, saves, addToCompare, watches, relatedClicks, topDevices }
}
// UTM campaign channel mix — page views + affiliate clicks attributed by UTM
export async function getCampaignMetrics(
  period: string
): Promise<Array<{ source: string; medium: string; campaign: string; views: number; clicks: number }>> {
  const since = sinceISO(period)
  const [views, clicks] = await Promise.all([
    supabase.from('page_views').select('utm_source, utm_medium, utm_campaign').gte('created_at', since),
    supabase.from('affiliate_clicks').select('utm_source, utm_medium, utm_campaign').gte('created_at', since),
  ])

  const rows = new Map<string, { source: string; medium: string; campaign: string; views: number; clicks: number }>()
  const keyOf = (s: string | null, m: string | null, c: string | null) => `${s ?? '(direct)'}::${m ?? ''}::${c ?? ''}`

  for (const row of views.data ?? []) {
    const key = keyOf(row.utm_source, row.utm_medium, row.utm_campaign)
    const cur = rows.get(key) ?? {
      source: row.utm_source ?? '(direct)',
      medium: row.utm_medium ?? '',
      campaign: row.utm_campaign ?? '',
      views: 0,
      clicks: 0,
    }
    cur.views++
    rows.set(key, cur)
  }
  for (const row of clicks.data ?? []) {
    const key = keyOf(row.utm_source, row.utm_medium, row.utm_campaign)
    const cur = rows.get(key)
    if (cur) cur.clicks++
  }

  return Array.from(rows.values()).sort((a, b) => b.views - a.views).slice(0, 15)
}

// Trust coverage — % of published devices with at least one rating or comment in period
export async function getTrustMetrics(
  period: string
): Promise<{
  ratedDevices: number
  commentedDevices: number
  coveredDevices: number
  totalDevices: number
  coveragePct: number
}> {
  const since = sinceISO(period)
  const { count: totalDevices } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  const { data: ratings } = await supabase
    .from('device_ratings')
    .select('device_slug')
    .gte('created_at', since)
  const { data: comments } = await supabase
    .from('comments')
    .select('content_slug')
    .eq('content_type', 'device')
    .gte('created_at', since)

  const rated = new Set<string>()
  for (const r of ratings ?? []) rated.add(r.device_slug)
  const commented = new Set<string>()
  for (const c of comments ?? []) commented.add(c.content_slug)

  const covered = new Set([...rated, ...commented])
  const total = totalDevices ?? 0
  return {
    ratedDevices: rated.size,
    commentedDevices: commented.size,
    coveredDevices: covered.size,
    totalDevices: total,
    coveragePct: total > 0 ? Math.round((covered.size / total) * 10000) / 100 : 0,
  }
}
// Revenue proxy — commission-weighted clicks (clicks × retailer commission rate)
export async function getRevenueProxy(
  period: string
): Promise<{ weightedClicks: number; byRetailer: Array<{ retailer: string; clicks: number; rate: number; weighted: number }> }> {
  const since = sinceISO(period)
  const { data: clicks } = await supabase
    .from('affiliate_clicks')
    .select('retailer')
    .gte('created_at', since)
  const { data: rates } = await supabase
    .from('affiliate_commission_rates')
    .select('retailer, rate')

  const clickCounts: Record<string, number> = {}
  for (const row of clicks ?? []) clickCounts[row.retailer] = (clickCounts[row.retailer] ?? 0) + 1
  const rateMap = new Map<string, number>()
  for (const r of rates ?? []) rateMap.set(r.retailer, Number(r.rate))

  const byRetailer = Object.entries(clickCounts)
    .map(([retailer, count]) => {
      const rate = rateMap.get(retailer) ?? 0
      return { retailer, clicks: count, rate, weighted: Math.round(count * rate * 100) / 100 }
    })
    .sort((a, b) => b.weighted - a.weighted)
  const weightedClicks = Math.round(byRetailer.reduce((sum, r) => sum + r.weighted, 0) * 100) / 100
  return { weightedClicks, byRetailer }
}

// Zero-result & weak-result queries — feeds the content backlog
export async function getSearchQuality(
  period: string,
  limit: number = 10
): Promise<{ zeroResult: Array<{ query: string; count: number }>; avgResults: number }> {
  const since = sinceISO(period)
  const { data } = await supabase
    .from('search_queries')
    .select('query, results_count, zero_result')
    .gte('created_at', since)

  const rows = data ?? []
  const zero: Record<string, number> = {}
  let totalResults = 0
  for (const row of rows) {
    if (row.zero_result) zero[row.query] = (zero[row.query] ?? 0) + 1
    totalResults += row.results_count ?? 0
  }
  const zeroResult = Object.entries(zero)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
  const avgResults = rows.length > 0 ? Math.round((totalResults / rows.length) * 100) / 100 : 0
  return { zeroResult, avgResults }
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Qualification analytics / finance reconciliation / link health
// ─────────────────────────────────────────────────────────────────────────────

// Weighted first-party intent score per visitor (MQL-equivalent).
// Signals: compare(3) · save(2) · watch(1) · related_click(1) · affiliate click(2)
// A signed-in visitor (user_id present) gets a +2 trust bonus.
export interface QualifiedLead {
  fpId: string
  score: number
  bucket: 'hot' | 'warm' | 'cold'
  signedIn: boolean
  compares: number
  saves: number
  watches: number
  relatedClicks: number
  affiliateClicks: number
  lastSeenAt?: string
}

const INTENT_WEIGHT: Record<string, number> = {
  add_to_compare: 3,
  save: 2,
  watch: 1,
  related_click: 1,
}

const bucketScore = (score: number): QualifiedLead['bucket'] =>
  score >= 8 ? 'hot' : score >= 4 ? 'warm' : 'cold'

// High-intent audience — the qualification scoreboard. Feeds the CRM/high-intent export.
export async function getQualifiedLeads(
  period: string,
  limit: number = 25,
): Promise<QualifiedLead[]> {
  const since = sinceISO(period)
  const { data: interactions } = await supabase
    .from('interactions')
    .select('fp_id, action, user_id, created_at')
    .not('fp_id', 'is', null)
    .gte('created_at', since)
  const { data: clicks } = await supabase
    .from('affiliate_clicks')
    .select('fp_id')
    .not('fp_id', 'is', null)
    .gte('created_at', since)

  const leads = new Map<string, QualifiedLead & { lastSeen: number }>()

  const touch = (fpId: string, createdAt?: string) => {
    const existing = leads.get(fpId)
    const seen = createdAt ? new Date(createdAt).getTime() : Date.now()
    if (existing) {
      existing.lastSeen = Math.max(existing.lastSeen, seen)
    } else {
      leads.set(fpId, {
        fpId,
        score: 0,
        bucket: 'cold',
        signedIn: false,
        compares: 0,
        saves: 0,
        watches: 0,
        relatedClicks: 0,
        affiliateClicks: 0,
        lastSeen: seen,
      })
    }
  }

  for (const row of interactions ?? []) {
    if (!row.fp_id) continue
    touch(row.fp_id, row.created_at)
    const lead = leads.get(row.fp_id)!
    const weight = INTENT_WEIGHT[row.action] ?? 0
    lead.score += weight
    switch (row.action) {
      case 'add_to_compare': lead.compares++ ; break
      case 'save': lead.saves++ ; break
      case 'watch': lead.watches++ ; break
      case 'related_click': lead.relatedClicks++ ; break
    }
    if (row.user_id) lead.signedIn = true
  }

  for (const row of clicks ?? []) {
    if (!row.fp_id) continue
    touch(row.fp_id)
    const lead = leads.get(row.fp_id)!
    lead.affiliateClicks++
    lead.score += 2
  }

  for (const lead of leads.values()) {
    if (lead.signedIn) lead.score += 2
    lead.bucket = bucketScore(lead.score)
  }

  return Array.from(leads.values())
    .sort((a, b) => b.score - a.score || b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map(({ lastSeen, ...l }) => ({
      ...l,
      lastSeenAt: new Date(lastSeen).toISOString(),
    }))
}
// Finance reconciliation — estimated revenue proxy vs actual imported affiliate earnings.
export interface EarningsReconciliationRow {
  retailer: string
  clicks: number
  proxyWeighted: number
  actualEarnings: number
  variance: number
}

export interface EarningsReconciliation {
  rows: EarningsReconciliationRow[]
  totalProxy: number
  totalActual: number
  totalVariance: number
}

export async function getEarningsReconciliation(period: string): Promise<EarningsReconciliation> {
  const since = sinceISO(period)
  const proxy = await getRevenueProxy(period)
  const { data: earnings } = await supabase
    .from('affiliate_earnings')
    .select('retailer, commission_amount')
    .gte('imported_at', since)

  const actualByRetailer = new Map<string, number>()
  for (const row of earnings ?? []) {
    const retailer = String(row.retailer ?? '')
    if (!retailer) continue
    actualByRetailer.set(retailer, (actualByRetailer.get(retailer) ?? 0) + Number(row.commission_amount ?? 0))
  }

  const rows: EarningsReconciliationRow[] = proxy.byRetailer.map((p) => {
    const actual = actualByRetailer.get(p.retailer) ?? 0
    return {
      retailer: p.retailer,
      clicks: p.clicks,
      proxyWeighted: p.weighted,
      actualEarnings: Math.round(actual * 100) / 100,
      variance: Math.round((p.weighted - actual) * 100) / 100,
    }
  })

  const totalProxy = Math.round(rows.reduce((s, r) => s + r.proxyWeighted, 0) * 100) / 100
  const totalActual = Math.round(rows.reduce((s, r) => s + r.actualEarnings, 0) * 100) / 100
  return {
    rows,
    totalProxy,
    totalActual,
    totalVariance: Math.round((totalProxy - totalActual) * 100) / 100,
  }
}
// Buy-link health from the link-health cron (HEAD checks of outbound URLs).
export interface LinkHealthItem {
  deviceSlug: string
  retailer: string
  url: string
  statusCode: number | null
  ok: boolean
  checkedAt: string | null
}

export interface LinkHealthSummary {
  total: number
  ok: number
  broken: number
  lastCheckedAt: string | null
}

export async function getLinkHealthSummary(limit: number = 10): Promise<{
  summary: LinkHealthSummary
  brokenLinks: LinkHealthItem[]
}> {
  const { data } = await supabase
    .from('link_health_checks')
    .select('device_slug, retailer, url, status_code, ok, checked_at')
    .order('checked_at', { ascending: false })
    .limit(250)

  const rows = data ?? []
  const ok = rows.filter((r) => Boolean(r.ok)).length
  const broken = rows.length - ok
  const latest = rows[0]?.checked_at ? new Date(rows[0].checked_at).toISOString() : null

  const seen = new Set<string>()
  const brokenLinks: LinkHealthItem[] = []
  for (const row of rows) {
    if (row.ok) continue
    if (brokenLinks.length >= limit) break
    const key = `${row.device_slug}::${row.retailer}`
    if (seen.has(key)) continue
    seen.add(key)
    brokenLinks.push({
      deviceSlug: String(row.device_slug ?? ''),
      retailer: String(row.retailer ?? ''),
      url: String(row.url ?? ''),
      statusCode: row.status_code,
      ok: Boolean(row.ok),
      checkedAt: row.checked_at ? new Date(row.checked_at).toISOString() : null,
    })
  }

  return {
    summary: {
      total: rows.length,
      ok,
      broken,
      lastCheckedAt: latest,
    },
    brokenLinks,
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 - Goals, Alerts & Automation engine
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertRule {
  id: number
  name: string
  kpi: string
  operator: 'gt' | 'lt'
  threshold: number
  period: string
  enabled: boolean
  description: string | null
}

export interface AlertEvent {
  id: number
  ruleId: number
  ruleName: string
  kpi: string
  operator: string
  value: number
  threshold: number
  period: string
  firedAt: string
  acknowledgedAt: string | null
}

export interface AlertBreach {
  ruleId: number
  ruleName: string
  kpi: string
  operator: 'gt' | 'lt'
  threshold: number
  value: number
  period: string
}

function mapAlertRule(row: Record<string, unknown>): AlertRule {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    kpi: String(row.kpi ?? ''),
    operator: row.operator === 'lt' ? 'lt' : 'gt',
    threshold: Number(row.threshold ?? 0),
    period: String(row.period ?? '30d'),
    enabled: Boolean(row.enabled),
    description: row.description ? String(row.description) : null,
  }
}

function mapAlertEvent(row: Record<string, unknown>): AlertEvent {
  return {
    id: Number(row.id),
    ruleId: Number(row.rule_id),
    ruleName: String(row.rule_name ?? ''),
    kpi: String(row.kpi ?? ''),
    operator: String(row.operator ?? 'gt'),
    value: Number(row.value ?? 0),
    threshold: Number(row.threshold ?? 0),
    period: String(row.period ?? ''),
    firedAt: row.fired_at ? new Date(String(row.fired_at)).toISOString() : '',
    acknowledgedAt: row.acknowledged_at ? new Date(String(row.acknowledged_at)).toISOString() : null,
  }
}

export async function getAlertRules(): Promise<AlertRule[]> {
  const { data } = await supabase
    .from('analytics_alert_rules')
    .select('*')
    .order('id', { ascending: true })
  return (data ?? []).map(mapAlertRule)
}

export async function listAlertEvents(limit = 20): Promise<AlertEvent[]> {
  const { data } = await supabase
    .from('alert_events')
    .select('*')
    .order('fired_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(mapAlertEvent)
}

// Total page views attributable to device pages that produced zero affiliate
// clicks in the period - the full revenue-leakage number (unlimited).
export async function getZeroReportCount(period: string): Promise<number> {
  const [viewRows, clickMap] = await Promise.all([
    loadDeviceViewCounts(period),
    loadAffiliateClickCounts(period),
  ])
  return viewRows
    .filter((row) => (clickMap.get(row.slug) ?? 0) === 0)
    .reduce((sum, row) => sum + row.views, 0)
}

// All KPI signals the rule engine can threshold. Computed once per period.
export async function computeAlertKpiValues(period: string): Promise<Record<string, number>> {
  const [funnel, audience, consideration, trust, revenue, searchQuality, zeroReportCount, qualifiedLeads, linkHealth] =
    await Promise.all([
      getFunnelMetrics(period),
      getAudienceMetrics(period),
      getConsiderationMetrics(period),
      getTrustMetrics(period),
      getRevenueProxy(period),
      getSearchQuality(period, 10000),
      getZeroReportCount(period),
      getQualifiedLeads(period, 10000),
      getLinkHealthSummary(1000),
    ])

  return {
    views: funnel.totalViews,
    unique_visitors: audience.uniqueVisitors,
    return_rate: audience.returnRate,
    device_views: funnel.deviceViews,
    affiliate_clicks: funnel.clicks,
    device_to_ctr: funnel.deviceToClickRate,
    revenue_proxy: revenue.weightedClicks,
    zero_report: zeroReportCount,
    search_gap: searchQuality.zeroResult.reduce((sum, row) => sum + row.count, 0),
    consideration_events:
      consideration.saves + consideration.addToCompare + consideration.watches + consideration.relatedClicks,
    trust_coverage: trust.coveragePct,
    hot_leads: qualifiedLeads.filter((lead) => lead.bucket === 'hot').length,
    broken_links: linkHealth.summary.broken,
  }
}

// Evaluate enabled rules and persist any new breaches (once per rule + period -
// the alert_events unique index enforces dedupe at the DB level too).
export async function evaluateAlerts(): Promise<AlertBreach[]> {
  const rules = (await getAlertRules()).filter((rule) => rule.enabled)
  if (rules.length === 0) return []

  // Deduplicate: don't re-fire a rule that already has an event for its period.
  const ruleIds = rules.map((rule) => rule.id)
  const { data: existing } = await supabase
    .from('alert_events')
    .select('rule_id, period')
    .in('rule_id', ruleIds)
  const seen = new Set((existing ?? []).map((row) => `${String(row.rule_id)}:${String(row.period)}`))

  const periods = Array.from(new Set(rules.map((rule) => rule.period)))
  const valueCache = new Map<string, Record<string, number>>()
  for (const period of periods) {
    valueCache.set(period, await computeAlertKpiValues(period))
  }

  const breaches: AlertBreach[] = []
  for (const rule of rules) {
    if (seen.has(`${rule.id}:${rule.period}`)) continue
    const values = valueCache.get(rule.period) ?? {}
    const value = values[rule.kpi]
    if (value === undefined) continue
    const hit = rule.operator === 'gt' ? value > rule.threshold : value < rule.threshold
    if (!hit) continue
    breaches.push({
      ruleId: rule.id,
      ruleName: rule.name,
      kpi: rule.kpi,
      operator: rule.operator,
      threshold: Number(rule.threshold),
      value,
      period: rule.period,
    })
  }

  if (breaches.length > 0) {
    const { error } = await supabase.from('alert_events').insert(
      breaches.map((breach) => ({
        rule_id: breach.ruleId,
        rule_name: breach.ruleName,
        kpi: breach.kpi,
        operator: breach.operator,
        threshold: breach.threshold,
        value: breach.value,
        period: breach.period,
      }))
    )
    if (error) {
      console.error('[alerts] failed to persist breaches:', error.message)
    }
  }

  return breaches
}

export async function acknowledgeAlert(eventId: number): Promise<boolean> {
  const { error } = await supabase
    .from('alert_events')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', eventId)
  return !error
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 - Data retention & purge policy + alert-rule lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export interface RetentionPolicyRow {
  table: string
  retentionDays: number
  enabled: boolean
}

export interface RetentionTableStatus extends RetentionPolicyRow {
  rows: number
  purgable: number
  oldestAt: string | null
}

export interface PurgeResult {
  purged: Array<{ table: string; rows: number; retentionDays: number }>
  total: number
}

const RETENTION_TABLES: Array<{ table: string; hasFpId: boolean }> = [
  { table: 'page_views', hasFpId: true },
  { table: 'affiliate_clicks', hasFpId: true },
  { table: 'interactions', hasFpId: true },
  { table: 'search_queries', hasFpId: false },
]

function mapRetentionPolicy(row: Record<string, unknown>): RetentionPolicyRow {
  return {
    table: String(row.table_name ?? ''),
    retentionDays: Number(row.retention_days ?? 730),
    enabled: Boolean(row.enabled),
  }
}

export async function getRetentionPolicies(): Promise<RetentionPolicyRow[]> {
  const { data } = await supabase.from('retention_policy').select('*').order('id', { ascending: true })
  const rows = (data ?? []).map(mapRetentionPolicy)
  // Always return one entry per known raw table, defaulting missing policies.
  for (const { table } of RETENTION_TABLES) {
    if (!rows.some((r) => r.table === table)) rows.push({ table, retentionDays: 730, enabled: false })
  }
  return rows
}

async function cutoffFor(policy: RetentionPolicyRow): Promise<string> {
  return new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000).toISOString()
}

// Per-table row counts + purgable (older than TTL) counts. Read-only.
export async function getRetentionStatus(): Promise<RetentionTableStatus[]> {
  const policies = await getRetentionPolicies()
  const status: RetentionTableStatus[] = []
  for (const policy of policies) {
    const { table } = policy
    const { count: rows } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    const cutoff = await cutoffFor(policy)
    const { count: purgable } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff)
    const { data: oldestRow } = await supabase
      .from(table)
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
    status.push({
      ...policy,
      rows: rows ?? 0,
      purgable: purgable ?? 0,
      oldestAt: oldestRow && oldestRow.length > 0 ? new Date(String(oldestRow[0].created_at)).toISOString() : null,
    })
  }
  return status
}

async function logRetention(action: 'purge' | 'expunge', rows: Array<{ table: string; count: number }>, extra: { triggeredBy: string; fpId?: string; olderThan?: string; note?: string }) {
  for (const row of rows) {
    if (row.count === 0) continue
    await supabase
      .from('data_retention_log')
      .insert({
        action,
        table_name: row.table,
        rows_affected: row.count,
        older_than: extra.olderThan,
        fp_id: extra.fpId,
        triggered_by: extra.triggeredBy,
        note: extra.note,
      })
  }
}

// Hard-delete raw events past their per-table TTL. dryRun computes the counts
// without deleting or logging - the admin UI defaults to a dry-run preview.
export async function purgeExpiredRawEvents(dryRun = false, triggeredBy = 'cron'): Promise<PurgeResult> {
  const policies = await getRetentionPolicies()
  const purged: Array<{ table: string; rows: number; retentionDays: number }> = []

  for (const policy of policies) {
    if (!policy.enabled) continue
    const cutoff = await cutoffFor(policy)
    const { count: purgable } = await supabase
      .from(policy.table)
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoff)
    const rows = purgable ?? 0

    if (rows > 0 && !dryRun) {
      const { error } = await supabase.from(policy.table).delete().lt('created_at', cutoff)
      if (error) {
        console.error(`[retention] purge failed on ${policy.table}:`, error.message)
        continue
      }
    }
    if (rows > 0) {
      purged.push({ table: policy.table, rows, retentionDays: policy.retentionDays })
      if (!dryRun) {
        await logRetention('purge', [{ table: policy.table, count: rows }], {
          triggeredBy,
          olderThan: cutoff,
          note: `TTL ${policy.retentionDays}d`,
        })
      }
    }
  }

  return {
    purged: purged.sort((a, b) => b.rows - a.rows),
    total: purged.reduce((sum, row) => sum + row.rows, 0),
  }
}

// Expunge-on-request (Kenya DPA): remove every raw event bound to one fp_id
// across all first-party stores that carry it. Append-only audit written.
export async function expungeVisitorData(fpId: string, triggeredBy = 'admin'): Promise<PurgeResult> {
  const trimmed = fpId.trim()
  if (!trimmed) return { purged: [], total: 0 }

  const purged: Array<{ table: string; rows: number; retentionDays: number }> = []
  for (const { table, hasFpId } of RETENTION_TABLES) {
    if (!hasFpId) continue
    const { count: matching } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('fp_id', trimmed)
    const rows = matching ?? 0
    if (rows === 0) continue

    const { error } = await supabase.from(table).delete().eq('fp_id', trimmed)
    if (error) {
      console.error(`[retention] expunge failed on ${table}:`, error.message)
      continue
    }
    purged.push({ table, rows, retentionDays: 0 })
    await logRetention('expunge', [{ table, count: rows }], {
      triggeredBy,
      fpId: trimmed,
      note: 'DPA expunge-on-request',
    })
  }

  return { purged: purged.sort((a, b) => b.rows - a.rows), total: purged.reduce((sum, row) => sum + row.rows, 0) }
}
export interface RetentionLogRow {
  id: number
  action: string
  table: string | null
  rows: number
  olderThan: string | null
  fpId: string | null
  triggeredBy: string
  note: string | null
  createdAt: string
}

export async function listRetentionLog(limit = 10): Promise<RetentionLogRow[]> {
  const { data } = await supabase
    .from('data_retention_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    action: String(row.action ?? ''),
    table: row.table_name ? String(row.table_name) : null,
    rows: Number(row.rows_affected ?? 0),
    olderThan: row.older_than ? new Date(String(row.older_than)).toISOString() : null,
    fpId: row.fp_id ? String(row.fp_id) : null,
    triggeredBy: String(row.triggered_by ?? ''),
    note: row.note ? String(row.note) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }))
}

// ── Alert-rule lifecycle (Goals & Alerts tab) ───────────────────────────────

export interface AlertRuleInput {
  name: string
  kpi: string
  operator: 'gt' | 'lt'
  threshold: number
  period: string
  description?: string | null
}

export async function createAlertRule(input: AlertRuleInput): Promise<AlertRule | null> {
  const { data, error } = await supabase
    .from('analytics_alert_rules')
    .insert({
      name: input.name,
      kpi: input.kpi,
      operator: input.operator,
      threshold: input.threshold,
      period: input.period,
      description: input.description ?? null,
    })
    .select()
    .single()
  if (error) {
    console.error('[rules] create failed:', error.message)
    return null
  }
  return mapAlertRule(data as Record<string, unknown>)
}

export async function updateAlertRule(id: number, patch: Partial<AlertRuleInput> & { enabled?: boolean }): Promise<AlertRule | null> {
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) fields.name = patch.name
  if (patch.kpi !== undefined) fields.kpi = patch.kpi
  if (patch.operator !== undefined) fields.operator = patch.operator
  if (patch.threshold !== undefined) fields.threshold = patch.threshold
  if (patch.period !== undefined) fields.period = patch.period
  if (patch.description !== undefined) fields.description = patch.description
  if (patch.enabled !== undefined) fields.enabled = patch.enabled

  const { data, error } = await supabase
    .from('analytics_alert_rules')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('[rules] update failed:', error.message)
    return null
  }
  return mapAlertRule(data as Record<string, unknown>)
}

export async function deleteAlertRule(id: number): Promise<boolean> {
  const { error } = await supabase.from('analytics_alert_rules').delete().eq('id', id)
  if (error) console.error('[rules] delete failed:', error.message)
  return !error
}
