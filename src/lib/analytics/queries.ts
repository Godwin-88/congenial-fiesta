import { createClient } from '@supabase/supabase-js'
import { fetchUpstashTopQueries } from '@/lib/upstash/search'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

import {
  type IntentAction,
  type QualificationTier,
  type FunnelStage,
  type ConsiderationIssue,
  INTENT_WEIGHTS,
  AFFILIATE_CLICK_WEIGHT,
  SIGNED_IN_BONUS,
  qualificationTier,
  CONSIDERATION_ISSUE_META,
} from './consideration'

export type {
  IntentAction,
  QualificationTier,
  FunnelStage,
  ConsiderationIssue,
} from './consideration'
export {
  INTENT_WEIGHTS,
  AFFILIATE_CLICK_WEIGHT,
  SIGNED_IN_BONUS,
  qualificationTier,
} from './consideration'

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
  { id: 'intent_score', label: 'Intent Score', table: 'interactions' },
]

export const EXPLORE_DIMENSIONS: Array<{ id: string; label: string }> = [
  { id: 'date', label: 'Date (daily)' },
  { id: 'path', label: 'Page path' },
  { id: 'device', label: 'Device' },
  { id: 'price_tier', label: 'Price tier' },
  { id: 'category', label: 'Major category' },
  { id: 'retailer', label: 'Retailer' },
  { id: 'source_medium', label: 'Source / Medium' },
  { id: 'section', label: 'Content section' },
  { id: 'action', label: 'Intent action' },
  { id: 'qualification_tier', label: 'Qualification tier' },
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
  const isIntentScore = metric === 'intent_score'
  const useInteractions = inInteractions || isIntentScore
  const useQualification = dimension === 'qualification_tier'
  const needsCatalog = dimension === 'price_tier' || dimension === 'category'

  let rows: Array<Record<string, unknown>> = []
  let rates = new Map<string, number>()
  let catalogDims = new Map<string, { tier: string; category: string }>()
  let fpQualification = new Map<string, QualificationTier>()

  if (useInteractions) {
    const { data } = await supabase
      .from('interactions')
      .select('action, content_type, device_slug, fp_id, user_id, created_at, utm_source, utm_medium')
      .gte('created_at', since)
    rows = data ?? []
    if (useQualification) {
      // Qualification needs the click weight (+2) and sign-in bonus (+2) per visitor.
      const [{ data: clicks }] = await Promise.all([
        supabase.from('affiliate_clicks').select('fp_id').gte('created_at', since).not('fp_id', 'is', null),
      ])
      const clickCounts = new Map<string, number>()
      for (const c of clicks ?? []) {
        const fp = String(c.fp_id ?? '')
        if (fp) clickCounts.set(fp, (clickCounts.get(fp) ?? 0) + 1)
      }
      const signedIn = new Set<string>()
      for (const r of rows) {
        if (r.fp_id && r.user_id) signedIn.add(String(r.fp_id))
      }
      fpQualification = new Map<string, QualificationTier>()
      const scoreOf = (fp: string): number => {
        if (!fp) return 0
        return (clickCounts.get(fp) ?? 0) * 2 + (signedIn.has(fp) ? 2 : 0)
      }
      for (const r of rows) {
        const fp = String(r.fp_id ?? '')
        if (fp && !fpQualification.has(fp)) {
          const s = scoreOf(fp) + (INTENT_WEIGHTS[String(r.action ?? '') as IntentAction] ?? 0)
          fpQualification.set(fp, qualificationTier(s))
        }
      }
      // Re-score on the full visitor (intent + clicks + bonus) for accuracy.
      const visitorTotals = new Map<string, number>()
      for (const r of rows) {
        const fp = String(r.fp_id ?? '')
        if (!fp) continue
        visitorTotals.set(fp, (visitorTotals.get(fp) ?? 0) + (INTENT_WEIGHTS[String(r.action ?? '') as IntentAction] ?? 0))
      }
      for (const [fp, base] of visitorTotals) {
        fpQualification.set(fp, qualificationTier(base + (clickCounts.get(fp) ?? 0) * 2 + (signedIn.has(fp) ? 2 : 0)))
      }
    }
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

  // Catalog-aware dimensions (price tier / major category) need the slug → catalog
  // map. Loaded lazily so the other dimensions keep their single round trip.
  if (needsCatalog) {
    const { data: catalog } = await supabase.from('devices').select('slug, price_tier, major_category')
    catalogDims = new Map(
      (catalog ?? []).map((d) => [
        String(d.slug),
        {
          tier: d.price_tier ? String(d.price_tier) : '(unspecified)',
          category: d.major_category ? String(d.major_category) : '(unspecified)',
        },
      ]),
    )
  }

  const slugFromRow = (row: Record<string, unknown>): string => {
    const explicit = row.device_slug ? String(row.device_slug) : ''
    if (explicit) return explicit
    const path = String(row.path ?? '')
    if (!path.startsWith('/devices/')) return ''
    const parts = path.replace('/devices/', '').split('/').filter(Boolean)
    return parts[1] ?? parts[0] ?? ''
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
      case 'price_tier': {
        const slug = slugFromRow(row)
        if (!slug) return '(non-device)'
        return catalogDims.get(slug)?.tier ?? '(not in catalog)'
      }
      case 'category': {
        const slug = slugFromRow(row)
        if (!slug) return '(non-device)'
        return catalogDims.get(slug)?.category ?? '(not in catalog)'
      }
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
      case 'qualification_tier': {
        if (!useInteractions) return '(needs an intent metric)'
        const fp = String(row.fp_id ?? '')
        if (!fp) return '(anonymous)'
        const tier = fpQualification.get(fp)
        return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '(unscored)'
      }
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
    } else if (isIntentScore) {
      const weight = INTENT_WEIGHTS[String(row.action ?? '') as IntentAction] ?? 0
      if (weight > 0) buckets.set(label, (buckets.get(label) ?? 0) + weight)
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
  'device-catalog',
  'catalog-gaps',
  'consideration-funnel',
  'consideration-queue',
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — Devices & Catalog intelligence
//
// Canvas anchors: `Manage Digital Channels` (catalog entries ARE channel assets)
// + `Manage Distribution & Marketing` (buy links = the distribution plane).
//
// The tab answers four questions, in order:
//   A. Coverage   — can this catalog earn at all? (kpi_buy_fill, retailer reach)
//   B. Demand     — which assets pull their weight? (tier/category/brand, Pareto)
//   C. Leakage    — where does demand hit a dead end? (ghost demand, orphan paths)
//   D. Action     — what to fix, ranked by views at risk (prescriptive queue)
//
// Everything is derived from tables that already exist (devices · brands ·
// device_types · page_views · affiliate_clicks · interactions ·
// link_health_checks · affiliate_commission_rates) — no new instrumentation,
// no migration, no new cron. Pure-JS aggregation, same discipline as
// getTrafficInsights / getContentInsights.
// ─────────────────────────────────────────────────────────────────────────────

/** Where a device-page view lands, from a revenue point of view. */
export type {
  DeviceOutcome,
  DeviceIssue,
} from './deviceOutcome'
export {
  DEVICE_OUTCOME_ORDER,
  DEVICE_OUTCOME_LABELS,
  DEVICE_OUTCOME_COLORS,
  DEVICE_OUTCOME_DESCRIPTIONS,
  DEVICE_ISSUE_META,
  DEVICE_ISSUE_SEVERITY_COLORS,
  PRICE_TIER_ORDER,
  BUYBOX_RETAILER_KEYS,
  priceTierLabel,
  majorCategoryLabel,
  normaliseRetailer,
  retailerLabel,
} from './deviceOutcome'
import {
  type DeviceOutcome,
  type DeviceIssue,
  DEVICE_OUTCOME_ORDER,
  DEVICE_OUTCOME_LABELS,
  DEVICE_ISSUE_META,
  PRICE_TIER_ORDER,
  BUYBOX_RETAILER_KEYS,
  priceTierLabel,
  majorCategoryLabel,
  normaliseRetailer,
  retailerLabel,
} from './deviceOutcome'

function severityForViews(views: number): 'high' | 'medium' | 'low' {
  if (views >= 50) return 'high'
  if (views >= 10) return 'medium'
  return 'low'
}

function sharePct(part: number, whole: number, decimals = 2): number {
  if (whole <= 0) return 0
  const factor = Math.pow(10, decimals)
  return Math.round((part / whole) * 100 * factor) / factor
}

interface BuyLinkEntry {
  retailer: string
  url: string
  price: string
  priceDate: string
}

/** Internal, normalised catalog entry (one published or draft device). */
interface CatalogEntry {
  id: number | null
  slug: string
  name: string
  brandSlug: string
  brandName: string
  status: string
  priceTier: string
  majorCategory: string
  deviceType: string
  availability: string | null
  releaseYear: number | null
  priceKes: number | null
  buyLinks: BuyLinkEntry[]
  hasImages: boolean
  hasVerdict: boolean
  hasScore: boolean
  hasSeo: boolean
  createdAt: string | null
}

/** One row of the catalog performance grid (demand per channel asset). */
export interface DeviceCatalogRow {
  slug: string
  name: string
  brandSlug: string
  brandName: string
  priceTier: string
  majorCategory: string
  deviceType: string
  status: string
  views: number
  clicks: number
  ctr: number
  buyLinkCount: number
  intentEvents: number
  outcome: DeviceOutcome
  href: string
}

/** One prescriptive row of the catalog fix queue (the loop-closer). */
export interface DeviceFixQueueItem {
  slug: string | null
  path: string | null
  name: string
  brandSlug: string
  issue: DeviceIssue
  label: string
  action: string
  detail: string
  viewsAtRisk: number
  severity: 'high' | 'medium' | 'low'
  href: string | null
  editHref: string | null
}

export interface DeviceInsights {
  /** A. Coverage — can the catalog earn at all? */
  catalog: {
    total: number
    published: number
    draft: number
    publishRatePct: number
    withBuyLink: number
    withoutBuyLink: number
    buyLinkTotal: number
    /** kpi_buy_fill — % of published devices with ≥1 valid buy link. */
    fillRatePct: number
    retailersUsed: number
    linksPerMonetisedDevice: number
    linkCountBuckets: Array<{ label: string; devices: number }>
    readiness: Array<{ key: string; label: string; covered: number; total: number; pct: number }>
    priceFreshness: Array<{ label: string; links: number; sharePct: number }>
    avgPriceKes: number | null
    newestPublishedAt: string | null
  }
  /** A2. Distribution — the retailer plane + link-health census. */
  distribution: {
    retailerCoverage: Array<{ retailer: string; label: string; devices: number; sharePct: number }>
    retailerTierMatrix: {
      tiers: string[]
      tierLabels: string[]
      rows: Array<{ retailer: string; label: string; counts: number[]; total: number }>
      maxCell: number
    }
    retailerTaxonomy: Array<{
      retailer: string
      label: string
      inCatalog: boolean
      inClicks: boolean
      inCommission: boolean
      buyBoxRenders: boolean
      clicks: number
      mismatch: boolean
      note: string
    }>
    linkHealth: {
      checked: number
      ok: number
      broken: number
      unhealthyPct: number
      uncheckedLive: number
      orphanChecks: number
      lastCheckedAt: string | null
    }
  }
  /** B. Demand — which assets pull their weight? */
  demand: {
    totals: {
      deviceViews: number
      deviceClicks: number
      ctr: number
      devicesWithViews: number
      devicesWithoutViews: number
      publishedWithoutViews: number
      viewsPerDevice: number
    }
    deviceRows: DeviceCatalogRow[]
    byTier: Array<{
      tier: string
      label: string
      devices: number
      views: number
      clicks: number
      ctr: number
      viewsPerDevice: number
      monetisedSharePct: number
    }>
    byCategory: Array<{ category: string; label: string; devices: number; views: number; clicks: number; ctr: number }>
    byBrand: Array<{
      brandSlug: string
      brandName: string
      devices: number
      views: number
      clicks: number
      ctr: number
      coveragePct: number
    }>
    concentration: Array<{ rank: number; slug: string; label: string; views: number; sharePct: number; cumulativePct: number }>
    /** How many devices it takes to reach 80% of device views (head of the catalog). */
    paretoIndex: number | null
    topDeviceSharePct: number
    top10SharePct: number
    heatmap: Array<{ bucket: string; tiers: Record<string, number>; total: number }>
    heatmapTiers: string[]
    heatmapTierLabels: string[]
  }
  /** C. Leakage — where does demand hit a dead end? */
  leakage: {
    flow: { nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }
    outcomes: Array<{ outcome: DeviceOutcome; label: string; views: number; sharePct: number }>
    monetisedViews: number
    wastedViews: number
    wastedPct: number
    monetisedSharePct: number
    orphanPaths: Array<{ path: string; slug: string; views: number }>
    fixQueue: DeviceFixQueueItem[]
  }
}

/**
 * Devices & Catalog analytics — one aggregator for the whole tab.
 *
 * @param period '7d' | '30d' | '90d'
 */
export async function getDeviceInsights(period: string): Promise<DeviceInsights> {
  const since = sinceISO(period)
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const dayMs = 86400000
  const nowMs = Date.now()
  const sinceMs = nowMs - days * dayMs

  // 1) Load the four planes in parallel — catalog, audience, clicks, distribution.
  const [deviceRes, typeRes, viewRes, clickRes, rateRes, healthRes, interactionRes] = await Promise.all([
    supabase
      .from('devices')
      .select(
        'id, slug, name, status, price_tier, major_category, device_type_id, availability, release_year, price_kes, images, verdict_pros, verdict_bottom_line, scores_overall, seo_title, buy_links, created_at, brand:brands(slug, name)',
      ),
    supabase.from('device_types').select('id, label, slug'),
    supabase.from('page_views').select('path, created_at').gte('created_at', since).like('path', '/devices/%'),
    supabase.from('affiliate_clicks').select('device_slug, retailer').gte('created_at', since),
    supabase.from('affiliate_commission_rates').select('retailer'),
    supabase
      .from('link_health_checks')
      .select('device_slug, retailer, url, status_code, ok, checked_at')
      .order('checked_at', { ascending: false })
      .limit(4000),
    supabase.from('interactions').select('action, device_slug').gte('created_at', since),
  ])

  const typeById = new Map<number, string>()
  for (const t of typeRes.data ?? []) typeById.set(Number(t.id), String(t.label ?? t.slug ?? ''))

  // 2) Normalise the catalog. A buy link only counts when it carries a real
  //    http URL — a row with a retailer but no URL can be neither clicked nor
  //    HEAD-checked, so it is not distribution coverage.
  const catalog: CatalogEntry[] = (deviceRes.data ?? []).map((d) => {
    const brandRaw = d.brand as { slug?: string; name?: string } | Array<{ slug?: string; name?: string }> | null
    const brand = Array.isArray(brandRaw) ? brandRaw[0] : brandRaw
    const rawLinks = Array.isArray(d.buy_links) ? (d.buy_links as Array<Record<string, unknown>>) : []
    const buyLinks: BuyLinkEntry[] = []
    for (const l of rawLinks) {
      const retailer = String(l?.retailer ?? '').trim()
      const url = String(l?.url ?? '').trim()
      if (!retailer || !url.startsWith('http')) continue
      buyLinks.push({
        retailer,
        url,
        price: l?.price === undefined || l?.price === null ? '' : String(l.price),
        priceDate: l?.priceDate ? String(l.priceDate) : '',
      })
    }
    const pros = Array.isArray(d.verdict_pros) ? d.verdict_pros : []
    const images = Array.isArray(d.images) ? d.images : []
    const brandSlug = String(brand?.slug ?? '')
    return {
      id: d.id === null || d.id === undefined ? null : Number(d.id),
      slug: String(d.slug ?? ''),
      name: String(d.name ?? d.slug ?? ''),
      brandSlug,
      brandName: String(brand?.name ?? (brandSlug ? titleCaseSlug(brandSlug) : 'Unknown brand')),
      status: String(d.status ?? 'draft'),
      priceTier: d.price_tier ? String(d.price_tier) : 'unspecified',
      majorCategory: d.major_category ? String(d.major_category) : 'unspecified',
      deviceType: typeById.get(Number(d.device_type_id)) ?? 'Unspecified',
      availability: d.availability ? String(d.availability) : null,
      releaseYear: d.release_year === null || d.release_year === undefined ? null : Number(d.release_year),
      priceKes: d.price_kes === null || d.price_kes === undefined ? null : Number(d.price_kes),
      buyLinks,
      hasImages: images.length > 0,
      hasVerdict: pros.length > 0 || Boolean(d.verdict_bottom_line),
      hasScore: Number(d.scores_overall ?? 0) > 0,
      hasSeo: Boolean(d.seo_title),
      createdAt: d.created_at ? String(d.created_at) : null,
    }
  })

  const bySlug = new Map<string, CatalogEntry>()
  for (const entry of catalog) if (entry.slug) bySlug.set(entry.slug, entry)

  // 3) Audience: device-page views by slug (plus the day, for the heatmap) and
  //    the brand slug actually observed in the URL — a mismatch is a 404.
  const viewsBySlug = new Map<string, number>()
  const dayViewsBySlug = new Map<string, Map<string, number>>()
  const pathViews = new Map<string, number>()
  const observedBrand = new Map<string, string>()
  let deviceViews = 0
  for (const row of viewRes.data ?? []) {
    const path = String(row.path ?? '')
    const parts = path.replace('/devices/', '').split('/').filter(Boolean)
    const pathBrand = parts[0] ?? ''
    const slug = parts[1] ?? parts[0] ?? ''
    if (!slug) continue
    deviceViews++
    pathViews.set(path, (pathViews.get(path) ?? 0) + 1)
    viewsBySlug.set(slug, (viewsBySlug.get(slug) ?? 0) + 1)
    if (pathBrand && !observedBrand.has(slug)) observedBrand.set(slug, pathBrand)
    const day = new Date(String(row.created_at)).toISOString().split('T')[0]
    const perDay = dayViewsBySlug.get(slug) ?? new Map<string, number>()
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
    dayViewsBySlug.set(slug, perDay)
  }

  // 4) Conversion + intent signals.
  const clicksBySlug = new Map<string, number>()
  const clicksByRetailer = new Map<string, number>()
  const rawRetailerVariants = new Map<string, Set<string>>()
  let deviceClicks = 0
  for (const row of clickRes.data ?? []) {
    deviceClicks++
    const slug = String(row.device_slug ?? '')
    const raw = String(row.retailer ?? '').trim()
    const retailer = normaliseRetailer(raw)
    if (slug) clicksBySlug.set(slug, (clicksBySlug.get(slug) ?? 0) + 1)
    if (retailer) {
      clicksByRetailer.set(retailer, (clicksByRetailer.get(retailer) ?? 0) + 1)
      const set = rawRetailerVariants.get(retailer) ?? new Set<string>()
      set.add(raw)
      rawRetailerVariants.set(retailer, set)
    }
  }
  const intentBySlug = new Map<string, number>()
  for (const row of interactionRes.data ?? []) {
    const slug = String(row.device_slug ?? '')
    if (slug) intentBySlug.set(slug, (intentBySlug.get(slug) ?? 0) + 1)
  }

  // 5) Resolve what a device-page view actually lands on. Order matters: a
  //    wrong brand slug 404s even though the slug exists, so it stays "stale".
  const outcomeForSlug = (slug: string): DeviceOutcome => {
    const entry = bySlug.get(slug)
    if (!entry) return 'missing'
    const seen = observedBrand.get(slug)
    if (seen && entry.brandSlug && seen !== entry.brandSlug) return 'missing'
    if (entry.status !== 'published') return 'unpublished'
    return entry.buyLinks.length > 0 ? 'monetised' : 'live_no_buylink'
  }

  // ── A. COVERAGE — can the catalog earn at all? ────────────────────────────
  const publishedEntries = catalog.filter((e) => e.status === 'published')
  const monetisedEntries = publishedEntries.filter((e) => e.buyLinks.length > 0)
  const buyLinkTotal = publishedEntries.reduce((sum, e) => sum + e.buyLinks.length, 0)
  const pricedEntries = publishedEntries.filter((e) => (e.priceKes ?? 0) > 0)

  const linkCountBuckets = [
    { label: 'No link', devices: publishedEntries.length - monetisedEntries.length },
    { label: '1 link', devices: publishedEntries.filter((e) => e.buyLinks.length === 1).length },
    { label: '2–3 links', devices: publishedEntries.filter((e) => e.buyLinks.length >= 2 && e.buyLinks.length <= 3).length },
    { label: '4+ links', devices: publishedEntries.filter((e) => e.buyLinks.length >= 4).length },
  ]

  // Catalog readiness — every published asset must carry the fields that make
  // it findable (SEO), trustworthy (verdict, score, images) and clickable (price, buy link).
  const readiness = (
    [
      { key: 'buy_link', label: 'Buy link', covered: monetisedEntries.length },
      { key: 'images', label: 'Images', covered: publishedEntries.filter((e) => e.hasImages).length },
      { key: 'price', label: 'Price (KES)', covered: pricedEntries.length },
      { key: 'verdict', label: 'Verdict', covered: publishedEntries.filter((e) => e.hasVerdict).length },
      { key: 'score', label: 'Score', covered: publishedEntries.filter((e) => e.hasScore).length },
      { key: 'seo', label: 'SEO title', covered: publishedEntries.filter((e) => e.hasSeo).length },
    ] satisfies Array<{ key: string; label: string; covered: number }>
  ).map((row) => ({
    ...row,
    total: publishedEntries.length,
    pct: sharePct(row.covered, publishedEntries.length, 0),
  }))

  // Price freshness — a buy box quoting a three-month-old price loses the click
  // it just earned. Buckets come from buy_links[].priceDate (catalogue-owned).
  const freshness = { '0–30d': 0, '31–90d': 0, '91d+': 0, 'No price date': 0 }
  for (const entry of publishedEntries) {
    for (const link of entry.buyLinks) {
      const parsed = Date.parse(link.priceDate)
      if (!link.priceDate || Number.isNaN(parsed)) {
        freshness['No price date']++
        continue
      }
      const ageDays = Math.floor((nowMs - parsed) / dayMs)
      if (ageDays <= 30) freshness['0–30d']++
      else if (ageDays <= 90) freshness['31–90d']++
      else freshness['91d+']++
    }
  }
  const priceFreshness = Object.entries(freshness).map(([label, links]) => ({
    label,
    links,
    sharePct: sharePct(links, buyLinkTotal, 1),
  }))

  const retailersUsed = new Set<string>()
  for (const entry of publishedEntries) for (const link of entry.buyLinks) retailersUsed.add(normaliseRetailer(link.retailer))

  const publishedDates = publishedEntries
    .map((e) => (e.createdAt ? Date.parse(e.createdAt) : Number.NaN))
    .filter((t) => Number.isFinite(t))

  // ── A2. DISTRIBUTION — the retailer plane ────────────────────────────────
  // Retailer coverage is a catalog census (how many published devices can be
  // bought through each retailer), then broken down by price tier so an
  // unmonetised tier shows up as a blank column rather than a hidden zero.
  const coverageByRetailer = new Map<string, Set<string>>()
  for (const entry of publishedEntries) {
    for (const link of entry.buyLinks) {
      const retailer = normaliseRetailer(link.retailer)
      const set = coverageByRetailer.get(retailer) ?? new Set<string>()
      set.add(entry.slug)
      coverageByRetailer.set(retailer, set)
    }
  }

  const presentTiers = PRICE_TIER_ORDER.filter((t) => publishedEntries.some((e) => e.priceTier === t))
  const tiers: string[] =
    presentTiers.length > 0 ? [...presentTiers] : [...PRICE_TIER_ORDER]
  if (publishedEntries.some((e) => e.priceTier === 'unspecified')) tiers.push('unspecified')

  const matrixRetailers = Array.from(
    new Set([
      ...Array.from(coverageByRetailer.keys()),
      ...Array.from(clicksByRetailer.keys()),
      ...(rateRes.data ?? []).map((r) => normaliseRetailer(String(r.retailer ?? ''))),
    ]),
  ).filter(Boolean)

  const retailerTierRows = matrixRetailers
    .map((retailer) => {
      const counts = tiers.map(
        (tier) =>
          publishedEntries.filter(
            (e) => e.priceTier === tier && e.buyLinks.some((l) => normaliseRetailer(l.retailer) === retailer),
          ).length,
      )
      return { retailer, label: retailerLabel(retailer), counts, total: counts.reduce((a, b) => a + b, 0) }
    })
    .sort((a, b) => b.total - a.total || (clicksByRetailer.get(b.retailer) ?? 0) - (clicksByRetailer.get(a.retailer) ?? 0))

  const maxCell = Math.max(1, ...retailerTierRows.flatMap((r) => r.counts))

  // ── Retailer taxonomy reconciliation ─────────────────────────────────────
  // Case variants are collected too: click rows written before the lowercase
  // convention (e.g. "Jumia") never match the lowercase rate sheet, so the
  // revenue proxy silently weights them 0.
  const catalogRetailerVariants = new Map<string, Set<string>>()
  for (const entry of catalog) {
    for (const link of entry.buyLinks) {
      const key = normaliseRetailer(link.retailer)
      const set = catalogRetailerVariants.get(key) ?? new Set<string>()
      set.add(link.retailer)
      catalogRetailerVariants.set(key, set)
    }
  }
  const clickRetailers = new Set(clicksByRetailer.keys())
  const commissionRetailers = new Set((rateRes.data ?? []).map((r) => normaliseRetailer(String(r.retailer ?? ''))))

  const retailerTaxonomy = Array.from(
    new Set([...catalogRetailerVariants.keys(), ...clickRetailers, ...commissionRetailers, ...BUYBOX_RETAILER_KEYS]),
  )
    .filter(Boolean)
    .map((retailer) => {
      const catalogVariants = catalogRetailerVariants.get(retailer) ?? new Set<string>()
      const clickVariants = rawRetailerVariants.get(retailer) ?? new Set<string>()
      const allVariants = new Set<string>([...catalogVariants, ...clickVariants])
      const inCatalog = catalogVariants.size > 0
      const inClicks = clickRetailers.has(retailer)
      const inCommission = commissionRetailers.has(retailer)
      const buyBoxRenders = BUYBOX_RETAILER_KEYS.includes(retailer)
      // Any stored spelling other than the canonical lowercase key is a hazard:
      // /api/out matches retailers case-sensitively and the rate sheet is lowercase.
      const caseMismatch = Array.from(allVariants).some((v) => v !== retailer)
      const notes: string[] = []
      if (!buyBoxRenders) notes.push('buy box renders "Other"')
      if (!inCommission) notes.push('no rate — proxy weights clicks 0')
      if (caseMismatch) notes.push(`case mismatch (${Array.from(allVariants).join(' / ')})`)
      if (!inCatalog && inClicks) notes.push('clicks with no catalog link')
      if (notes.length === 0) notes.push('registries agree')
      return {
        retailer,
        label: retailerLabel(retailer),
        inCatalog,
        inClicks,
        inCommission,
        buyBoxRenders,
        clicks: clicksByRetailer.get(retailer) ?? 0,
        mismatch: !buyBoxRenders || !inCommission || caseMismatch || (!inCatalog && inClicks),
        note: notes.join(' · '),
      }
    })
    .sort((a, b) => b.clicks - a.clicks || Number(b.mismatch) - Number(a.mismatch) || a.retailer.localeCompare(b.retailer))

  // ── Link-health census ───────────────────────────────────────────────────
  // Three numbers matter: what the cron checked, what it has never seen (blind
  // spots on live buy links) and what it still checks but the catalog dropped.
  const liveUrls = new Set<string>()
  for (const entry of catalog) for (const link of entry.buyLinks) liveUrls.add(link.url)

  const checkedUrls = new Set<string>()
  const brokenBySlug = new Map<string, { retailer: string; url: string; statusCode: number | null }>()
  let okUrls = 0
  let brokenUrls = 0
  let lastCheckedAt: string | null = null
  for (const row of healthRes.data ?? []) {
    const url = String(row.url ?? '')
    if (!url) continue
    const checkedAt = row.checked_at ? new Date(String(row.checked_at)).toISOString() : null
    if (checkedAt && (!lastCheckedAt || checkedAt > lastCheckedAt)) lastCheckedAt = checkedAt
    if (checkedUrls.has(url)) continue
    checkedUrls.add(url)
    if (row.ok) {
      okUrls++
    } else {
      brokenUrls++
      const slug = String(row.device_slug ?? '')
      if (slug && !brokenBySlug.has(slug)) {
        brokenBySlug.set(slug, {
          retailer: String(row.retailer ?? ''),
          url,
          statusCode: row.status_code === null || row.status_code === undefined ? null : Number(row.status_code),
        })
      }
    }
  }

  // __DEVICE_INSIGHTS_NEXT__

  // ── B. DEMAND — which assets pull their weight? ──────────────────────────
  const deviceRows: DeviceCatalogRow[] = catalog
    .map((entry) => {
      const views = viewsBySlug.get(entry.slug) ?? 0
      const clicks = clicksBySlug.get(entry.slug) ?? 0
      return {
        slug: entry.slug,
        name: entry.name,
        brandSlug: entry.brandSlug,
        brandName: entry.brandName,
        priceTier: entry.priceTier,
        majorCategory: entry.majorCategory,
        deviceType: entry.deviceType,
        status: entry.status,
        views,
        clicks,
        ctr: views > 0 ? sharePct(clicks, views) : 0,
        buyLinkCount: entry.buyLinks.length,
        intentEvents: intentBySlug.get(entry.slug) ?? 0,
        outcome: outcomeForSlug(entry.slug),
        href: entry.brandSlug ? `/devices/${entry.brandSlug}/${entry.slug}` : `/devices/${entry.slug}`,
      }
    })
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks || a.name.localeCompare(b.name))

  const devicesWithViews = deviceRows.filter((r) => r.views > 0).length
  const publishedWithoutViews = publishedEntries.filter((e) => (viewsBySlug.get(e.slug) ?? 0) === 0).length

  // Aggregate a set of devices into one demand row (views, clicks, CTR, monetised share).
  const aggregate = (entries: CatalogEntry[]) => {
    const views = entries.reduce((sum, e) => sum + (viewsBySlug.get(e.slug) ?? 0), 0)
    const clicks = entries.reduce((sum, e) => sum + (clicksBySlug.get(e.slug) ?? 0), 0)
    const monetisedViews = entries
      .filter((e) => outcomeForSlug(e.slug) === 'monetised')
      .reduce((sum, e) => sum + (viewsBySlug.get(e.slug) ?? 0), 0)
    return {
      devices: entries.length,
      views,
      clicks,
      ctr: views > 0 ? sharePct(clicks, views) : 0,
      viewsPerDevice: entries.length > 0 ? Math.round((views / entries.length) * 10) / 10 : 0,
      monetisedSharePct: sharePct(monetisedViews, views, 1),
    }
  }

  const tierKeys = Array.from(new Set(deviceRows.map((r) => r.priceTier)))
  const orderedTiers = [
    ...PRICE_TIER_ORDER.filter((t) => tierKeys.includes(t)),
    ...tierKeys.filter((t) => !(PRICE_TIER_ORDER as readonly string[]).includes(t)).sort(),
  ]
  const byTier = orderedTiers.map((tier) => {
    const entries = catalog.filter((e) => e.priceTier === tier)
    return { tier, label: priceTierLabel(tier), ...aggregate(entries) }
  })

  const categoryKeys = Array.from(new Set(deviceRows.map((r) => r.majorCategory)))
  const byCategory = categoryKeys
    .map((category) => {
      const entries = catalog.filter((e) => e.majorCategory === category)
      const agg = aggregate(entries)
      return { category, label: majorCategoryLabel(category), devices: agg.devices, views: agg.views, clicks: agg.clicks, ctr: agg.ctr }
    })
    .sort((a, b) => b.views - a.views || b.devices - a.devices)

  const brandKeys = Array.from(new Set(catalog.map((e) => e.brandSlug))).filter(Boolean)
  const byBrand = brandKeys
    .map((brandSlug) => {
      const entries = catalog.filter((e) => e.brandSlug === brandSlug)
      const published = entries.filter((e) => e.status === 'published')
      const agg = aggregate(entries)
      const monetised = published.filter((e) => e.buyLinks.length > 0).length
      return {
        brandSlug,
        brandName: entries[0]?.brandName ?? titleCaseSlug(brandSlug),
        devices: agg.devices,
        views: agg.views,
        clicks: agg.clicks,
        ctr: agg.ctr,
        coveragePct: sharePct(monetised, published.length, 0),
      }
    })
    .sort((a, b) => b.views - a.views || b.devices - a.devices)
    .slice(0, 12)

  // __DEVICE_INSIGHTS_NEXT2__

  // ── Concentration (Pareto) ───────────────────────────────────────────────
  // How few pages carry the whole catalog. Head-heavy is normal; a long tail
  // of zero-view published pages is the signal that matters.
  const listed = deviceRows.filter((r) => r.views > 0)
  const listedViews = listed.reduce((sum, r) => sum + r.views, 0)
  let paretoIndex: number | null = null
  {
    let running = 0
    for (let i = 0; i < listed.length; i++) {
      running += listed[i].views
      if (paretoIndex === null && listedViews > 0 && running >= listedViews * 0.8) paretoIndex = i + 1
    }
  }
  let cumulativeViews = 0
  const concentration = listed.slice(0, 12).map((row, i) => {
    cumulativeViews += row.views
    return {
      rank: i + 1,
      slug: row.slug,
      label: row.name,
      views: row.views,
      sharePct: sharePct(row.views, listedViews, 1),
      cumulativePct: sharePct(cumulativeViews, listedViews, 1),
    }
  })
  const top10Views = listed.slice(0, 10).reduce((sum, r) => sum + r.views, 0)

  // ── Demand rhythm heatmap (bucket × price tier) ───────────────────────────
  // Same recipe as the Content tab's section momentum, but keyed by the
  // catalog's own dimension — where attention moves across the price ladder.
  const bucketSize = days === 7 ? 1 : 7
  const heatmap: DeviceInsights['demand']['heatmap'] = []
  for (let start = sinceMs; start <= nowMs; start += bucketSize * dayMs) {
    const bucketStart = new Date(start)
    const isoStart = bucketStart.toISOString().split('T')[0]
    const isoEnd = new Date(start + (bucketSize - 1) * dayMs).toISOString().split('T')[0]
    const tierValues: Record<string, number> = {}
    for (const tier of orderedTiers) tierValues[tier] = 0
    for (const entry of catalog) {
      const perDay = dayViewsBySlug.get(entry.slug)
      if (!perDay) continue
      for (const [day, count] of perDay) {
        if (day >= isoStart && day <= isoEnd) tierValues[entry.priceTier] = (tierValues[entry.priceTier] ?? 0) + count
      }
    }
    heatmap.push({
      bucket: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`,
      tiers: tierValues,
      total: Object.values(tierValues).reduce((a, b) => a + b, 0),
    })
  }

  // __DEVICE_INSIGHTS_NEXT3__

  // ── C. LEAKAGE — where does demand hit a dead end? ───────────────────────
  const outcomeViews: Record<DeviceOutcome, number> = {
    monetised: 0,
    live_no_buylink: 0,
    unpublished: 0,
    missing: 0,
  }
  for (const [slug, views] of Array.from(viewsBySlug.entries())) {
    outcomeViews[outcomeForSlug(slug)] += views
  }
  const outcomeOrder: DeviceOutcome[] = DEVICE_OUTCOME_ORDER
  const outcomes = outcomeOrder.map((outcome) => ({
    outcome,
    label: DEVICE_OUTCOME_LABELS[outcome],
    views: outcomeViews[outcome],
    sharePct: sharePct(outcomeViews[outcome], deviceViews, 1),
  }))

  // Ghost-demand flow: brand → outcome. A Sankey because the point is the
  // ribbon width: how much of each brand's demand survives to a live buy link.
  const brandViews = new Map<string, number>()
  const viewsBySlugPath = new Map<string, { path: string; views: number; slug: string }>()
  for (const [slug, views] of Array.from(viewsBySlug.entries())) {
    const entry = bySlug.get(slug)
    const brand = entry?.brandName ?? 'Not in catalog'
    brandViews.set(brand, (brandViews.get(brand) ?? 0) + views)
    const observed = observedBrand.get(slug)
    viewsBySlugPath.set(slug, { path: observed ? `/devices/${observed}/${slug}` : `/devices/${slug}`, views, slug })
  }
  const rankedBrands = Array.from(brandViews.entries()).sort((a, b) => b[1] - a[1])
  const flowBrands =
    rankedBrands.length > 6 ? [...rankedBrands.slice(0, 6).map(([name]) => name), 'Other brands'] : rankedBrands.map(([name]) => name)

  const flowNodes = [...flowBrands, ...outcomeOrder.map((o) => DEVICE_OUTCOME_LABELS[o])].map((name) => ({ name }))
  const flowValue = new Map<string, number>()
  for (const [slug, views] of Array.from(viewsBySlug.entries())) {
    const entry = bySlug.get(slug)
    const brandRaw = entry?.brandName ?? 'Not in catalog'
    const brand = flowBrands.includes(brandRaw) ? brandRaw : 'Other brands'
    const key = `${brand}||${outcomeForSlug(slug)}`
    flowValue.set(key, (flowValue.get(key) ?? 0) + views)
  }
  const flowLinks: Array<{ source: number; target: number; value: number }> = []
  for (const [key, value] of Array.from(flowValue.entries())) {
    const [brand, outcome] = key.split('||')
    const source = flowNodes.findIndex((n) => n.name === brand)
    const target = flowNodes.findIndex((n) => n.name === DEVICE_OUTCOME_LABELS[outcome as DeviceOutcome])
    if (source === -1 || target === -1 || value <= 0) continue
    flowLinks.push({ source, target, value })
  }

  // Device paths that match no catalog row (or the wrong brand slug) — pure
  // 404 traffic. This is the "ghost demand" list.
  const orphanPaths = Array.from(viewsBySlugPath.values())
    .filter(({ slug }) => !bySlug.has(slug))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // __DEVICE_INSIGHTS_NEXT4__

  // ── D. ACTION — the prescriptive fix queue ───────────────────────────────
  // One row per (device, issue), ranked by the views currently at risk, so the
  // ticket order is the revenue order. This is the loop-closer the plan asks
  // for: an analytics output that becomes a concrete catalog action.
  const fixQueue: DeviceFixQueueItem[] = []
  const queueSeen = new Set<string>()
  const pushFix = (
    issue: DeviceIssue,
    opts: {
      slug: string | null
      path?: string | null
      name: string
      brandSlug: string
      viewsAtRisk: number
      detail: string
      href: string | null
      editHref: string | null
    },
  ) => {
    const key = `${issue}::${opts.slug ?? opts.path ?? opts.name}`
    if (queueSeen.has(key)) return
    queueSeen.add(key)
    fixQueue.push({
      slug: opts.slug,
      path: opts.path ?? null,
      name: opts.name,
      brandSlug: opts.brandSlug,
      issue,
      label: DEVICE_ISSUE_META[issue].label,
      action: DEVICE_ISSUE_META[issue].action,
      detail: opts.detail,
      viewsAtRisk: opts.viewsAtRisk,
      severity: severityForViews(opts.viewsAtRisk),
      href: opts.href,
      editHref: opts.editHref,
    })
  }

  // 1) Traffic that lands on a page which cannot convert.
  for (const [slug, views] of Array.from(viewsBySlug.entries())) {
    const outcome = outcomeForSlug(slug)
    if (outcome === 'monetised') continue
    const entry = bySlug.get(slug)
    const observed = observedBrand.get(slug)
    const path = observed ? `/devices/${observed}/${slug}` : `/devices/${slug}`
    if (outcome === 'unpublished') {
      pushFix('unpublished_but_trafficked', {
        slug,
        path,
        name: entry?.name ?? slug,
        brandSlug: entry?.brandSlug ?? '',
        viewsAtRisk: views,
        detail: `${views.toLocaleString()} views · catalog status "${entry?.status ?? 'unknown'}" — the page 404s`,
        href: null,
        editHref: entry?.id ? `/admin/devices/${entry.id}/edit` : null,
      })
    } else if (outcome === 'missing') {
      pushFix('stale_slug', {
        slug,
        path,
        name: entry?.name ?? titleCaseSlug(slug),
        brandSlug: entry?.brandSlug ?? observed ?? '',
        viewsAtRisk: views,
        detail: entry
          ? `${views.toLocaleString()} views · path brand "${observed}" does not match catalog brand "${entry.brandSlug}"`
          : `${views.toLocaleString()} views · no catalog row for this slug`,
        href: null,
        editHref: entry?.id ? `/admin/devices/${entry.id}/edit` : null,
      })
    } else {
      pushFix('no_buy_link', {
        slug,
        path,
        name: entry?.name ?? slug,
        brandSlug: entry?.brandSlug ?? '',
        viewsAtRisk: views,
        detail: `${views.toLocaleString()} views · live page with 0 buy links`,
        href: entry?.brandSlug ? `/devices/${entry.brandSlug}/${slug}` : null,
        editHref: entry?.id ? `/admin/devices/${entry.id}/edit` : null,
      })
    }
  }

  // 2) Published pages nobody links to yet — a different failure from a page
  //    people visit and cannot buy from, so it stays in the queue at low risk.
  for (const entry of publishedEntries) {
    if (entry.buyLinks.length > 0) continue
    pushFix('no_buy_link', {
      slug: entry.slug,
      name: entry.name,
      brandSlug: entry.brandSlug,
      viewsAtRisk: viewsBySlug.get(entry.slug) ?? 0,
      detail: 'Published with 0 buy links — no views yet either',
      href: entry.brandSlug ? `/devices/${entry.brandSlug}/${entry.slug}` : null,
      editHref: entry.id ? `/admin/devices/${entry.id}/edit` : null,
    })
  }

  // 3) Dead retailer URLs found by the link-health cron.
  for (const [slug, broken] of Array.from(brokenBySlug.entries())) {
    const entry = bySlug.get(slug)
    pushFix('broken_link', {
      slug,
      name: entry?.name ?? titleCaseSlug(slug),
      brandSlug: entry?.brandSlug ?? '',
      viewsAtRisk: viewsBySlug.get(slug) ?? 0,
      detail: `${retailerLabel(broken.retailer)} link returned ${broken.statusCode ?? 'no response'}`,
      href: entry?.brandSlug ? `/devices/${entry.brandSlug}/${slug}` : null,
      editHref: entry?.id ? `/admin/devices/${entry.id}/edit` : null,
    })
  }

  // 4) Buy links that will under-sell the click: stale or missing prices.
  for (const entry of publishedEntries) {
    if (entry.buyLinks.length === 0) continue
    const views = viewsBySlug.get(entry.slug) ?? 0
    const stale = entry.buyLinks.find((l) => {
      const parsed = Date.parse(l.priceDate)
      return Boolean(l.priceDate) && Number.isFinite(parsed) && (nowMs - parsed) / dayMs > 90
    })
    if (stale) {
      const ageDays = Math.floor((nowMs - Date.parse(stale.priceDate)) / dayMs)
      pushFix('stale_price', {
        slug: entry.slug,
        name: entry.name,
        brandSlug: entry.brandSlug,
        viewsAtRisk: views,
        detail: `${retailerLabel(stale.retailer)} price dated ${stale.priceDate} (${ageDays}d old)`,
        href: entry.brandSlug ? `/devices/${entry.brandSlug}/${entry.slug}` : null,
        editHref: entry.id ? `/admin/devices/${entry.id}/edit` : null,
      })
    }
    const unpriced = entry.buyLinks.find((l) => !l.price)
    if (unpriced) {
      pushFix('missing_price', {
        slug: entry.slug,
        name: entry.name,
        brandSlug: entry.brandSlug,
        viewsAtRisk: views,
        detail: `${retailerLabel(unpriced.retailer)} link has no price — the buy box shows a bare link`,
        href: entry.brandSlug ? `/devices/${entry.brandSlug}/${entry.slug}` : null,
        editHref: entry.id ? `/admin/devices/${entry.id}/edit` : null,
      })
    }
  }

  fixQueue.sort((a, b) => b.viewsAtRisk - a.viewsAtRisk || a.label.localeCompare(b.label))

  // __DEVICE_INSIGHTS_RETURN__

  return {
    catalog: {
      total: catalog.length,
      published: publishedEntries.length,
      draft: catalog.length - publishedEntries.length,
      publishRatePct: sharePct(publishedEntries.length, catalog.length, 0),
      withBuyLink: monetisedEntries.length,
      withoutBuyLink: publishedEntries.length - monetisedEntries.length,
      buyLinkTotal,
      fillRatePct: sharePct(monetisedEntries.length, publishedEntries.length, 0),
      retailersUsed: retailersUsed.size,
      linksPerMonetisedDevice: monetisedEntries.length > 0 ? Math.round((buyLinkTotal / monetisedEntries.length) * 10) / 10 : 0,
      linkCountBuckets,
      readiness,
      priceFreshness,
      avgPriceKes:
        pricedEntries.length > 0
          ? Math.round(pricedEntries.reduce((sum, e) => sum + (e.priceKes ?? 0), 0) / pricedEntries.length)
          : null,
      newestPublishedAt: publishedDates.length > 0 ? new Date(Math.max(...publishedDates)).toISOString() : null,
    },
    distribution: {
      retailerCoverage: Array.from(coverageByRetailer.entries())
        .map(([retailer, slugs]) => ({
          retailer,
          label: retailerLabel(retailer),
          devices: slugs.size,
          sharePct: sharePct(slugs.size, publishedEntries.length, 1),
        }))
        .sort((a, b) => b.devices - a.devices || a.label.localeCompare(b.label)),
      retailerTierMatrix: {
        tiers,
        tierLabels: tiers.map(priceTierLabel),
        rows: retailerTierRows,
        maxCell,
      },
      retailerTaxonomy,
      linkHealth: {
        checked: checkedUrls.size,
        ok: okUrls,
        broken: brokenUrls,
        unhealthyPct: sharePct(brokenUrls, checkedUrls.size, 1),
        uncheckedLive: Array.from(liveUrls).filter((url) => !checkedUrls.has(url)).length,
        orphanChecks: Array.from(checkedUrls).filter((url) => !liveUrls.has(url)).length,
        lastCheckedAt,
      },
    },
    demand: {
      totals: {
        deviceViews,
        deviceClicks,
        ctr: deviceViews > 0 ? sharePct(deviceClicks, deviceViews) : 0,
        devicesWithViews,
        devicesWithoutViews: deviceRows.length - devicesWithViews,
        publishedWithoutViews,
        viewsPerDevice: deviceRows.length > 0 ? Math.round((deviceViews / deviceRows.length) * 10) / 10 : 0,
      },
      deviceRows,
      byTier,
      byCategory,
      byBrand,
      concentration,
      paretoIndex,
      topDeviceSharePct: listed.length > 0 ? sharePct(listed[0].views, listedViews, 1) : 0,
      top10SharePct: sharePct(top10Views, listedViews, 1),
      heatmap,
      heatmapTiers: orderedTiers,
      heatmapTierLabels: orderedTiers.map(priceTierLabel),
    },
    leakage: {
      flow: { nodes: flowNodes, links: flowLinks },
      outcomes,
      monetisedViews: outcomeViews.monetised,
      wastedViews: outcomeViews.unpublished + outcomeViews.missing,
      wastedPct: sharePct(outcomeViews.unpublished + outcomeViews.missing, deviceViews, 1),
      monetisedSharePct: sharePct(outcomeViews.monetised, deviceViews, 1),
      orphanPaths,
      fixQueue,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 9 — Compare & Consideration intelligence
//
// Canvas anchors: `Manage Digital Channels` (/compare IS a channel asset) +
// `Manage Qualification Analytics` (intent → hot/warm/cold is the MQL layer).
//
// One aggregator for the whole tab; pure-JS over existing tables
// (interactions · page_views · affiliate_clicks · devices · brands) — no new
// instrumentation, no migration, no new cron. Same discipline as
// getTrafficInsights / getContentInsights / getDeviceInsights.

/** One visitor's full consideration journey in the period. */
export interface ConsiderationVisitor {
  fpId: string
  score: number
  tier: QualificationTier
  signedIn: boolean
  saves: number
  compares: number
  watches: number
  relatedClicks: number
  affiliateClicks: number
  deviceSlugs: string[]
  lastSeenAt: string
}

/** One device's role in the consideration story. */
export interface ConsideredDeviceRow {
  slug: string
  name: string
  brandSlug: string
  brandName: string
  priceTier: string
  deviceType: string
  status: string
  saves: number
  compares: number
  watches: number
  relatedClicks: number
  /** Weighted intent (compare×3 + save×2 + watch + related). */
  intentScore: number
  views: number
  clicks: number
  /** Weighted intent per 100 device-page views (×100 for readability). */
  intentPerView: number
  /** Shortlist → buy-link conversion: clicks per 100 intent points. */
  intentToClick: number
  buyLinkCount: number
  /** Temperature of the demand sitting on this device. */
  temperature: 'hot' | 'warm' | 'cold' | 'untouched'
}

/** One prescriptive row of the consideration fix queue. */
export interface ConsiderationFixQueueItem {
  slug: string | null
  pair: string[] | null
  name: string
  issue: ConsiderationIssue
  label: string
  action: string
  detail: string
  interest: number
  severity: 'high' | 'medium' | 'low'
  href: string | null
  editHref: string | null
}

export interface ConsiderationInsights {
  /** A. Funnel — browsers → savers → comparers → buy clickers. */
  funnel: {
    stages: Array<{
      stage: FunnelStage
      label: string
      visitors: number
      shareOfBrowsersPct: number
      stepConversionPct: number | null
    }>
    browsers: number
    buyClickers: number
    browserToBuyerPct: number
  }
  /** B. Mix — where intent events concentrate. */
  mix: {
    totals: {
      events: number
      saves: number
      compares: number
      watches: number
      relatedClicks: number
      activeVisitors: number
      signedInVisitors: number
      comparePageViews: number
      topAction: IntentAction | null
    }
    byAction: Array<{
      action: IntentAction
      label: string
      events: number
      sharePct: number
      visitors: number
      devices: number
    }>
    byContentType: Array<{ type: string; label: string; events: number; sharePct: number }>
    momentum: Array<{ bucket: string; save: number; add_to_compare: number; watch: number; related_click: number; total: number }>
    momentumTotal: number
  }
  /** C. Audience — hot / warm / cold visitors. */
  audience: {
    totals: {
      scored: number
      hot: number
      warm: number
      cold: number
      hotSharePct: number
      warmSharePct: number
      avgScore: number
      signedInSharePct: number
    }
    tiers: Array<{ tier: QualificationTier; label: string; visitors: number; sharePct: number; avgScore: number }>
    topVisitors: ConsiderationVisitor[]
    scoreHistogram: Array<{ bucket: string; visitors: number }>
  }
  /** D. Pairs + devices — what is compared, and which devices convert attention. */
  demand: {
    topPairs: Array<{ pair: string[]; label: string; names: string[]; runs: number; sharePct: number; href: string }>
    totalPairRuns: number
    lopsidedPairs: number
    deviceRows: ConsideredDeviceRow[]
    consideredDevices: number
    consideredSharePct: number
    topConsidered: ConsideredDeviceRow[]
    intentLeaders: ConsideredDeviceRow[]
    conversionLeaders: ConsideredDeviceRow[]
  }
  /** E. Action — consideration fixes ranked by the interest at stake. */
  action: {
    fixQueue: ConsiderationFixQueueItem[]
    interestAtStake: number
  }
}

interface RawInteractionRow {
  action: string
  content_type: string
  content_id: string | null
  device_slug: string | null
  fp_id: string | null
  user_id: string | null
  created_at: string
}

function isIntentAction(action: string): action is IntentAction {
  return action === 'save' || action === 'add_to_compare' || action === 'watch' || action === 'related_click'
}

function severityForInterest(interest: number): 'high' | 'medium' | 'low' {
  if (interest >= 10) return 'high'
  if (interest >= 4) return 'medium'
  return 'low'
}

function temperatureFor(intentEvents: number, intentScore: number): ConsideredDeviceRow['temperature'] {
  if (intentEvents === 0) return 'untouched'
  if (intentScore >= 8) return 'hot'
  if (intentScore >= 4) return 'warm'
  return 'cold'
}

/** Parse `/compare?devices=a,b` into a sorted slug pair (canonical page shape). */
function parseComparePair(path: string): string[] | null {
  const qIndex = path.indexOf('?')
  if (qIndex === -1) return null
  const params = new URLSearchParams(path.slice(qIndex + 1))
  const raw = params.get('devices')
  if (!raw) return null
  const slugs = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 3)
  if (slugs.length < 2) return null
  return [...slugs].sort()
}

/**
 * Compare & Consideration analytics — one aggregator for the whole tab.
 *
 * @param period '7d' | '30d' | '90d'
 */
export async function getConsiderationInsights(period: string): Promise<ConsiderationInsights> {
  const since = sinceISO(period)
  const dayMs = 86400000
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const nowMs = Date.now()

  // 1) Load the three planes in parallel — intent events, compare traffic, clicks + catalog.
  const [interactionRes, compareViewRes, clickRes, deviceRes] = await Promise.all([
    supabase
      .from('interactions')
      .select('action, content_type, content_id, device_slug, fp_id, user_id, created_at')
      .gte('created_at', since),
    supabase.from('page_views').select('path, fp_id').gte('created_at', since).like('path', '/compare%'),
    supabase.from('affiliate_clicks').select('device_slug, retailer, fp_id').gte('created_at', since),
    supabase
      .from('devices')
      .select('id, slug, name, status, price_tier, device_type_id, buy_links, brand:brands(slug, name)'),
  ])

  const interactions = (interactionRes.data ?? []) as RawInteractionRow[]

  // 2) Catalog map — names for every slug we will surface (pairs + device rows).
  const slugMeta = new Map<string, { name: string; brandSlug: string; brandName: string; priceTier: string; deviceId: number | null; status: string; buyLinkCount: number }>()
  for (const d of deviceRes.data ?? []) {
    const slug = String(d.slug ?? '')
    if (!slug) continue
    const brandRaw = d.brand as { slug?: string; name?: string } | Array<{ slug?: string; name?: string }> | null
    const brand = Array.isArray(brandRaw) ? brandRaw[0] : brandRaw
    const brandSlug = String(brand?.slug ?? '')
    const links = Array.isArray(d.buy_links)
      ? (d.buy_links as Array<Record<string, unknown>>).filter((l) => String(l?.url ?? '').startsWith('http'))
      : []
    slugMeta.set(slug, {
      name: String(d.name ?? slug),
      brandSlug,
      brandName: String(brand?.name ?? (brandSlug ? brandSlug.replace(/[-_]/g, ' ') : 'Unknown brand')),
      priceTier: d.price_tier ? String(d.price_tier) : 'unspecified',
      deviceId: d.id === null || d.id === undefined ? null : Number(d.id),
      status: String(d.status ?? 'draft'),
      buyLinkCount: links.length,
    })
  }

  // __CONSIDERATION_FN_2__

  // 3) Device-page browsing universe (funnel's first stage + per-device views).
  const { data: deviceViewRows } = await supabase
    .from('page_views')
    .select('path, fp_id')
    .gte('created_at', since)
    .like('path', '/devices/%')
  const browserFps = new Set<string>()
  const viewsBySlug = new Map<string, number>()
  for (const row of deviceViewRows ?? []) {
    const fp = row.fp_id ? String(row.fp_id) : ''
    if (fp) browserFps.add(fp)
    const parts = String(row.path ?? '').replace('/devices/', '').split('/').filter(Boolean)
    const slug = parts[1] ?? parts[0] ?? ''
    if (slug) viewsBySlug.set(slug, (viewsBySlug.get(slug) ?? 0) + 1)
  }

  // 4) Clicks by visitor + by device (funnel's last stage + device conversion).
  const clickerFps = new Set<string>()
  const clicksBySlug = new Map<string, number>()
  for (const row of clickRes.data ?? []) {
    const fp = row.fp_id ? String(row.fp_id) : ''
    if (fp) clickerFps.add(fp)
    const slug = String(row.device_slug ?? '')
    if (slug) clicksBySlug.set(slug, (clicksBySlug.get(slug) ?? 0) + 1)
  }

  // 5) Intent events: totals, per-visitor, per-action, per-device, momentum days.
  const intentRows = interactions.filter((r) => isIntentAction(r.action))
  const totalEvents = intentRows.length
  const actionCounts: Record<IntentAction, number> = { save: 0, add_to_compare: 0, watch: 0, related_click: 0 }
  const actionFps = new Map<IntentAction, Set<string>>()
  const deviceActions = new Map<string, Record<IntentAction, number>>()
  const deviceActionFps = new Map<string, Set<string>>()
  const contentTypeCounts = new Map<string, number>()
  const momentumDays = new Map<string, Record<IntentAction, number>>()
  const eventsByFp = new Map<string, RawInteractionRow[]>()
  const signedInFps = new Set<string>()

  for (const row of intentRows) {
    const action = row.action as IntentAction
    actionCounts[action]++
    contentTypeCounts.set(String(row.content_type ?? 'device'), (contentTypeCounts.get(String(row.content_type ?? 'device')) ?? 0) + 1)
    const fp = row.fp_id ? String(row.fp_id) : ''
    if (fp) {
      const list = eventsByFp.get(fp) ?? []
      list.push(row)
      eventsByFp.set(fp, list)
      const set = actionFps.get(action) ?? new Set<string>()
      set.add(fp)
      actionFps.set(action, set)
      if (row.user_id) signedInFps.add(fp)
    }
    const slug = row.device_slug ? String(row.device_slug) : ''
    if (slug) {
      const counts = deviceActions.get(slug) ?? { save: 0, add_to_compare: 0, watch: 0, related_click: 0 }
      counts[action]++
      deviceActions.set(slug, counts)
      if (fp) {
        const set = deviceActionFps.get(slug) ?? new Set<string>()
        set.add(fp)
        deviceActionFps.set(slug, set)
      }
    }
    const day = new Date(String(row.created_at)).toISOString().split('T')[0]
    const perDay = momentumDays.get(day) ?? { save: 0, add_to_compare: 0, watch: 0, related_click: 0 }
    perDay[action]++
    momentumDays.set(day, perDay)
  }

  // __CONSIDERATION_FN_3__

  // 6) Qualification — shared score (intent weights + click weight + sign-in bonus).
  const intentBase = new Map<string, number>()
  for (const [fp, list] of eventsByFp) {
    let base = 0
    for (const row of list) base += INTENT_WEIGHTS[row.action as IntentAction] ?? 0
    intentBase.set(fp, base)
  }
  const clickExtra = new Map<string, number>()
  for (const row of clickRes.data ?? []) {
    const fp = row.fp_id ? String(row.fp_id) : ''
    if (!fp) continue
    clickExtra.set(fp, (clickExtra.get(fp) ?? 0) + AFFILIATE_CLICK_WEIGHT)
  }

  const scoredFps = new Set<string>([...intentBase.keys(), ...clickExtra.keys(), ...signedInFps])
  const visitors: ConsiderationVisitor[] = []
  for (const fp of scoredFps) {
    const list = eventsByFp.get(fp) ?? []
    let saves = 0
    let compares = 0
    let watches = 0
    let related = 0
    let lastSeen = 0
    const slugs = new Set<string>()
    for (const row of list) {
      const action = row.action as IntentAction
      if (action === 'save') saves++
      else if (action === 'add_to_compare') compares++
      else if (action === 'watch') watches++
      else related++
      if (row.device_slug) slugs.add(String(row.device_slug))
      const t = new Date(String(row.created_at)).getTime()
      if (Number.isFinite(t)) lastSeen = Math.max(lastSeen, t)
    }
    const affiliate = clickExtra.get(fp) ?? 0
    const isSignedIn = signedInFps.has(fp)
    const score = (intentBase.get(fp) ?? 0) + affiliate + (isSignedIn ? SIGNED_IN_BONUS : 0)
    visitors.push({
      fpId: fp,
      score,
      tier: qualificationTier(score),
      signedIn: isSignedIn,
      saves,
      compares,
      watches,
      relatedClicks: related,
      affiliateClicks: affiliate / AFFILIATE_CLICK_WEIGHT,
      deviceSlugs: Array.from(slugs),
      lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : '',
    })
  }
  visitors.sort((a, b) => b.score - a.score || (b.lastSeenAt > a.lastSeenAt ? 1 : -1))

  const hotVisitors = visitors.filter((v) => v.tier === 'hot')
  const warmVisitors = visitors.filter((v) => v.tier === 'warm')
  const coldVisitors = visitors.filter((v) => v.tier === 'cold')
  const avgScore = visitors.length > 0
    ? Math.round((visitors.reduce((s, v) => s + v.score, 0) / visitors.length) * 10) / 10
    : 0

  // Score histogram: 0–2 · 3–4 · 5–7 · 8–10 · 11+.
  const histogramDefs = [
    { bucket: '0–2', min: 0, max: 2 },
    { bucket: '3–4', min: 3, max: 4 },
    { bucket: '5–7', min: 5, max: 7 },
    { bucket: '8–10', min: 8, max: 10 },
    { bucket: '11+', min: 11, max: Number.MAX_SAFE_INTEGER },
  ]
  const scoreHistogram = histogramDefs.map((def) => ({
    bucket: def.bucket,
    visitors: visitors.filter((v) => v.score >= def.min && v.score <= def.max).length,
  }))

  // 7) Funnel stages — distinct visitors per stage (order matters: browse ⊇ save ⊇ compare).
  const saverFps = actionFps.get('save') ?? new Set<string>()
  const comparerFps = actionFps.get('add_to_compare') ?? new Set<string>()
  const stageSpecs: Array<{ stage: FunnelStage; label: string; set: Set<string> }> = [
    { stage: 'browse', label: 'Browsers', set: browserFps },
    { stage: 'save', label: 'Savers', set: saverFps },
    { stage: 'compare_run', label: 'Comparers', set: comparerFps },
    { stage: 'buy_click', label: 'Buy clickers', set: clickerFps },
  ]
  const stageCounts = stageSpecs.map((s) => s.set.size)
  const funnelStages = stageSpecs.map((s, i) => ({
    stage: s.stage,
    label: s.label,
    visitors: stageCounts[i],
    shareOfBrowsersPct: sharePct(stageCounts[i], stageCounts[0], 1),
    stepConversionPct: i === 0 ? null : stageCounts[i - 1] > 0 ? sharePct(stageCounts[i], stageCounts[i - 1], 1) : 0,
  }))

  // __CONSIDERATION_FN_4__

  // 8) Intent momentum — daily when 7d, weekly otherwise (content-tab recipe).
  const bucketSize = days === 7 ? 1 : 7
  const momentum: ConsiderationInsights['mix']['momentum'] = []
  for (let start = nowMs - (days - 1) * dayMs; start <= nowMs; start += bucketSize * dayMs) {
    const bucketStart = new Date(start)
    const isoStart = bucketStart.toISOString().split('T')[0]
    const isoEnd = new Date(start + (bucketSize - 1) * dayMs).toISOString().split('T')[0]
    const row = { bucket: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`, save: 0, add_to_compare: 0, watch: 0, related_click: 0, total: 0 }
    for (const [day, counts] of momentumDays) {
      if (day >= isoStart && day <= isoEnd) {
        row.save += counts.save
        row.add_to_compare += counts.add_to_compare
        row.watch += counts.watch
        row.related_click += counts.related_click
        row.total += counts.save + counts.add_to_compare + counts.watch + counts.related_click
      }
    }
    momentum.push(row)
  }

  // 9) Compare pairs — /compare?devices=a,b runs keyed by canonical pair.
  const pairRuns = new Map<string, { pair: string[]; runs: number }>()
  let comparePageViews = 0
  for (const row of compareViewRes.data ?? []) {
    comparePageViews++
    const pair = parseComparePair(String(row.path ?? ''))
    if (!pair) continue
    const key = pair.join(' + ')
    const existing = pairRuns.get(key) ?? { pair, runs: 0 }
    existing.runs++
    pairRuns.set(key, existing)
  }
  const totalPairRuns = Array.from(pairRuns.values()).reduce((s, p) => s + p.runs, 0)
  const pairName = (slug: string) => slugMeta.get(slug)?.name ?? slug.replace(/[-_]/g, ' ')
  const topPairs = Array.from(pairRuns.values())
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 12)
    .map(({ pair, runs }) => ({
      pair,
      label: pair.map(pairName).join(' vs '),
      names: pair.map(pairName),
      runs,
      sharePct: totalPairRuns > 0 ? sharePct(runs, totalPairRuns, 1) : 0,
      href: `/compare?devices=${pair.join(',')}`,
    }))

  // Lopsided pairs: pair runs exist but one slug has no catalog row or no views.
  let lopsidedPairs = 0
  for (const { pair } of pairRuns.values()) {
    const weak = pair.some((slug) => !slugMeta.has(slug) || (viewsBySlug.get(slug) ?? 0) === 0)
    if (weak) lopsidedPairs++
  }

  // 10) Per-device consideration rows — intent joined to views + clicks.
  const deviceSlugs = new Set<string>([...deviceActions.keys(), ...viewsBySlug.keys(), ...clicksBySlug.keys()])
  const deviceRows: ConsideredDeviceRow[] = []
  for (const slug of deviceSlugs) {
    const counts = deviceActions.get(slug) ?? { save: 0, add_to_compare: 0, watch: 0, related_click: 0 }
    const intentEvents = counts.save + counts.add_to_compare + counts.watch + counts.related_click
    const intentScore = counts.add_to_compare * 3 + counts.save * 2 + counts.watch + counts.related_click
    const views = viewsBySlug.get(slug) ?? 0
    const clicks = clicksBySlug.get(slug) ?? 0
    const meta = slugMeta.get(slug)
    deviceRows.push({
      slug,
      name: meta?.name ?? slug.replace(/[-_]/g, ' '),
      brandSlug: meta?.brandSlug ?? '',
      brandName: meta?.brandName ?? 'Unknown brand',
      priceTier: meta?.priceTier ?? 'unspecified',
      deviceType: 'Unspecified',
      status: meta?.status ?? 'unknown',
      saves: counts.save,
      compares: counts.add_to_compare,
      watches: counts.watch,
      relatedClicks: counts.related_click,
      intentScore,
      views,
      clicks,
      intentPerView: views > 0 ? Math.round((intentScore / views) * 100 * 10) / 10 : 0,
      intentToClick: intentScore > 0 ? Math.round((clicks / intentScore) * 100 * 10) / 10 : 0,
      buyLinkCount: meta?.buyLinkCount ?? 0,
      temperature: temperatureFor(intentEvents, intentScore),
    })
  }
  deviceRows.sort((a, b) => b.intentScore - a.intentScore || b.views - a.views)

  const consideredDevices = deviceRows.filter((r) => r.intentScore > 0).length

  // __CONSIDERATION_FN_5__

  // 11) Fix queue — one row per (device / pair, issue) ranked by interest at stake.
  const fixQueue: ConsiderationFixQueueItem[] = []
  const queueSeen = new Set<string>()
  const pushFix = (
    issue: ConsiderationIssue,
    opts: {
      slug: string | null
      pair?: string[] | null
      name: string
      interest: number
      detail: string
      href: string | null
      editHref: string | null
    },
  ) => {
    const key = `${issue}::${opts.slug ?? (opts.pair ?? []).join('+')}`
    if (queueSeen.has(key)) return
    queueSeen.add(key)
    fixQueue.push({
      slug: opts.slug,
      pair: opts.pair ?? null,
      name: opts.name,
      issue,
      label: CONSIDERATION_ISSUE_META[issue].label,
      action: CONSIDERATION_ISSUE_META[issue].action,
      detail: opts.detail,
      interest: opts.interest,
      severity: severityForInterest(opts.interest),
      href: opts.href,
      editHref: opts.editHref,
    })
  }
  const editHrefFor = (slug: string): string | null => {
    const id = slugMeta.get(slug)?.deviceId ?? null
    return id ? `/admin/devices/${id}/edit` : null
  }
  const hrefFor = (slug: string): string | null => {
    const meta = slugMeta.get(slug)
    return meta?.brandSlug ? `/devices/${meta.brandSlug}/${slug}` : null
  }

  // 11a) Devices with real shortlist heat but no buy path.
  for (const row of deviceRows) {
    if (row.intentScore < 2 || row.buyLinkCount > 0) continue
    pushFix('high_interest_no_links', {
      slug: row.slug,
      name: row.name,
      interest: row.intentScore,
      detail: `intent score ${row.intentScore} (${row.compares} compares · ${row.saves} saves) on a page with 0 buy links`,
      href: hrefFor(row.slug),
      editHref: editHrefFor(row.slug),
    })
  }

  // 11b) Intent that never reaches a buy link (has links, has interest, no clicks).
  for (const row of deviceRows) {
    if (row.buyLinkCount === 0 || row.intentScore < 4 || row.clicks > 0) continue
    pushFix('conversion_leak', {
      slug: row.slug,
      name: row.name,
      interest: row.intentScore,
      detail: `intent score ${row.intentScore} with ${row.buyLinkCount} buy link(s) but 0 clicks — the box, not the traffic, is broken`,
      href: hrefFor(row.slug),
      editHref: editHrefFor(row.slug),
    })
  }

  // 11c) One-dimensional demand: saved but never compared / watched but never shortlisted.
  for (const row of deviceRows) {
    if (row.saves >= 3 && row.compares === 0) {
      pushFix('save_only', {
        slug: row.slug,
        name: row.name,
        interest: row.saves,
        detail: `${row.saves} saves but 0 compares — it is bookmarked and then abandoned`,
        href: hrefFor(row.slug),
        editHref: editHrefFor(row.slug),
      })
    }
    if (row.watches >= 3 && row.saves === 0 && row.compares === 0) {
      pushFix('watch_only', {
        slug: row.slug,
        name: row.name,
        interest: row.watches,
        detail: `${row.watches} video watches but 0 saves/compares — attention without a next step`,
        href: hrefFor(row.slug),
        editHref: editHrefFor(row.slug),
      })
    }
  }

  // 11d) Pairs whose runs cannot be healthy: a slug with no catalog row or no views.
  for (const { pair, runs } of pairRuns.values()) {
    if (runs < 2) continue
    const weak = pair.filter((slug) => !slugMeta.has(slug) || (viewsBySlug.get(slug) ?? 0) === 0)
    if (weak.length === 0) continue
    pushFix('compare_orphan', {
      slug: null,
      pair,
      name: pair.map(pairName).join(' vs '),
      interest: runs,
      detail: `${runs} comparison runs, but ${weak.join(', ')} has no catalog row or no views — the pair is half-dead`,
      href: `/compare?devices=${pair.join(',')}`,
      editHref: null,
    })
  }

  // 11e) Lopsided pairs: both sides live, but one side carries <15% of the intent.
  for (const { pair, runs } of pairRuns.values()) {
    if (runs < 3 || pair.length !== 2) continue
    if (pair.some((slug) => !slugMeta.has(slug))) continue
    const scores = pair.map((slug) => deviceRows.find((r) => r.slug === slug)?.intentScore ?? 0)
    const total = scores[0] + scores[1]
    if (total < 4) continue
    const smaller = Math.min(scores[0], scores[1])
    if (smaller / total < 0.15) {
      pushFix('lopsided_pair', {
        slug: null,
        pair,
        name: pair.map(pairName).join(' vs '),
        interest: total,
        detail: `${runs} runs but intent splits ${scores[0]}–${scores[1]} — the quieter side needs promotion inside the pair`,
        href: `/compare?devices=${pair.join(',')}`,
        editHref: null,
      })
    }
  }

  fixQueue.sort((a, b) => b.interest - a.interest || a.label.localeCompare(b.label))
  const interestAtStake = fixQueue.reduce((s, item) => s + item.interest, 0)

  // __CONSIDERATION_RETURN__

  // 12) Shape the return payload.
  const actionTotals: Array<{ action: IntentAction; label: string; events: number; sharePct: number; visitors: number; devices: number }> = (
    ['add_to_compare', 'save', 'watch', 'related_click'] as IntentAction[]
  ).map((action) => {
    const devices = new Set<string>()
    for (const [slug, counts] of deviceActions) if (counts[action] > 0) devices.add(slug)
    return {
      action,
      label: action === 'add_to_compare' ? 'Compare' : action === 'save' ? 'Save' : action === 'watch' ? 'Watch' : 'Related',
      events: actionCounts[action],
      sharePct: sharePct(actionCounts[action], totalEvents, 1),
      visitors: (actionFps.get(action) ?? new Set<string>()).size,
      devices: devices.size,
    }
  })

  const contentTypeLabels: Record<string, string> = { device: 'Devices', article: 'Articles', video: 'Videos', comparison: 'Comparisons' }
  const byContentType = Array.from(contentTypeCounts.entries())
    .map(([type, events]) => ({
      type,
      label: contentTypeLabels[type] ?? type.charAt(0).toUpperCase() + type.slice(1),
      events,
      sharePct: sharePct(events, totalEvents, 1),
    }))
    .sort((a, b) => b.events - a.events)

  const topActionEntry = [...actionTotals].sort((a, b) => b.events - a.events)[0]
  const tierRows: ConsiderationInsights['audience']['tiers'] = (['hot', 'warm', 'cold'] as QualificationTier[]).map((tier) => {
    const list = tier === 'hot' ? hotVisitors : tier === 'warm' ? warmVisitors : coldVisitors
    const labels: Record<QualificationTier, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold' }
    return {
      tier,
      label: labels[tier],
      visitors: list.length,
      sharePct: sharePct(list.length, visitors.length, 1),
      avgScore: list.length > 0 ? Math.round((list.reduce((s, v) => s + v.score, 0) / list.length) * 10) / 10 : 0,
    }
  })

  return {
    funnel: {
      stages: funnelStages,
      browsers: stageCounts[0],
      buyClickers: stageCounts[3],
      browserToBuyerPct: sharePct(stageCounts[3], stageCounts[0], 1),
    },
    mix: {
      totals: {
        events: totalEvents,
        saves: actionCounts.save,
        compares: actionCounts.add_to_compare,
        watches: actionCounts.watch,
        relatedClicks: actionCounts.related_click,
        activeVisitors: eventsByFp.size,
        signedInVisitors: signedInFps.size,
        comparePageViews,
        topAction: topActionEntry && topActionEntry.events > 0 ? topActionEntry.action : null,
      },
      byAction: actionTotals,
      byContentType,
      momentum,
      momentumTotal: momentum.reduce((s, m) => s + m.total, 0),
    },
    audience: {
      totals: {
        scored: visitors.length,
        hot: hotVisitors.length,
        warm: warmVisitors.length,
        cold: coldVisitors.length,
        hotSharePct: sharePct(hotVisitors.length, visitors.length, 1),
        warmSharePct: sharePct(warmVisitors.length, visitors.length, 1),
        avgScore,
        signedInSharePct: sharePct(signedInFps.size, visitors.length, 1),
      },
      tiers: tierRows,
      topVisitors: visitors.slice(0, 25),
      scoreHistogram,
    },
    demand: {
      topPairs,
      totalPairRuns,
      lopsidedPairs,
      deviceRows,
      consideredDevices,
      consideredSharePct: sharePct(consideredDevices, deviceRows.length, 1),
      topConsidered: deviceRows.filter((r) => r.intentScore > 0).slice(0, 10),
      intentLeaders: [...deviceRows].filter((r) => r.views >= 5).sort((a, b) => b.intentPerView - a.intentPerView).slice(0, 10),
      conversionLeaders: [...deviceRows].filter((r) => r.intentScore >= 3).sort((a, b) => b.intentToClick - a.intentToClick).slice(0, 10),
    },
    action: {
      fixQueue,
      interestAtStake,
    },
  }
}














