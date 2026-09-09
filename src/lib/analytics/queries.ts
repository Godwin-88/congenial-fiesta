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
    .map(([path, views]) => ({ path, section: classifySection(path), views }))
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
// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Explore (GA4-style builder) · earnings CSV import · scheduled exports
// ─────────────────────────────────────────────────────────────────────────────

export const EXPLORE_METRICS: Array<{ id: string; label: string; table: string }> = [
  { id: 'views', label: 'Page Views', table: 'page_views' },
  { id: 'unique_visitors', label: 'Unique Visitors', table: 'page_views' },
  { id: 'clicks', label: 'Affiliate Clicks', table: 'affiliate_clicks' },
  { id: 'revenue_proxy', label: 'Revenue Proxy (KES)', table: 'affiliate_clicks' },
  { id: 'saves', label: 'Saves', table: 'interactions' },
  { id: 'add_to_compare', label: 'Add to Compare', table: 'interactions' },
  { id: 'watches', label: 'Video Watches', table: 'interactions' },
  { id: 'related_clicks', label: 'Related-Device Clicks', table: 'interactions' },
]

export const EXPLORE_DIMENSIONS: Array<{ id: string; label: string }> = [
  { id: 'date', label: 'Date (daily)' },
  { id: 'path', label: 'Page path' },
  { id: 'device', label: 'Device' },
  { id: 'retailer', label: 'Retailer' },
  { id: 'source_medium', label: 'Source / Medium' },
  { id: 'section', label: 'Content section' },
  { id: 'action', label: 'Intent action' },
]

const INTERACTION_ACTIONS = new Set(['saves', 'add_to_compare', 'watches', 'related_clicks'])

export interface ExploreRow {
  label: string
  value: number
  sharePct: number
}

export interface ExploreResult {
  metric: string
  dimension: string
  total: number
  rows: ExploreRow[]
}

// GA4-style explorer: count a metric, broken down by a dimension, for a period.
// Pure JS aggregation (like getCampaignMetrics) — no new tables or indexes needed.
export async function runExploreQuery(input: {
  metric: string
  dimension: string
  period: string
  limit?: number
}): Promise<ExploreResult> {
  const metric = input.metric
  const dimension = input.dimension
  const period = input.period
  const limit = input.limit ?? 25
  const since = sinceISO(period)

  const inInteractions = INTERACTION_ACTIONS.has(metric)

  let rows: Array<Record<string, unknown>> = []
  let rates = new Map<string, number>()

  if (inInteractions) {
    const { data } = await supabase
      .from('interactions')
      .select('action, content_type, device_slug, created_at, utm_source, utm_medium')
      .gte('created_at', since)
    rows = data ?? []
  } else if (metric === 'clicks' || metric === 'revenue_proxy') {
    const { data } = await supabase
      .from('affiliate_clicks')
      .select('retailer, device_slug, created_at, utm_source, utm_medium')
      .gte('created_at', since)
    rows = data ?? []
    if (metric === 'revenue_proxy') {
      const { data: rateRows } = await supabase
        .from('affiliate_commission_rates')
        .select('retailer, rate')
      for (const r of rateRows ?? []) rates.set(r.retailer, Number(r.rate))
    }
  } else {
    // views / unique_visitors
    const { data } = await supabase
      .from('page_views')
      .select('path, fp_id, created_at, utm_source, utm_medium')
      .gte('created_at', since)
    rows = data ?? []
  }
const extract = (row: Record<string, unknown>): string => {
    const path = String(row.path ?? '')
    const createdAt = row.created_at ? new Date(String(row.created_at)).toISOString().split('T')[0] : ''
    const deviceSlug = row.device_slug ? String(row.device_slug) : ''
    const retailer = row.retailer ? String(row.retailer) : ''
    const source = row.utm_source ? String(row.utm_source) : null
    const medium = row.utm_medium ? String(row.utm_medium) : null
    const contentType = row.content_type ? String(row.content_type) : ''
    const action = row.action ? String(row.action) : ''

    switch (dimension) {
      case 'date':
        return createdAt || '(unknown)'
      case 'path': {
        if (inInteractions) return `${contentType}/${deviceSlug || row.content_id || '(unknown)'}`
        if (retailer) return `/out/${retailer}`
        return path || '(unknown)'
      }
      case 'device': {
        if (deviceSlug) return deviceSlug
        if (path.startsWith('/devices/')) {
          const parts = path.replace('/devices/', '').split('/').filter(Boolean)
          return parts[1] ?? parts[0] ?? '(unknown)'
        }
        return '(non-device)'
      }
      case 'retailer':
        return retailer || '(retailer n/a)'
      case 'source_medium':
        return `${source ?? '(direct)'}${medium ? ` / ${medium}` : ''}`
      case 'section': {
        if (inInteractions) return contentType || '(other)'
        if (path.startsWith('/devices/')) return 'devices'
        if (path.startsWith('/articles/')) return 'articles'
        if (path.startsWith('/videos/')) return 'videos'
        if (path.startsWith('/compare')) return 'compare'
        if (path.startsWith('/search')) return 'search'
        return '(other)'
      }
      case 'action':
        return action || '(n/a)'
      default:
        return '(unknown)'
    }
  }

  const buckets = new Map<string, number>()
  const uniquePerBucket = new Map<string, Set<string>>()

  for (const row of rows) {
    const label = extract(row)
    if (metric === 'unique_visitors') {
      const fp = row.fp_id ? String(row.fp_id) : ''
      if (!fp) continue
      if (!uniquePerBucket.has(label)) uniquePerBucket.set(label, new Set())
      uniquePerBucket.get(label)!.add(fp)
    } else if (inInteractions) {
      const action = String(row.action ?? '')
      if (action !== metric) continue
      buckets.set(label, (buckets.get(label) ?? 0) + 1)
    } else if (metric === 'revenue_proxy') {
      const retailer = String(row.retailer ?? '')
      buckets.set(label, (buckets.get(label) ?? 0) + (rates.get(retailer) ?? 0))
    } else {
      buckets.set(label, (buckets.get(label) ?? 0) + 1)
    }
  }

  let entries: Array<[string, number]>
  if (metric === 'unique_visitors') {
    entries = Array.from(uniquePerBucket.entries()).map(([label, set]) => [label, set.size])
  } else {
    entries = Array.from(buckets.entries())
  }

  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, limit)
  const total = Math.round(entries.reduce((sum, [, v]) => sum + v, 0) * 100) / 100

  return {
    metric,
    dimension,
    total,
    rows: sorted.map(([label, value]) => ({
      label,
      value: Math.round(value * 100) / 100,
      sharePct: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
    })),
  }
}

// ── Earnings CSV import ──────────────────────────────────────────────────────

export interface EarningsImportRow {
  retailer: string
  periodStart: string
  periodEnd: string
  gross: number
  commission: number
  currency?: string
  status?: string
  source?: string
  note?: string
}

export async function importEarningsRows(
  rows: EarningsImportRow[]
): Promise<{ inserted: number; skipped: number; errors: Array<{ row: number; error: string }> }> {
  let inserted = 0
  let skipped = 0
  const errors: Array<{ row: number; error: string }> = []

  for (const [idx, row] of rows.entries()) {
    try {
      const retailer = row.retailer?.trim().toLowerCase()
      if (!retailer) throw new Error('missing retailer')
      if (!row.periodStart || !row.periodEnd) throw new Error('missing period dates')
      if (!Number.isFinite(row.gross)) throw new Error('invalid gross')
      const commission = Number.isFinite(row.commission) ? row.commission : 0
      const status = ['estimated', 'confirmed', 'paid'].includes(String(row.status))
        ? String(row.status)
        : 'estimated'

      // Dedupe against existing rows with the same natural key
      const { count } = await supabase
        .from('affiliate_earnings')
        .select('*', { count: 'exact', head: true })
        .eq('retailer', retailer)
        .eq('period_start', row.periodStart)
        .eq('period_end', row.periodEnd)
        .eq('gross_amount', row.gross)

      if (count && count > 0) {
        skipped++
        continue
      }

      const { error } = await supabase.from('affiliate_earnings').insert({
        retailer,
        period_start: row.periodStart,
        period_end: row.periodEnd,
        gross_amount: row.gross,
        commission_amount: commission,
        currency: row.currency ?? 'KES',
        status,
        source: row.source ?? 'csv-import',
        note: row.note ?? null,
      })
      if (error) throw new Error(error.message)
      inserted++
    } catch (e) {
      errors.push({ row: idx + 1, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return { inserted, skipped, errors }
}

// ── Scheduled exports registry ──────────────────────────────────────────────

export interface ScheduledExport {
  id: number
  report: string
  period: string
  cadence: string
  destination: string
  recipients: string[]
  config: Record<string, unknown>
  enabled: boolean
  lastRunAt: string | null
  lastError: string | null
  createdAt: string
}

function mapScheduledExport(row: Record<string, unknown>): ScheduledExport {
  return {
    id: Number(row.id),
    report: String(row.report),
    period: String(row.period),
    cadence: String(row.cadence),
    destination: String(row.destination),
    recipients: Array.isArray(row.recipients) ? row.recipients.map(String) : [],
    config: row.config && typeof row.config === 'object' ? (row.config as Record<string, unknown>) : {},
    enabled: Boolean(row.enabled),
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
  }
}

export const SCHEDULED_EXPORT_REPORTS = [
  'page-views',
  'top-pages',
  'affiliate-clicks',
  'qualified-leads',
  'earnings-reconciliation',
  'link-health',
  'explore',
]

export async function listScheduledExports(): Promise<ScheduledExport[]> {
  const { data, error } = await supabase
    .from('scheduled_exports')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[exports] list failed:', error.message)
    return []
  }
  return (data ?? []).map(mapScheduledExport)
}

export interface ScheduledExportInput {
  report: string
  period?: string
  cadence: string
  destination: string
  recipients?: string[]
  config?: Record<string, unknown>
}

export async function createScheduledExport(
  input: ScheduledExportInput
): Promise<ScheduledExport | null> {
  const { data, error } = await supabase
    .from('scheduled_exports')
    .insert({
      report: input.report,
      period: input.period ?? '30d',
      cadence: input.cadence,
      destination: input.destination,
      recipients: input.recipients ?? [],
      config: input.config ?? {},
    })
    .select()
    .single()
  if (error) {
    console.error('[exports] create failed:', error.message)
    return null
  }
  return mapScheduledExport(data as Record<string, unknown>)
}

export async function updateScheduledExport(
  id: number,
  patch: Partial<ScheduledExportInput> & { enabled?: boolean }
): Promise<ScheduledExport | null> {
  const { data, error } = await supabase
    .from('scheduled_exports')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('[exports] update failed:', error.message)
    return null
  }
  return mapScheduledExport(data as Record<string, unknown>)
}

export async function deleteScheduledExport(id: number): Promise<boolean> {
  const { error } = await supabase.from('scheduled_exports').delete().eq('id', id)
  if (error) console.error('[exports] delete failed:', error.message)
  return !error
}

export async function dueScheduledExports(now: Date = new Date()): Promise<ScheduledExport[]> {
  const { data, error } = await supabase
    .from('scheduled_exports')
    .select('*')
    .eq('enabled', true)
  if (error) {
    console.error('[exports] due list failed:', error.message)
    return []
  }

  const cadenceMs: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  }

  return (data ?? [])
    .map(mapScheduledExport)
    .filter((job) => {
      if (!job.lastRunAt) return true // never run → due
      const age = now.getTime() - new Date(job.lastRunAt).getTime()
      return age >= (cadenceMs[job.cadence] ?? cadenceMs.weekly)
    })
}

export async function markScheduledExportRun(
  id: number,
  ok: boolean,
  errorText: string | null = null
): Promise<void> {
  await supabase
    .from('scheduled_exports')
    .update({ last_run_at: new Date().toISOString(), last_error: ok ? null : errorText })
    .eq('id', id)
}

// ── Affiliate network connectors (Phase 7) ───────────────────────────────────
// Zero-touch earnings reconciliation: each network is a config row pointing at a
// report endpoint; a sync fetches, maps network fields to the affiliate_earnings
// ledger, and dedupes via importEarningsRows. Secrets live in env vars only.

export interface AffiliateNetwork {
  id: number
  name: string
  label: string
  baseUrl: string
  authType: 'none' | 'bearer' | 'query' | 'basic'
  authEnvKey: string | null
  authQueryParam: string | null
  mapping: Record<string, string>
  note: string | null
  enabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: 'idle' | 'success' | 'error' | null
  lastSyncError: string | null
  createdAt: string
  updatedAt: string
}

export interface AffiliateSyncLog {
  id: number
  networkId: number
  status: 'success' | 'error'
  rowsInserted: number
  rowsSkipped: number
  rowsErrors: number
  message: string | null
  durationMs: number | null
  startedAt: string
  finishedAt: string
}

export type AffiliateNetworkInput = {
  name: string
  label: string
  baseUrl: string
  authType: AffiliateNetwork['authType']
  authEnvKey?: string | null
  authQueryParam?: string | null
  mapping?: Record<string, string>
  note?: string | null
  enabled?: boolean
}

export async function getAffiliateNetworks(): Promise<AffiliateNetwork[]> {
  const { data } = await supabase
    .from('affiliate_networks')
    .select('*')
    .order('name', { ascending: true })
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    label: String(r.label),
    baseUrl: String(r.base_url),
    authType: r.auth_type as AffiliateNetwork['authType'],
    authEnvKey: r.auth_env_key ? String(r.auth_env_key) : null,
    authQueryParam: r.auth_query_param ? String(r.auth_query_param) : null,
    mapping: r.mapping && typeof r.mapping === 'object' ? (r.mapping as Record<string, string>) : {},
    note: r.note ? String(r.note) : null,
    enabled: Boolean(r.enabled),
    lastSyncAt: r.last_sync_at ? String(r.last_sync_at) : null,
    lastSyncStatus: r.last_sync_status as AffiliateNetwork['lastSyncStatus'],
    lastSyncError: r.last_sync_error ? String(r.last_sync_error) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }))
}

export async function upsertAffiliateNetwork(input: AffiliateNetworkInput): Promise<AffiliateNetwork> {
  const { data, error } = await supabase
    .from('affiliate_networks')
    .insert({
      name: input.name.trim().toLowerCase(),
      label: input.label.trim(),
      base_url: input.baseUrl.trim(),
      auth_type: input.authType,
      auth_env_key: input.authEnvKey?.trim() || null,
      auth_query_param: input.authQueryParam?.trim() || null,
      mapping: input.mapping ?? {},
      note: input.note?.trim() || null,
      enabled: input.enabled ?? true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return {
    id: Number(data.id),
    name: String(data.name),
    label: String(data.label),
    baseUrl: String(data.base_url),
    authType: data.auth_type as AffiliateNetwork['authType'],
    authEnvKey: data.auth_env_key ? String(data.auth_env_key) : null,
    authQueryParam: data.auth_query_param ? String(data.auth_query_param) : null,
    mapping: data.mapping && typeof data.mapping === 'object' ? (data.mapping as Record<string, string>) : {},
    note: data.note ? String(data.note) : null,
    enabled: Boolean(data.enabled),
    lastSyncAt: data.last_sync_at ? String(data.last_sync_at) : null,
    lastSyncStatus: data.last_sync_status as AffiliateNetwork['lastSyncStatus'],
    lastSyncError: data.last_sync_error ? String(data.last_sync_error) : null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  }
}

export async function deleteAffiliateNetwork(id: number): Promise<void> {
  const { error } = await supabase.from('affiliate_networks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export type AffiliateNetworkPatch = Partial<Omit<AffiliateNetworkInput, 'name'>>

export async function updateAffiliateNetwork(
  id: number,
  patch: AffiliateNetworkPatch
): Promise<AffiliateNetwork> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.label !== undefined) update.label = String(patch.label).trim()
  if (patch.baseUrl !== undefined) update.base_url = String(patch.baseUrl).trim()
  if (patch.authType !== undefined) update.auth_type = patch.authType
  if (patch.authEnvKey !== undefined) update.auth_env_key = patch.authEnvKey?.trim() || null
  if (patch.authQueryParam !== undefined) update.auth_query_param = patch.authQueryParam?.trim() || null
  if (patch.mapping !== undefined) update.mapping = patch.mapping
  if (patch.note !== undefined) update.note = patch.note?.trim() || null
  if (patch.enabled !== undefined) update.enabled = patch.enabled

  const { data, error } = await supabase
    .from('affiliate_networks')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return {
    id: Number(data.id),
    name: String(data.name),
    label: String(data.label),
    baseUrl: String(data.base_url),
    authType: data.auth_type as AffiliateNetwork['authType'],
    authEnvKey: data.auth_env_key ? String(data.auth_env_key) : null,
    authQueryParam: data.auth_query_param ? String(data.auth_query_param) : null,
    mapping: data.mapping && typeof data.mapping === 'object' ? (data.mapping as Record<string, string>) : {},
    note: data.note ? String(data.note) : null,
    enabled: Boolean(data.enabled),
    lastSyncAt: data.last_sync_at ? String(data.last_sync_at) : null,
    lastSyncStatus: data.last_sync_status as AffiliateNetwork['lastSyncStatus'],
    lastSyncError: data.last_sync_error ? String(data.last_sync_error) : null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  }
}

export async function listAffiliateSyncLogs(networkId?: number, limit = 25): Promise<AffiliateSyncLog[]> {
  let q = supabase
    .from('affiliate_sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (networkId) q = q.eq('network_id', networkId)
  const { data } = await q
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    networkId: Number(r.network_id),
    status: r.status as 'success' | 'error',
    rowsInserted: Number(r.rows_inserted ?? 0),
    rowsSkipped: Number(r.rows_skipped ?? 0),
    rowsErrors: Number(r.rows_errors ?? 0),
    message: r.message ? String(r.message) : null,
    durationMs: r.duration_ms ? Number(r.duration_ms) : null,
    startedAt: String(r.started_at),
    finishedAt: String(r.finished_at),
  }))
}

// Server-side only. Call the network endpoint, parse JSON/CSV, map into the
// earnings ledger via importEarningsRows (natural-key dedupe), record a sync log.

export interface AffiliateSyncResult {
  ok: boolean
  network: string
  inserted: number
  skipped: number
  errors: number
  message: string
}

export async function syncAffiliateNetwork(networkId: number): Promise<AffiliateSyncResult> {
  const started = Date.now()
  const { data: netRow } = await supabase
    .from('affiliate_networks')
    .select('*')
    .eq('id', networkId)
    .maybeSingle()

  if (!netRow) throw new Error('network not found')
  const network: AffiliateNetwork = {
    id: Number(netRow.id),
    name: String(netRow.name),
    label: String(netRow.label),
    baseUrl: String(netRow.base_url),
    authType: netRow.auth_type as AffiliateNetwork['authType'],
    authEnvKey: netRow.auth_env_key ? String(netRow.auth_env_key) : null,
    authQueryParam: netRow.auth_query_param ? String(netRow.auth_query_param) : null,
    mapping: netRow.mapping && typeof netRow.mapping === 'object' ? (netRow.mapping as Record<string, string>) : {},
    note: netRow.note ? String(netRow.note) : null,
    enabled: Boolean(netRow.enabled),
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    createdAt: '',
    updatedAt: '',
  }

  try {
    // 1. Build request with the configured auth scheme (secret from env)
    const url = new URL(network.baseUrl)
    const headers: Record<string, string> = { Accept: 'application/json,text/csv' }
    if (network.authType === 'bearer') {
      const token = network.authEnvKey ? process.env[network.authEnvKey] : undefined
      if (!token) throw new Error(`ENV var ${network.authEnvKey ?? '(none set)'} missing`)
      headers.Authorization = `Bearer ${token}`
    } else if (network.authType === 'basic') {
      const cred = network.authEnvKey ? process.env[network.authEnvKey] : undefined
      if (!cred) throw new Error(`ENV var ${network.authEnvKey ?? '(none set)'} missing`)
      headers.Authorization = `Basic ${Buffer.from(cred).toString('base64')}`
    } else if (network.authType === 'query') {
      const token = network.authEnvKey ? process.env[network.authEnvKey] : undefined
      if (!token) throw new Error(`ENV var ${network.authEnvKey ?? '(none set)'} missing`)
      url.searchParams.set(network.authQueryParam ?? 'token', token)
    }

    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    const text = await res.text()

    // 2. Parse response (JSON array/object or CSV)
    const rows: ParseReportRow[] = []
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
    if (parsed && typeof parsed === 'object') {
      // Shape: array or { data: [...] }
      const arr = Array.isArray(parsed)
        ? parsed
        : (parsed as { data?: unknown }).data ?? (parsed as { earnings?: unknown }).earnings ?? []
      if (Array.isArray(arr)) rows.push(...arr as ParseReportRow[])
    } else if (text.trim()) {
      rows.push(...parseCsvRows(text))
    }

    if (rows.length === 0) {
      const msg = 'No rows returned by API'
      await logSync(network.id, 'error', msg, 0, 0, 0, started)
      await setNetworkSync(network.id, 'error', msg)
      return { ok: false, network: network.name, inserted: 0, skipped: 0, errors: 0, message: msg }
    }

    // 3. Map network fields into ledger rows using the saved mapping
    const m = network.mapping
    const ledger: EarningsImportRow[] = rows.map((r) => {
      const piVal = (k: string): string => {
        const f = m[k] ?? k
        const v = r[f]
        return v === undefined || v === null ? '' : String(v)
      }
      return {
        retailer: piVal('retailer') || network.name,
        periodStart: piVal('period_start'),
        periodEnd: piVal('period_end') || piVal('period_start'),
        gross: Number(piVal('gross') || '0'),
        commission: Number(piVal('commission') || '0'),
        currency: piVal('currency') || undefined,
        status: piVal('status') || undefined,
        source: `api:${network.name}`,
        note: piVal('note') || undefined,
      }
    })

    const result = await importEarningsRows(ledger)
    const msg = `${result.inserted} inserted, ${result.skipped} dup, ${result.errors.length} errors`
    await logSync(network.id, result.errors.length > 0 ? 'error' : 'success', msg, result.inserted, result.skipped, result.errors.length, started)
    await setNetworkSync(network.id, result.errors.length > 0 ? 'error' : 'success', result.errors.length > 0 ? msg : null)
    return { ok: result.errors.length === 0, network: network.name, inserted: result.inserted, skipped: result.skipped, errors: result.errors.length, message: msg }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logSync(network.id, 'error', msg, 0, 0, 0, started)
    await setNetworkSync(network.id, 'error', msg)
    return { ok: false, network: network.name, inserted: 0, skipped: 0, errors: 0, message: msg }
  }
}

type ParseReportRow = Record<string, unknown>

function parseCsvRows(text: string): ParseReportRow[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim().toLowerCase())
  return rows.slice(1, 2000).map((r) => {
    const obj: ParseReportRow = {}
    headers.forEach((h, i) => { obj[h] = r[i] ?? '' })
    return obj
  })
}

async function logSync(
  networkId: number,
  status: 'success' | 'error',
  message: string,
  inserted: number,
  skipped: number,
  errors: number,
  startedMs: number
): Promise<void> {
  const duration = Date.now() - startedMs
  await supabase.from('affiliate_sync_logs').insert({
    network_id: networkId,
    status,
    rows_inserted: inserted,
    rows_skipped: skipped,
    rows_errors: errors,
    message,
    duration_ms: duration,
    started_at: new Date(startedMs).toISOString(),
    finished_at: new Date().toISOString(),
  })
}

async function setNetworkSync(
  id: number,
  status: 'success' | 'error',
  errorText: string | null
): Promise<void> {
  await supabase
    .from('affiliate_networks')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_error: errorText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

// Run every enabled network (used by the cron) and aggregate results.
export async function syncAllEnabledNetworks(): Promise<AffiliateSyncResult[]> {
  const nets = (await getAffiliateNetworks()).filter((n) => n.enabled)
  const results: AffiliateSyncResult[] = []
  for (const n of nets) {
    try {
      results.push(await syncAffiliateNetwork(n.id))
    } catch (e) {
      results.push({ ok: false, network: n.name, inserted: 0, skipped: 0, errors: 0, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return results
}
// ─────────────────────────────────────────────────────────────────────────────
// Traffic & Audience deep-dive (Traffic tab)
// ─────────────────────────────────────────────────────────────────────────────
// Powered by the `daily_page_view_summary` materialised view (created in
// migration 007, refreshed by the aggregate-analytics cron) with an automatic
// fallback to raw `page_views` when the mart has never been built. Audience geo
// always comes from raw `page_views.country_code` (the mart carries no geo).

const TRAFFIC_SOURCES = ['direct', 'search', 'social', 'referral'] as const
const TRAFFIC_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const TRAFFIC_SECTIONS: ContentSection[] = ['devices', 'articles', 'videos', 'compare', 'search', 'other']

export function classifySection(path: string): ContentSection {
  if (path.startsWith('/devices/')) return 'devices'
  if (path.startsWith('/articles/')) return 'articles'
  if (path.startsWith('/videos/')) return 'videos'
  if (path.startsWith('/compare')) return 'compare'
  if (path.startsWith('/search')) return 'search'
  return 'other'
}

export interface TrafficInsights {
  source: 'daily_page_view_summary' | 'page_views'
  latestDay: string | null
  totalViews: number
  avgPerDay: number
  trend: Array<{ date: string; views: number; avg: number | null }>
  mix: Array<{ date: string; direct: number; search: number; social: number; referral: number }>
  tree: Array<{ name: string; value: number; children: Array<{ name: string; value: number; source: string }> }>
  flow: {
    nodes: Array<{ name: string }>
    links: Array<{ source: number; target: number; value: number }>
  }
  weekday: Array<{ day: string; views: number; sharePct: number; isPeak: boolean }>
  geo: Array<{ code: string; views: number; sharePct: number }>
  topSource: string | null
  topSourceShare: number
  topPlatform: string | null
  peakDay: string | null
  lateVsEarlyPct: number | null
  geoTop: { code: string; views: number } | null
}
export async function getTrafficInsights(period: string): Promise<TrafficInsights> {
  const since = sinceISO(period)
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

  // Zero-fill every calendar day in the period (UTC), matching getPageViewsOverTime.
  const nowMs = Date.now()
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(new Date(nowMs - i * 86400000).toISOString().split('T')[0])
  }
  const daySet = new Set(dayKeys)

  // 1) Try the materialised mart first — it is a columnar GROUP BY and the
  //    cheapest way to answer trend / mix / tree / flow / weekday.
  const [martRes, geoRes] = await Promise.all([
    supabase
      .from('daily_page_view_summary')
      .select('day, path, source, platform, views')
      .gte('day', since),
    // The mart has no country_code — read the raw geo column only.
    supabase.from('page_views').select('created_at, country_code').gte('created_at', since),
  ])

  type DetailRow = { dayKey: string; source: string; platform: string | null; path: string; views: number }

  let detail: DetailRow[] = []
  let usedMart = false

  if (martRes.data && martRes.data.length > 0) {
    usedMart = true
    detail = martRes.data
      .map((r) => ({
        dayKey: new Date(String(r.day)).toISOString().split('T')[0],
        source: String(r.source ?? 'direct'),
        platform: r.platform ? String(r.platform) : null,
        path: String(r.path ?? ''),
        views: Number(r.views ?? 0),
      }))
      .filter((r) => daySet.has(r.dayKey))
  } else {
    // Cron has not run yet — fall back to raw page_views.
    const { data: raw } = await supabase
      .from('page_views')
      .select('created_at, source, platform, path')
      .gte('created_at', since)
    detail = (raw ?? [])
      .map((r) => ({
        dayKey: new Date(String(r.created_at)).toISOString().split('T')[0],
        source: String(r.source ?? 'direct'),
        platform: r.platform ? String(r.platform) : null,
        path: String(r.path ?? ''),
        views: 1,
      }))
      .filter((r) => daySet.has(r.dayKey))
  }

  // Aggregations
  const viewsByDay = new Map<string, number>()
  const byDaySource = new Map<string, Record<string, number>>()
  const bySourcePlatform = new Map<string, Map<string, number>>()
  const bySourceSection = new Map<string, Map<string, number>>()
  const platformTotals = new Map<string, number>()
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0] // Mon..Sun

  for (const r of detail) {
    viewsByDay.set(r.dayKey, (viewsByDay.get(r.dayKey) ?? 0) + r.views)

    const ds = byDaySource.get(r.dayKey) ?? { direct: 0, search: 0, social: 0, referral: 0 }
    ds[r.source] = (ds[r.source] ?? 0) + r.views
    byDaySource.set(r.dayKey, ds)

    const sp = bySourcePlatform.get(r.source) ?? new Map<string, number>()
    const platform = r.platform ?? 'unknown'
    sp.set(platform, (sp.get(platform) ?? 0) + r.views)
    bySourcePlatform.set(r.source, sp)
    platformTotals.set(platform, (platformTotals.get(platform) ?? 0) + r.views)

    const section = classifySection(r.path)
    const ss = bySourceSection.get(r.source) ?? new Map<string, number>()
    ss.set(section, (ss.get(section) ?? 0) + r.views)
    bySourceSection.set(r.source, ss)

    const dow = new Date(r.dayKey + 'T00:00:00Z').getUTCDay() // 0 = Sun
    weekdayTotals[(dow + 6) % 7] += r.views // reorder to Mon-first
  }

  // Trend + rolling average
  const rollWindow = period === '7d' ? 3 : 7
  const trend: TrafficInsights['trend'] = dayKeys.map((date, i) => {
    const views = viewsByDay.get(date) ?? 0
    let avg: number | null = null
    if (i >= rollWindow - 1) {
      let sum = 0
      for (let j = i - rollWindow + 1; j <= i; j++) sum += viewsByDay.get(dayKeys[j]) ?? 0
      avg = Math.round((sum / rollWindow) * 10) / 10
    }
    return { date, views, avg }
  })

  // Channel mix over time
  const mix: TrafficInsights['mix'] = dayKeys.map((date) => {
    const g = byDaySource.get(date) ?? {}
    return { date, direct: g.direct ?? 0, search: g.search ?? 0, social: g.social ?? 0, referral: g.referral ?? 0 }
  })

  // Source → platform tree (drives the treemap)
  const tree: TrafficInsights['tree'] = TRAFFIC_SOURCES.map((s) => {
    const platforms = bySourcePlatform.get(s)
    const children = platforms
      ? Array.from(platforms.entries())
          .map(([name, value]) => ({ name, value, source: s }))
          .sort((a, b) => b.value - a.value)
      : []
    const value = children.reduce((sum, c) => sum + c.value, 0)
    return { name: s, value, children }
  }).filter((s) => s.value > 0)

  // Source → content section flow (drives the sankey)
  const flowNodes: Array<{ name: string }> = []
  const flowLinks: Array<{ source: number; target: number; value: number }> = []
  const sourceIdx = new Map<string, number>()
  for (const s of TRAFFIC_SOURCES) {
    if (bySourceSection.has(s)) {
      sourceIdx.set(s, flowNodes.length)
      flowNodes.push({ name: s })
    }
  }
  const sectionIdx = new Map<string, number>()
  for (const sec of TRAFFIC_SECTIONS) {
    if (TRAFFIC_SOURCES.some((s) => (bySourceSection.get(s)?.get(sec) ?? 0) > 0)) {
      sectionIdx.set(sec, flowNodes.length)
      flowNodes.push({ name: sec })
    }
  }
  for (const s of TRAFFIC_SOURCES) {
    const i = sourceIdx.get(s)
    if (i === undefined) continue
    for (const [sec, value] of bySourceSection.get(s) ?? []) {
      const j = sectionIdx.get(sec)
      if (j !== undefined && value > 0) flowLinks.push({ source: i, target: j, value })
    }
  }
// Weekly rhythm
  const weekdaySum = weekdayTotals.reduce((a, b) => a + b, 0)
  const peakDow = weekdayTotals.indexOf(Math.max(...weekdayTotals))
  const weekday: TrafficInsights['weekday'] = TRAFFIC_WEEKDAYS.map((day, i) => ({
    day,
    views: weekdayTotals[i],
    sharePct: weekdaySum > 0 ? Math.round((weekdayTotals[i] / weekdaySum) * 1000) / 10 : 0,
    isPeak: weekdayTotals[i] > 0 && i === peakDow,
  }))

  // Audience geography (raw column — always first-party, no PII beyond ISO code)
  const geoRawMap = new Map<string, number>()
  for (const row of geoRes.data ?? []) {
    if (!daySet.has(new Date(String(row.created_at)).toISOString().split('T')[0])) continue
    const code = row.country_code ? String(row.country_code).toUpperCase() : ''
    if (/^[A-Z]{2}$/.test(code)) geoRawMap.set(code, (geoRawMap.get(code) ?? 0) + 1)
  }
  const geoSum = Array.from(geoRawMap.values()).reduce((a, b) => a + b, 0)
  const geo: TrafficInsights['geo'] = Array.from(geoRawMap.entries())
    .map(([code, views]) => ({
      code,
      views,
      sharePct: geoSum > 0 ? Math.round((views / geoSum) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Executive summary
  const totalViews = trend.reduce((sum, t) => sum + t.views, 0)

  let topSource: string | null = null
  let topSourceViews = 0
  for (const s of TRAFFIC_SOURCES) {
    const views = Array.from(bySourcePlatform.get(s)?.values() ?? []).reduce((a, b) => a + b, 0)
    if (views > topSourceViews) {
      topSourceViews = views
      topSource = s
    }
  }

  let topPlatform: string | null = null
  let topPlatformViews = 0
  for (const [name, views] of platformTotals) {
    if (views > topPlatformViews) {
      topPlatformViews = views
      topPlatform = name
    }
  }

  const peakDay = weekday.find((w) => w.isPeak)?.day ?? null

  const half = Math.floor(trend.length / 2)
  const early = trend.slice(0, half).reduce((s, t) => s + t.views, 0)
  const late = trend.slice(half).reduce((s, t) => s + t.views, 0)
  const lateVsEarlyPct =
    totalViews === 0 ? 0 : early > 0 ? Math.round(((late - early) / early) * 1000) / 10 : 100

  let latestDay: string | null = null
  for (const r of detail) if (latestDay === null || r.dayKey > latestDay) latestDay = r.dayKey

  return {
    source: usedMart ? 'daily_page_view_summary' : 'page_views',
    latestDay,
    totalViews,
    avgPerDay: trend.length > 0 ? Math.round((totalViews / trend.length) * 10) / 10 : 0,
    trend,
    mix,
    tree,
    flow: { nodes: flowNodes, links: flowLinks },
    weekday,
    geo,
    topSource,
    topSourceShare: totalViews > 0 ? Math.round((topSourceViews / totalViews) * 1000) / 10 : 0,
    topPlatform: topPlatformViews > 0 ? topPlatform : null,
    peakDay,
    lateVsEarlyPct,
    geoTop: geo[0] ?? null,
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// Content & SEO deep-dive (Content tab)
// ─────────────────────────────────────────────────────────────────────────────
// Content analytics are "catalog-aware" (GA blind spot): section classification,
// publish-age decay, launch velocity and the zero-result opportunity backlog.

export interface ContentInsights {
  totalViews: number
  topSection: string | null
  topSectionPct: number
  ctrLeader: { path: string; views: number; clicks: number; ctr: number } | null
  zeroResultCount: number
  zeroResult: Array<{ query: string; count: number }>
  decayQueueCount: number
  totalPublishedPieces: number
  // Weekly momentum per content section → heatmap
  momentum: Array<{ bucket: string; devices: number; articles: number; videos: number; compare: number; search: number; other: number }>
  // Views by content age → decaying / evergreen
  ageBuckets: Array<{ label: string; minDays: number | null; maxDays: number | null; views: number; sharePct: number }>
  // Pieces with views only (catalog-backed or not) that have gone quiet
  decayQueue: Array<{ path: string; views: number; publishedAt: string | null }>
  // Newest CMS pieces → cumulative views by days-since-publish
  launch: Array<{
    slug: string
    title: string
    type: 'article' | 'device' | 'video'
    publishedAt: string
    daysSincePublish: number
    cumulative: number[]
  }>
  topBySection: Array<{ section: string; views: number }>
}

// Cumulative day-count buckets boundary in days (0 = published today)
const CONTENT_AGE_BUCKETS: Array<{ label: string; maxDays: number }> = [
  { label: '0–30d', maxDays: 30 },
  { label: '31–90d', maxDays: 90 },
  { label: '91–180d', maxDays: 180 },
  { label: '181–365d', maxDays: 365 },
]
export async function getContentInsights(period: string): Promise<ContentInsights> {
  const since = sinceISO(period)
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const now = Date.now()
  const dayMs = 86400000
  const sinceMs = now - days * dayMs

  // 1) Page views in the period (path + when)
  const { data: views } = await supabase
    .from('page_views')
    .select('created_at, path')
    .gte('created_at', since)

  const viewRows = (views ?? []).map((r) => ({
    date: new Date(String(r.created_at)).toISOString().split('T')[0],
    path: String(r.path ?? ''),
  }))

  // 2) Catalog seeds — publish dates for decay/launch curves
  const [deviceRes, articleRes, videoRes] = await Promise.all([
    supabase.from('devices').select('slug, brand:brands(slug), created_at, status'),
    supabase.from('articles').select('slug, title, category, published_at, status'),
    supabase.from('videos').select('embed_id, title, published_at, platform'),
  ])

  const publishedArticles = (articleRes.data ?? [])
    .filter((a) => a.status === 'published')
    .map((a) => ({
      slug: String(a.slug),
      title: String(a.title ?? a.slug),
      path: `/articles/${String(a.slug)}`,
      type: 'article' as const,
      publishedAt: String(a.published_at ?? ''),
    }))
  const publishedDevices = (deviceRes.data ?? [])
    .filter((d) => d.status === 'published')
    .map((d) => {
      const brand = Array.isArray(d.brand) ? d.brand[0] : d.brand
      return {
        slug: String(d.slug),
        title: String(d.slug),
        path: `/devices/${brand?.slug ? String(brand.slug) : 'default'}/${String(d.slug)}`,
        type: 'device' as const,
        publishedAt: String(d.created_at ?? ''),
      }
    })
  const publishedVideos = (videoRes.data ?? [])
    .filter((v) => v.published_at)
    .map((v) => ({
      slug: String(v.embed_id ?? v.title ?? ''),
      title: String(v.title ?? v.platform ?? 'video'),
      path: '', // videos embed on /videos — no per-piece route to attribute
      type: 'video' as const,
      publishedAt: String(v.published_at ?? ''),
    }))
// 3) Section + per-path view counting
  const pathViews = new Map<string, number>()
  const pathDayViews = new Map<string, Map<string, number>>()
  const sectionBuckets: Record<ContentSection, Record<string, number>> = {
    devices: {}, articles: {}, videos: {}, compare: {}, search: {}, other: {},
  }
  let totalViews = 0
  for (const row of viewRows) {
    pathViews.set(row.path, (pathViews.get(row.path) ?? 0) + 1)
    totalViews++
    const perDay = pathDayViews.get(row.path) ?? new Map<string, number>()
    perDay.set(row.date, (perDay.get(row.date) ?? 0) + 1)
    pathDayViews.set(row.path, perDay)
    const section = classifySection(row.path)
    const byBucket = sectionBuckets[section]
    byBucket[row.date] = (byBucket[row.date] ?? 0) + 1
  }

  // 4) Affiliate clicks per device slug (device pages) for CTR leader
  const { data: clicks } = await supabase
    .from('affiliate_clicks')
    .select('device_slug')
    .gte('created_at', since)
  const clicksByDevice = new Map<string, number>()
  for (const c of clicks ?? []) clicksByDevice.set(String(c.device_slug), (clicksByDevice.get(String(c.device_slug)) ?? 0) + 1)

  // 5) Top paths by views (full period) + CTR when path maps to a device
  const topPaths = Array.from(pathViews.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
  const pathToDeviceSlug = (p: string) => {
    const m = /^\/devices\/([^/]+)\/([^/]+)$/.exec(p)
    return m ? m[2] : null
  }
  let ctrLeader: ContentInsights['ctrLeader'] = null
  for (const [path, views] of topPaths) {
    const slug = pathToDeviceSlug(path)
    const clicks = slug ? clicksByDevice.get(slug) ?? 0 : 0
    if (clicks > 0) {
      const ctr = Math.round((clicks / views) * 10000) / 100
      if (!ctrLeader || ctr > (ctrLeader.ctr ?? 0)) ctrLeader = { path, views, clicks, ctr }
    }
  }

  // 6) Zero-result search — opportunity backlog
  const { data: search } = await supabase
    .from('search_queries')
    .select('query, zero_result')
    .gte('created_at', since)
  const zeroMap = new Map<string, number>()
  for (const s of search ?? []) {
    if (!s.zero_result) continue
    const key = String(s.query ?? '').trim().toLowerCase().slice(0, 200)
    if (key) zeroMap.set(key, (zeroMap.get(key) ?? 0) + 1)
  }
  const zeroResult = Array.from(zeroMap.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  // 7) Weekly momentum (daily when 7d) per section
  const bucketSize = days === 7 ? 1 : 7
  const momentum: ContentInsights['momentum'] = []
  const sections: ContentSection[] = ['devices', 'articles', 'videos', 'compare', 'search', 'other']
  for (let start = sinceMs; start <= now; start += bucketSize * dayMs) {
    const bucketStart = new Date(start)
    const bucketEnd = new Date(start + (bucketSize - 1) * dayMs)
    const key = `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`
    const isoStart = bucketStart.toISOString().split('T')[0]
    const isoEnd = bucketEnd.toISOString().split('T')[0]
    const row: ContentInsights['momentum'][number] = {
      bucket: key,
      devices: 0, articles: 0, videos: 0, compare: 0, search: 0, other: 0,
    }
    for (const sec of sections) {
      let sum = 0
      for (const [day, count] of Object.entries(sectionBuckets[sec])) {
        if (day >= isoStart && day <= isoEnd) sum += Number(count)
      }
      row[sec] = sum
    }
    momentum.push(row)
  }

  // 8) Age buckets — published-piece views by content age
  // Routable pieces (articles + devices) are attributable; videos live on a
  // single /videos hub so they can't be attributed per-piece.
  const launched = [...publishedArticles, ...publishedDevices].filter((p) => p.path)
  const published = [...launched, ...publishedVideos]
  const ageViews = new Array(CONTENT_AGE_BUCKETS.length).fill(0) as number[]
  const totalPieceAge = new Array(CONTENT_AGE_BUCKETS.length).fill(0) as number[]
  for (const { path, publishedAt } of launched) {
    const pubMs = new Date(publishedAt).getTime()
    if (!Number.isFinite(pubMs)) continue
    const ageDays = Math.floor((now - pubMs) / dayMs)
    const views = pathViews.get(path) ?? 0
    let idx = CONTENT_AGE_BUCKETS.findIndex((b) => ageDays <= b.maxDays)
    if (idx === -1) continue // older than 365d → not shown
    ageViews[idx] += views
    totalPieceAge[idx] += 1
  }
  const ageSum = ageViews.reduce((a, b) => a + b, 0)
  const ageBuckets: ContentInsights['ageBuckets'] = CONTENT_AGE_BUCKETS.map((b, i) => ({
    label: b.label,
    minDays: i === 0 ? 0 : CONTENT_AGE_BUCKETS[i - 1].maxDays + 1,
    maxDays: b.maxDays,
    views: ageViews[i],
    sharePct: ageSum > 0 ? Math.round((ageViews[i] / ageSum) * 1000) / 10 : 0,
  }))
// 9) Decay queue — published pieces with zero/low views in period (excluding
//    pieces younger than 7 days, which simply haven't had time to earn views)
  const decayQueue: ContentInsights['decayQueue'] = launched
    .map(({ path, publishedAt }) => ({ path, views: pathViews.get(path) ?? 0, publishedAt }))
    .filter((p) => {
      if (p.views > 0) return false
      if (!p.publishedAt) return true
      const ageDays = Math.floor((now - new Date(p.publishedAt).getTime()) / dayMs)
      return ageDays >= 7
    })
    .sort((a, b) => {
      const aPub = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const bPub = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return aPub - bPub
    })
    .slice(0, 10)

  // 10) Launch velocity — newest 5 attributable pieces, cumulative views by days-since-publish
  const launch: ContentInsights['launch'] = [...launched]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 5)
    .map((p) => {
      const pubMs = new Date(p.publishedAt).getTime()
      const daysSincePublish = Math.max(0, Math.floor((now - pubMs) / dayMs))
      const cumulative: number[] = []
      let run = 0
      const perDay = pathDayViews.get(p.path) ?? new Map<string, number>()
      for (let d = 0; d <= Math.min(daysSincePublish, 30); d++) {
        const day = new Date(pubMs + d * dayMs).toISOString().split('T')[0]
        run += perDay.get(day) ?? 0
        cumulative.push(run)
      }
      return {
        slug: p.slug,
        title: p.title,
        type: p.type,
        publishedAt: p.publishedAt,
        daysSincePublish,
        cumulative,
      }
    })

  // 11) Section totals + summary
  const topBySection: ContentInsights['topBySection'] = sections.map((sec) => ({
    section: sec,
    views: Object.values(sectionBuckets[sec]).reduce((a, b) => a + b, 0),
  }))
  const topSectionRow = [...topBySection].sort((a, b) => b.views - a.views)[0]

  return {
    totalViews,
    topSection: topSectionRow && topSectionRow.views > 0 ? topSectionRow.section : null,
    topSectionPct: totalViews > 0 && topSectionRow
      ? Math.round((topSectionRow.views / totalViews) * 1000) / 10
      : 0,
    ctrLeader,
    zeroResultCount: zeroResult.reduce((a, b) => a + b.count, 0),
    zeroResult,
    decayQueueCount: decayQueue.length,
    totalPublishedPieces: published.length,
    momentum,
    ageBuckets,
    decayQueue,
    launch,
    topBySection,
  }
}
