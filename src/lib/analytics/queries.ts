import { createClient } from '@supabase/supabase-js'
import { listIndexIds } from '@/lib/upstash/search'
import { isVectorConfigured } from '@/lib/upstash/vector'
import { fetchUpstashSearchTelemetry, type UpstashSearchTelemetry } from '@/lib/upstash/telemetry'

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
import {
  type TrustHealth,
  type ModerationIssue,
  MODERATION_ISSUE_META,
  trustGrade,
} from './community'
import {
  type MonetizationTier,
  type ReconState,
  type ChannelState,
  type RevenueIssue,
  MONETIZATION_ORDER,
  MONETIZATION_LABELS,
  monetizationTier,
  reconState,
  normalizeRetailerKey,
  revenueSeverity,
  rpm,
} from './revenue'
import {
  type QueryAnswerState,
  type QueryShape,
  type SearchIssue,
  ANSWER_STATE_LABELS,
  ANSWER_STATE_ORDER,
  QUERY_SHAPE_LABELS,
  QUERY_SHAPE_ORDER,
  SEARCH_ISSUE_META,
  answerStateFor,
  classifyQueryShape,
  diceSimilarity,
  normalizeQuery,
  searchSeverity,
} from './searchStory'
import {
  type AttributionClass,
  type TagIssue,
  type TagCompliance,
  type ChannelClass,
  type CampaignVerdict,
  type LandingKind,
  type CampaignIssue,
  ATTRIBUTION_ORDER,
  ATTRIBUTION_LABELS,
  CHANNEL_CLASS_ORDER,
  CHANNEL_CLASS_LABELS,
  TAG_COMPLIANCE_LABELS,
  TAG_ISSUE_META,
  VERDICT_LABELS,
  CAMPAIGN_ISSUE_META,
  LANDING_KIND_LABELS,
  attributionClassFor,
  campaignSeverity,
  campaignVerdict,
  classifyLandingPath,
  classifyMedium,
  clickRatePer1k,
  isTagged,
  isInternalReferrer,
  landingDepth,
  median,
  normalizeTag,
  tagComplianceFor,
  tagIssuesFor,
} from './campaigns'

export type {
  IntentAction,
  QualificationTier,
  FunnelStage,
  ConsiderationIssue,
} from './consideration'
export type { TrustHealth, ModerationIssue } from './community'
export type { MonetizationTier, ReconState, ChannelState, RevenueIssue } from './revenue'
export type { AttributionClass, TagIssue, TagCompliance, ChannelClass, CampaignVerdict, LandingKind, CampaignIssue } from './campaigns'
export { MODERATION_ISSUE_META } from './community'
export { REVENUE_ISSUE_META } from './revenue'
export { CAMPAIGN_ISSUE_META, TAG_ISSUE_META } from './campaigns'
export { INTENT_WEIGHTS, AFFILIATE_CLICK_WEIGHT, SIGNED_IN_BONUS, qualificationTier } from './consideration'

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
//
// Upstash has NO per-query analytics endpoint (verified: /analytics/top → 404),
// so this table is the single source of truth for WHAT was searched. Upstash's
// account API contributes HOW MANY queries executed + latency (see
// `fetchUpstashSearchTelemetry`), which reconciles against this log.
export async function getTopSearchQueries(
  limit: number = 20
): Promise<Array<{ query: string; count: number }>> {
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
  // Join on the normalised key (lowercase + collapsed whitespace): the click
  // stream records 'Amazon'/'Jumia' while the sheet keys are lowercase. The
  // literal-key drift is surfaced as a tax_mismatch row on the revenue tab —
  // but the proxy itself must never silently price real clicks at zero.
  const rateMap = new Map<string, number>()
  for (const r of rates ?? []) rateMap.set(normalizeRetailerKey(r.retailer), Number(r.rate))

  const byRetailer = Object.entries(clickCounts)
    .map(([retailer, count]) => {
      const rate = rateMap.get(normalizeRetailerKey(retailer)) ?? 0
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
      for (const r of rateRows ?? []) rates.set(normalizeRetailerKey(r.retailer), Number(r.rate))
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
      const retailer = normalizeRetailerKey(String(row.retailer ?? ''))
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
  'community-roster',
  'community-queue',
  'revenue-ledger',
  'revenue-queue',
  'search-demand',
  'search-backlog',
  'campaign-ledger',
  'campaign-queue',
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
      if (!inCommission) notes.push('no rate — proxy cannot price clicks')
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
















// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Community & Engagement intelligence
//
// Canvas anchors: `Manage Community Engagement` — ratings/comments/watchers
// as **trust assets** + `Manage Onsite Behavioural Analytics` — contributor
// behaviour, not just volume.
//
// One aggregator for the whole tab; pure-JS over existing tables
// (device_ratings · comments · rating_votes · device_watchers · devices ·
// page_views · affiliate_clicks) — no new instrumentation, no migration, no
// new cron. Same discipline as the Traffic/Content/Devices/Compare
// aggregators.

/** One device's social-proof ledger. */
export interface CommunityDeviceRow {
  slug: string
  name: string
  brandName: string
  status: string
  views: number
  clicks: number
  ratings: number
  comments: number
  /** Sum of helpful votes across the device's comments. */
  helpfulVotes: number
  avgRating: number | null
  /** New signals (ratings + comments) created inside the period. */
  recentSignals: number
  /** Latest signal of any age (ISO), null if the device has none. */
  lastSignalAt: string | null
  watchers: number
  health: TrustHealth
}

/** One community contributor (identified only by user id — admin-only view). */
export interface CommunityContributorRow {
  userId: string
  contributions: number
  ratings: number
  comments: number
  votesCast: number
  /** Helpful votes received across their comments. */
  helpfulReceived: number
  devices: number
  grade: 'advocate' | 'regular' | 'newcomer'
  lastContributionAt: string
}

/** One moderation queue row. */
export interface CommunityFixQueueItem {
  slug: string | null
  name: string
  issue: ModerationIssue
  label: string
  action: string
  detail: string
  /** Traffic or signal volume at stake — the queue's rank order. */
  stake: number
  severity: 'high' | 'medium' | 'low'
  href: string | null
  editHref: string | null
}

export interface CommunityInsights {
  /** A. Trust — the catalog-wide social-proof position. */
  trust: {
    totals: {
      publishedDevices: number
      coveredDevices: number
      coveragePct: number
      ratedDevices: number
      commentedDevices: number
      periodRatings: number
      periodComments: number
      lifetimeRatings: number
      avgRating: number | null
      /** 0–100 composite: rating quality (60) + coverage (25) + volume (15). */
      grade: number
    }
    healthMix: Array<{ health: TrustHealth; label: string; devices: number; sharePct: number }>
    silentDevices: number
  }
  /** B. Voice — what the community actually said this period. */
  voice: {
    ratingHistogram: Array<{ bucket: string; count: number; sharePct: number }>
    /** Σ ratings + comments per period bucket (weekly for 30/90d, daily 7d). */
    momentum: Array<{ bucket: string; ratings: number; comments: number; total: number }>
    bySurface: Array<{ surface: string; label: string; comments: number; sharePct: number }>
    helpfulLeaderboard: CommunityDeviceRow[]
    mostDiscussed: CommunityDeviceRow[]
  }
  /** C. People — who carries the community. */
  people: {
    totals: {
      contributors: number
      newContributors: number
      advocates: number
      avgPerContributor: number
      watchers: number
    }
    contributors: CommunityContributorRow[]
    gradeMix: Array<{ grade: string; label: string; contributors: number; sharePct: number }>
  }
  /** D. Action — the moderation / solicitation queue. */
  action: {
    fixQueue: CommunityFixQueueItem[]
    stake: number
  }
}

/**
 * Community & Engagement analytics — one aggregator for the whole tab.
 *
 * @param period '7d' | '30d' | '90d'
 */
export async function getCommunityInsights(period: string): Promise<CommunityInsights> {
  const since = sinceISO(period)
  const dayMs = 86400000
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const nowMs = Date.now()

  // 1) Load every plane in parallel — signals, votes, watchers, catalog, traffic.
  const [ratingsRes, commentsRes, votesRes, watchersRes, devicesRes] = await Promise.all([
    supabase.from('device_ratings').select('device_slug, rating, user_id, created_at').gte('created_at', since),
    supabase
      .from('comments')
      .select('content_type, content_slug, user_id, parent_id, body, helpful_count, reported, created_at')
      .gte('created_at', since),
    supabase.from('rating_votes').select('rating_id, user_id, created_at').gte('created_at', since),
    supabase.from('device_watchers').select('device_id, created_at'),
    supabase.from('devices').select('id, slug, name, status, brand:brands(slug, name)'),
  ])

  // __COMMUNITY_FN_2__

  // 2) Catalog map — every device, published or not (orphan-proof detection).
  const deviceById = new Map<number, { slug: string; name: string; brandName: string; status: string; editHref: string }>()
  const deviceBySlug = new Map<string, { id: number; name: string; brandName: string; status: string; editHref: string; href: string | null }>()
  for (const d of devicesRes.data ?? []) {
    const id = Number(d.id)
    const slug = String(d.slug ?? '')
    if (!slug) continue
    const brandRaw = d.brand as { slug?: string; name?: string } | Array<{ slug?: string; name?: string }> | null
    const brand = Array.isArray(brandRaw) ? brandRaw[0] : brandRaw
    const name = String(d.name ?? slug)
    const brandName = String(brand?.name ?? 'Unknown brand')
    const status = String(d.status ?? 'draft')
    deviceById.set(id, { slug, name, brandName, status, editHref: `/admin/devices/${id}/edit` })
    deviceBySlug.set(slug, {
      id,
      name,
      brandName,
      status,
      editHref: `/admin/devices/${id}/edit`,
      href: brand?.slug ? `/devices/${String(brand.slug)}/${slug}` : null,
    })
  }

  // 3) Ratings plane — period rows + lifetime averages + histogram + contributors.
  const ratingRows = (ratingsRes.data ?? []) as Array<{ device_slug: string; rating: number; user_id: string; created_at: string }>
  const { count: lifetimeRatings } = await supabase
    .from('device_ratings')
    .select('*', { count: 'exact', head: true })
  const ratingsBySlug = new Map<string, { count: number; sum: number; latest: number }>()
  const histogram = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]])
  const ratingsPerDay = new Map<string, number>()
  for (const row of ratingRows) {
    const slug = String(row.device_slug ?? '')
    const rating = Number(row.rating ?? 0)
    if (!slug || rating < 1 || rating > 5) continue
    const cur = ratingsBySlug.get(slug) ?? { count: 0, sum: 0, latest: 0 }
    cur.count++
    cur.sum += rating
    const t = new Date(String(row.created_at)).getTime()
    if (Number.isFinite(t)) cur.latest = Math.max(cur.latest, t)
    ratingsBySlug.set(slug, cur)
    histogram.set(rating, (histogram.get(rating) ?? 0) + 1)
    const day = new Date(String(row.created_at)).toISOString().split('T')[0]
    ratingsPerDay.set(day, (ratingsPerDay.get(day) ?? 0) + 1)
  }
  const avgRating = ratingRows.length > 0
    ? Math.round((ratingRows.reduce((s, r) => s + Number(r.rating ?? 0), 0) / ratingRows.length) * 10) / 10
    : null

  // 4) Comments plane — per slug, per surface, replies, reported, contributors.
  const commentRows = (commentsRes.data ?? []) as Array<{
    content_type: string
    content_slug: string
    user_id: string
    parent_id: number | null
    body: string
    helpful_count: number
    reported: boolean
    created_at: string
  }>
  const commentsBySlug = new Map<string, { count: number; helpful: number; latest: number; questions: number; reported: number }>()
  const commentsBySurface = new Map<string, number>()
  const commentsPerDay = new Map<string, number>()
  let reportedUnreviewed = 0
  for (const row of commentRows) {
    const slug = String(row.content_slug ?? '')
    if (!slug) continue
    const cur = commentsBySlug.get(slug) ?? { count: 0, helpful: 0, latest: 0, questions: 0, reported: 0 }
    cur.count++
    cur.helpful += Number(row.helpful_count ?? 0)
    if (row.reported) {
      cur.reported++
      reportedUnreviewed++
    }
    const body = String(row.body ?? '')
    if (body.includes('?')) cur.questions++
    const t = new Date(String(row.created_at)).getTime()
    if (Number.isFinite(t)) cur.latest = Math.max(cur.latest, t)
    commentsBySlug.set(slug, cur)
    commentsBySurface.set(String(row.content_type ?? 'device'), (commentsBySurface.get(String(row.content_type ?? 'device')) ?? 0) + 1)
    const day = new Date(String(row.created_at)).toISOString().split('T')[0]
    commentsPerDay.set(day, (commentsPerDay.get(day) ?? 0) + 1)
  }

  // __COMMUNITY_FN_3__

  // 5) Votes + watchers planes — contribution effort and owned-audience demand.
  const voteRows = (votesRes.data ?? []) as Array<{ rating_id: number; user_id: string; created_at: string }>
  const watchersByDevice = new Map<number, { count: number; latest: number }>()
  for (const row of watchersRes.data ?? []) {
    const id = Number(row.device_id ?? 0)
    if (!id) continue
    const cur = watchersByDevice.get(id) ?? { count: 0, latest: 0 }
    cur.count++
    const t = new Date(String(row.created_at ?? '')).getTime()
    if (Number.isFinite(t)) cur.latest = Math.max(cur.latest, t)
    watchersByDevice.set(id, cur)
  }

  // 6) Traffic for the period (devices only) — demand context for the health model.
  const { data: deviceViewRows } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)
    .like('path', '/devices/%')
  const viewsBySlug = new Map<string, number>()
  for (const row of deviceViewRows ?? []) {
    const parts = String(row.path ?? '').replace('/devices/', '').split('/').filter(Boolean)
    const slug = parts[1] ?? parts[0] ?? ''
    if (slug) viewsBySlug.set(slug, (viewsBySlug.get(slug) ?? 0) + 1)
  }

  // 7) Per-device ledger + trust health classification.
  const deviceRows: CommunityDeviceRow[] = []
  const healthCounts = new Map<TrustHealth, number>()
  let silentDevices = 0
  const allSlugs = new Set<string>([...deviceBySlug.keys(), ...ratingsBySlug.keys(), ...commentsBySlug.keys()])
  for (const slug of allSlugs) {
    const meta = deviceBySlug.get(slug)
    const ratings = ratingsBySlug.get(slug)
    const comments = commentsBySlug.get(slug)
    const ratingCount = ratings?.count ?? 0
    const commentCount = comments?.count ?? 0
    const avg = ratingCount > 0 ? Math.round((ratings!.sum / ratingCount) * 10) / 10 : null
    const latest = Math.max(ratings?.latest ?? 0, comments?.latest ?? 0)
    const recentSignals = ratingCount + commentCount
    const views = viewsBySlug.get(slug) ?? 0
    const hasProofEver = ratingCount + commentCount > 0

    // Health reads the whole ledger, not just the period:
    //   healthy — 2+ signals and the newest falls inside the period
    //   thin    — exactly 1 signal ever
    //   stale   — proof exists but the newest predates the period
    //   silent  — no signal at all
    let health: TrustHealth
    if (!hasProofEver) {
      health = 'silent'
      silentDevices++
    } else if (recentSignals === 1) {
      health = 'thin'
    } else if (latest >= new Date(since).getTime()) {
      health = 'healthy'
    } else {
      health = 'stale'
    }

    healthCounts.set(health, (healthCounts.get(health) ?? 0) + 1)
    deviceRows.push({
      slug,
      name: meta?.name ?? slug.replace(/[-_]/g, ' '),
      brandName: meta?.brandName ?? 'Unknown brand',
      status: meta?.status ?? 'unknown',
      views,
      clicks: 0,
      ratings: ratingCount,
      comments: commentCount,
      helpfulVotes: comments?.helpful ?? 0,
      avgRating: avg,
      recentSignals,
      lastSignalAt: latest ? new Date(latest).toISOString() : null,
      watchers: meta ? (watchersByDevice.get(meta.id)?.count ?? 0) : 0,
      health,
    })
  }
  deviceRows.sort((a, b) => b.recentSignals - a.recentSignals || b.views - a.views)

  // __COMMUNITY_FN_4__

  // 8) Contributors — effort (contributions) + value (helpful votes received).
  const contributorMap = new Map<string, { ratings: number; comments: number; votes: number; devices: Set<string>; latest: number }>()
  const trackContributor = (userId: string, kind: 'rating' | 'comment' | 'vote', slug: string | null, at: number) => {
    if (!userId) return
    const cur = contributorMap.get(userId) ?? { ratings: 0, comments: 0, votes: 0, devices: new Set<string>(), latest: 0 }
    if (kind === 'rating') cur.ratings++
    else if (kind === 'comment') cur.comments++
    else cur.votes++
    if (slug) cur.devices.add(slug)
    if (Number.isFinite(at) && at > 0) cur.latest = Math.max(cur.latest, at)
    contributorMap.set(userId, cur)
  }
  for (const row of ratingRows) {
    trackContributor(String(row.user_id ?? ''), 'rating', String(row.device_slug ?? ''), new Date(String(row.created_at)).getTime())
  }
  for (const row of commentRows) {
    trackContributor(String(row.user_id ?? ''), 'comment', String(row.content_slug ?? ''), new Date(String(row.created_at)).getTime())
  }
  for (const row of voteRows) {
    trackContributor(String(row.user_id ?? ''), 'vote', null, new Date(String(row.created_at)).getTime())
  }

  const contributors: CommunityContributorRow[] = []
  for (const [userId, c] of contributorMap) {
    const contributionCount = c.ratings + c.comments
    if (contributionCount === 0) continue // pure voters still count toward votes, not the roster
    const grade = contributionCount >= 5 ? 'advocate' : contributionCount >= 2 ? 'regular' : 'newcomer'
    contributors.push({
      userId,
      contributions: contributionCount,
      ratings: c.ratings,
      comments: c.comments,
      votesCast: c.votes,
      helpfulReceived: 0,
      devices: c.devices.size,
      grade,
      lastContributionAt: c.latest ? new Date(c.latest).toISOString() : '',
    })
  }
  // Helpful votes received → map back via the comments the user wrote.
  const helpfulByUser = new Map<string, number>()
  for (const row of commentRows) {
    helpfulByUser.set(String(row.user_id ?? ''), (helpfulByUser.get(String(row.user_id ?? '')) ?? 0) + Number(row.helpful_count ?? 0))
  }
  for (const c of contributors) c.helpfulReceived = helpfulByUser.get(c.userId) ?? 0
  contributors.sort((a, b) => b.helpfulReceived - a.helpfulReceived || b.contributions - a.contributions)

  // __COMMUNITY_FN_5__

  // 9) Voice momentum — weekly buckets (daily on 7d), ratings vs comments.
  const bucketSize = days === 7 ? 1 : 7
  const momentum: CommunityInsights['voice']['momentum'] = []
  for (let start = nowMs - (days - 1) * dayMs; start <= nowMs; start += bucketSize * dayMs) {
    const bucketStart = new Date(start)
    const isoStart = bucketStart.toISOString().split('T')[0]
    const isoEnd = new Date(start + (bucketSize - 1) * dayMs).toISOString().split('T')[0]
    let r = 0
    let c = 0
    for (const [day, n] of ratingsPerDay) if (day >= isoStart && day <= isoEnd) r += n
    for (const [day, n] of commentsPerDay) if (day >= isoStart && day <= isoEnd) c += n
    momentum.push({
      bucket: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`,
      ratings: r,
      comments: c,
      total: r + c,
    })
  }

  // 10) Trust totals + health mix over published devices.
  const publishedRows = deviceRows.filter((row) => {
    const meta = deviceBySlug.get(row.slug)
    return meta ? meta.status === 'published' : false
  })
  const coveredRows = publishedRows.filter((row) => row.ratings + row.comments > 0)
  const totalComments = commentRows.length
  const totalRatings = ratingRows.length

  const healthMix = (['healthy', 'thin', 'stale', 'silent'] as TrustHealth[]).map((health) => {
    const labels: Record<TrustHealth, string> = { healthy: 'Healthy', thin: 'Thin', stale: 'Stale', silent: 'Silent' }
    const devices = health === 'silent' ? silentDevices : (healthCounts.get(health) ?? 0)
    return { health, label: labels[health], devices, sharePct: sharePct(devices, deviceRows.length, 1) }
  })

  // __COMMUNITY_FN_6__

  // 11) Moderation / solicitation fix queue — ranked by what's at stake.
  const fixQueue: CommunityFixQueueItem[] = []
  const pushFix = (
    issue: ModerationIssue,
    opts: { slug: string | null; name: string; stake: number; detail: string; href: string | null; editHref: string | null },
  ) => {
    fixQueue.push({
      slug: opts.slug,
      name: opts.name,
      issue,
      label: MODERATION_ISSUE_META[issue].label,
      action: MODERATION_ISSUE_META[issue].action,
      detail: opts.detail,
      stake: opts.stake,
      severity: opts.stake >= 100 ? 'high' : opts.stake >= 20 ? 'medium' : 'low',
      href: opts.href,
      editHref: opts.editHref,
    })
  }

  for (const row of publishedRows) {
    const meta = deviceBySlug.get(row.slug)
    // 11a) Traffic without proof — the biggest solicitation opportunity.
    if (row.views >= 20 && row.ratings + row.comments === 0) {
      pushFix('high_demand_no_proof', {
        slug: row.slug,
        name: row.name,
        stake: row.views,
        detail: `${row.views.toLocaleString()} views this period and zero ratings or comments — the page sells without proof`,
        href: meta?.href ?? null,
        editHref: meta?.editHref ?? null,
      })
    }
    // 11b) Single voice — one reviewer is an outlier.
    if (row.ratings + row.comments === 1 && row.views >= 5) {
      pushFix('single_voice', {
        slug: row.slug,
        name: row.name,
        stake: row.views,
        detail: `one ${row.ratings === 1 ? 'rating' : 'comment'} carries all the proof — ${row.views.toLocaleString()} views see a single opinion`,
        href: meta?.href ?? null,
        editHref: meta?.editHref ?? null,
      })
    }
    // 11c) Questions asked in comments are the most direct conversion aid.
    const slugMeta = commentsBySlug.get(row.slug)
    if (slugMeta && slugMeta.questions > 0) {
      pushFix('unanswered_question', {
        slug: row.slug,
        name: row.name,
        stake: slugMeta.questions * 10 + row.views / 10,
        detail: `${slugMeta.questions} question-style comment(s) on ${row.name} — every one is an objection someone voiced publicly`,
        href: meta?.href ?? null,
        editHref: meta?.editHref ?? null,
      })
    }
  }

  // 11d) Proof on dead slugs — ratings/comments point at slugs with no published row.
  for (const slug of new Set([...ratingsBySlug.keys(), ...commentsBySlug.keys()])) {
    const meta = deviceBySlug.get(slug)
    if (meta && meta.status === 'published') continue
    const signals = (ratingsBySlug.get(slug)?.count ?? 0) + (commentsBySlug.get(slug)?.count ?? 0)
    pushFix('orphan_proof', {
      slug,
      name: meta?.name ?? slug.replace(/[-_]/g, ' '),
      stake: signals * 5,
      detail: meta
        ? `${signals} signal(s) exist but the device is ${meta.status} — the proof is invisible to visitors`
        : `${signals} signal(s) point at an unknown slug — ratings/comments reference a device that no longer exists`,
      href: meta?.href ?? null,
      editHref: meta?.editHref ?? null,
    })
  }

  // 11e) Reported comments awaiting review (one row, catalog-level).
  if (reportedUnreviewed > 0) {
    pushFix('reported_unreviewed', {
      slug: null,
      name: 'Comment moderation',
      stake: reportedUnreviewed * 20,
      detail: `${reportedUnreviewed} comment(s) reported this period and not yet reviewed`,
      href: null,
      editHref: null,
    })
  }

  fixQueue.sort((a, b) => b.stake - a.stake || a.label.localeCompare(b.label))
  const totalStake = fixQueue.reduce((s, item) => s + item.stake, 0)

  // __COMMUNITY_RETURN__

  // 12) Shape the return payload.
  const gradeCounts = new Map<string, number>()
  for (const c of contributors) gradeCounts.set(c.grade, (gradeCounts.get(c.grade) ?? 0) + 1)
  const gradeLabels: Record<string, string> = { advocate: 'Advocates (5+)', regular: 'Regulars (2–4)', newcomer: 'Newcomers (1)' }

  const surfaceLabels: Record<string, string> = { device: 'Devices', article: 'Articles', video: 'Videos' }
  const bySurface = Array.from(commentsBySurface.entries())
    .map(([surface, count]) => ({
      surface,
      label: surfaceLabels[surface] ?? surface,
      comments: count,
      sharePct: sharePct(count, totalComments, 1),
    }))
    .sort((a, b) => b.comments - a.comments)

  const helpfulLeaderboard = deviceRows
    .filter((row) => row.helpfulVotes > 0)
    .sort((a, b) => b.helpfulVotes - a.helpfulVotes)
    .slice(0, 10)

  const mostDiscussed = deviceRows
    .filter((row) => row.comments > 0)
    .sort((a, b) => b.comments - a.comments)
    .slice(0, 10)

  const histogramTotal = totalRatings
  const ratingHistogram = ([5, 4, 3, 2, 1] as number[]).map((bucket) => ({
    bucket: `${bucket}★`,
    count: histogram.get(bucket) ?? 0,
    sharePct: sharePct(histogram.get(bucket) ?? 0, histogramTotal, 1),
  }))

  return {
    trust: {
      totals: {
        publishedDevices: publishedRows.length,
        coveredDevices: coveredRows.length,
        coveragePct: sharePct(coveredRows.length, publishedRows.length, 1),
        ratedDevices: ratingsBySlug.size,
        commentedDevices: commentsBySlug.size,
        periodRatings: totalRatings,
        periodComments: totalComments,
        lifetimeRatings: lifetimeRatings ?? 0,
        avgRating,
        grade: trustGrade(avgRating, sharePct(coveredRows.length, publishedRows.length, 1), totalRatings + totalComments),
      },
      healthMix,
      silentDevices,
    },
    voice: {
      ratingHistogram,
      momentum,
      bySurface,
      helpfulLeaderboard,
      mostDiscussed,
    },
    people: {
      totals: {
        contributors: contributors.length,
        newContributors: contributors.filter((c) => c.grade === 'newcomer').length,
        advocates: contributors.filter((c) => c.grade === 'advocate').length,
        avgPerContributor: contributors.length > 0 ? Math.round((contributors.reduce((s, c) => s + c.contributions, 0) / contributors.length) * 10) / 10 : 0,
        watchers: watchersByDevice.size,
      },
      contributors: contributors.slice(0, 25),
      gradeMix: (['advocate', 'regular', 'newcomer'] as const).map((grade) => ({
        grade,
        label: gradeLabels[grade],
        contributors: gradeCounts.get(grade) ?? 0,
        sharePct: sharePct(gradeCounts.get(grade) ?? 0, contributors.length, 1),
      })),
    },
    action: {
      fixQueue,
      stake: totalStake,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 11 — Affiliate & Revenue: the money story
// ═══════════════════════════════════════════════════════════════════════════
//
// One aggregator for the whole tab, same discipline as Devices/Compare/
// Community: A Money (proxy vs actuals) → B Flow (click momentum + device
// tiers) → C Channels (retailer ledger + earners) → D Action (revenue queue).
//
// The story is NOT "how many clicks" (that's the old table) — it is:
//   1. every click is priced (proxy = clicks × rate via the normalised join),
//   2. every retailer is a channel with a health state,
//   3. the proxy must reconcile with real imported earnings (±10% reads honest),
//   4. the queue names the leak: unpriced clicks, dead links, unsold traffic.

export interface RevenueChannelRow {
  retailer: string
  /** The retailer key as recorded in affiliate_clicks (raw casing). */
  rawKey: string
  clicks: number
  rate: number
  proxy: number
  state: ChannelState
  sharePct: number
}

export interface RevenueDeviceRow {
  slug: string
  name: string
  brandName: string
  views: number
  clicks: number
  ctr: number
  proxy: number
  tier: MonetizationTier
  status: string
}

export interface RevenueMomentumBucket {
  bucket: string
  total: number
  /** KES proxy attributed per bucket — the money line under the clicks. */
  proxy: number
  byRetailer: Record<string, number>
}

export interface RevenueFixQueueItem {
  issue: RevenueIssue
  label: string
  action: string
  detail: string
  /** KES proxy (channel rows) or views (traffic rows) at stake. */
  stake: number
  severity: 'high' | 'medium' | 'low'
  slug: string | null
  name: string
  href: string | null
  editHref: string | null
}

export interface RevenueInsights {
  period: string
  money: {
    totals: {
      clicks: number
      deviceViews: number
      ctr: number
      proxy: number
      actual: number
      variance: number
      rpm: number
      pricedClicks: number
      unpricedClicks: number
    }
    recon: { state: ReconState; label: string; variancePct: number }
    /** Proxy KES per bucket, paired with actuals by import day. */
    momentum: Array<{ bucket: string; proxy: number; actual: number }>
  }
  flow: {
    momentum: RevenueMomentumBucket[]
    tiers: Array<{ tier: MonetizationTier; label: string; devices: number; sharePct: number; views: number; proxy: number }>
    deviceRows: RevenueDeviceRow[]
  }
  channels: {
    ledger: RevenueChannelRow[]
    idleRates: string[]
  }
  action: {
    fixQueue: RevenueFixQueueItem[]
    stakeTotal: number
  }
}

export async function getRevenueInsights(period: string): Promise<RevenueInsights> {
  const since = sinceISO(period)
  const dayMs = 86400000
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const nowMs = Date.now()

  const [clickRes, earningsRes, ratesRes, deviceRes, linkRes] = await Promise.all([
    supabase
      .from('affiliate_clicks')
      .select('device_slug, retailer, created_at')
      .gte('created_at', since),
    supabase
      .from('affiliate_earnings')
      .select('retailer, period_start, period_end, commission_amount, status, source, imported_at')
      .gte('imported_at', since),
    supabase.from('affiliate_commission_rates').select('retailer, rate'),
    supabase
      .from('devices')
      .select('id, slug, name, status, buy_links, brand:brands(slug, name)'),
    supabase
      .from('link_health_checks')
      .select('device_slug, retailer, url, ok, checked_at')
      .gte('checked_at', since),
  ])

  // ── Catalog map: name + buy-link inventory per slug (drives device rows and
  // the no_clicks queue rows).
  const slugMeta = new Map<string, { name: string; brandName: string; brandSlug: string; status: string; buyLinkCount: number }>()
  for (const d of deviceRes.data ?? []) {
    const slug = String(d.slug ?? '')
    if (!slug) continue
    const brandRaw = d.brand as { slug?: string; name?: string } | Array<{ slug?: string; name?: string }> | null
    const brand = Array.isArray(brandRaw) ? brandRaw[0] : brandRaw
    const links = Array.isArray(d.buy_links)
      ? (d.buy_links as Array<Record<string, unknown>>).filter((l) => String(l?.url ?? '').startsWith('http'))
      : []
    slugMeta.set(slug, {
      name: String(d.name ?? slug),
      brandName: String(brand?.name ?? 'Unknown brand'),
      brandSlug: String(brand?.slug ?? ''),
      status: String(d.status ?? 'draft'),
      buyLinkCount: links.length,
    })
  }

  // ── Rate sheet, keyed by normalised key; raw keys kept for the taxonomy check.
  const rateByNormKey = new Map<string, number>()
  const rawRateKeys = new Set<string>()
  for (const r of ratesRes.data ?? []) {
    const key = String(r.retailer ?? '')
    if (!key) continue
    rawRateKeys.add(key)
    rateByNormKey.set(normalizeRetailerKey(key), Number(r.rate ?? 0))
  }

  // ── Clicks: per retailer (raw key), per device, per day.
  const clicksByRawRetailer = new Map<string, number>()
  const clicksByDevice = new Map<string, number>()
  const clicksByDay = new Map<string, number>()
  let totalClicks = 0
  for (const row of clickRes.data ?? []) {
    const retailer = String(row.retailer ?? 'unknown')
    const slug = String(row.device_slug ?? '')
    const day = String(row.created_at ?? '').slice(0, 10)
    totalClicks++
    clicksByRawRetailer.set(retailer, (clicksByRawRetailer.get(retailer) ?? 0) + 1)
    if (slug) clicksByDevice.set(slug, (clicksByDevice.get(slug) ?? 0) + 1)
    if (day) clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1)
  }

  // ── Device-page views (CTR denominator + RPM + tier classification).
  const { data: deviceViewRows } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', since)
    .like('path', '/devices/%')
  const viewsByDevice = new Map<string, number>()
  for (const row of deviceViewRows ?? []) {
    const parts = String(row.path ?? '').replace('/devices/', '').split('/').filter(Boolean)
    const slug = parts[1] ?? parts[0] ?? ''
    if (slug) viewsByDevice.set(slug, (viewsByDevice.get(slug) ?? 0) + 1)
  }
  const deviceViews = Array.from(viewsByDevice.values()).reduce((s, v) => s + v, 0)

  // Blended mean rate — used to estimate per-device proxy when the click's own
  // retailer rate cannot be attributed (clicks carry no per-click rate).
  const pricedClicksBase = Array.from(clicksByRawRetailer.entries()).reduce((s, [k, c]) => s + c * (rateByNormKey.get(normalizeRetailerKey(k)) ?? 0), 0)
  const blendedRate = totalClicks > 0 ? pricedClicksBase / totalClicks : 0

  // ── Channel ledger: one row per raw retailer key seen in clicks, plus idle
  // rates (configured but clickless). States: priced / tax_mismatch / unpriced.
  const ledgerUnsorted: RevenueChannelRow[] = []
  let pricedClicks = 0
  let unpricedClicks = 0
  let proxyTotal = 0
  for (const [rawKey, clicks] of clicksByRawRetailer) {
    const norm = normalizeRetailerKey(rawKey)
    const hasLiteralKey = rawRateKeys.has(rawKey)
    const rate = rateByNormKey.get(norm) ?? 0
    const proxy = Math.round(clicks * rate * 100) / 100
    proxyTotal += proxy
    // Mismatch = a normalised rate exists but the recorded key is not literally
    // on the sheet (casing/spacing drift).
    const state: ChannelState = hasLiteralKey ? 'priced' : rate > 0 ? 'tax_mismatch' : 'unpriced'
    if (rate > 0) pricedClicks += clicks
    else unpricedClicks += clicks
    ledgerUnsorted.push({ retailer: rawKey, rawKey, clicks, rate, proxy, state, sharePct: 0 })
  }
  const idleRates: string[] = []
  const seenNormClickKeys = new Set(Array.from(clicksByRawRetailer.keys()).map(normalizeRetailerKey))
  for (const key of rawRateKeys) {
    if (!seenNormClickKeys.has(normalizeRetailerKey(key))) idleRates.push(key)
  }
  for (const row of ledgerUnsorted) row.sharePct = totalClicks > 0 ? sharePct(row.clicks, totalClicks, 1) : 0
  const ledger = ledgerUnsorted.sort((a, b) => b.clicks - a.clicks)

  // ── Momentum: proxy per bucket (daily at 7d, weekly otherwise) from the
  // click stream; actuals booked by import day where statements exist.
  const bucketSize = days === 7 ? 1 : 7
  const actualByDay = new Map<string, number>()
  let actualTotal = 0
  for (const row of earningsRes.data ?? []) {
    const amount = Number(row.commission_amount ?? 0)
    actualTotal += amount
    const day = String(row.imported_at ?? '').slice(0, 10)
    if (day) actualByDay.set(day, (actualByDay.get(day) ?? 0) + amount)
  }
  actualTotal = Math.round(actualTotal * 100) / 100

  const momentum: RevenueMomentumBucket[] = []
  const momentumSimple: Array<{ bucket: string; proxy: number; actual: number }> = []
  for (let start = nowMs - (days - 1) * dayMs; start <= nowMs; start += bucketSize * dayMs) {
    const bucketStart = new Date(start)
    const isoStart = bucketStart.toISOString().slice(0, 10)
    const isoEnd = new Date(start + (bucketSize - 1) * dayMs).toISOString().slice(0, 10)
    const row: RevenueMomentumBucket = {
      bucket: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`,
      total: 0,
      proxy: 0,
      byRetailer: {},
    }
    let actualSum = 0
    for (const [day, count] of clicksByDay) {
      if (day >= isoStart && day <= isoEnd) {
        row.total += count
        // Attribute the bucket's clicks per retailer proportionally to the
        // period's retailer mix (cheap, honest enough at this scale).
        for (const [retailer, rc] of clicksByRawRetailer) {
          row.byRetailer[retailer] = (row.byRetailer[retailer] ?? 0) + Math.round((count * rc) / totalClicks)
        }
      }
    }
    for (const [retailer, rc] of Object.entries(row.byRetailer)) {
      row.proxy += rc * (rateByNormKey.get(normalizeRetailerKey(retailer)) ?? 0)
    }
    row.proxy = Math.round(row.proxy * 100) / 100
    momentum.push(row)
    for (const [day, amount] of actualByDay) {
      if (day >= isoStart && day <= isoEnd) actualSum += amount
    }
    momentumSimple.push({ bucket: row.bucket, proxy: row.proxy, actual: Math.round(actualSum * 100) / 100 })
  }

  // ── Device rows: every slug with views or clicks in the period, tiered by CTR.
  const deviceSlugs = new Set<string>([...clicksByDevice.keys(), ...viewsByDevice.keys()])
  const tierCounts = new Map<MonetizationTier, { devices: number; views: number; proxy: number }>()
  for (const t of MONETIZATION_ORDER) tierCounts.set(t, { devices: 0, views: 0, proxy: 0 })
  const deviceRows: RevenueDeviceRow[] = []
  for (const slug of deviceSlugs) {
    const views = viewsByDevice.get(slug) ?? 0
    const clicks = clicksByDevice.get(slug) ?? 0
    const ctr = views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0
    const meta = slugMeta.get(slug)
    const proxy = Math.round(clicks * blendedRate * 100) / 100
    const tier = monetizationTier(ctr, views, clicks)
    const bucket = tierCounts.get(tier)
    if (bucket) {
      bucket.devices++
      bucket.views += views
      bucket.proxy += proxy
    }
    deviceRows.push({
      slug,
      name: meta?.name ?? slug.replace(/[-_]/g, ' '),
      brandName: meta?.brandName ?? 'Unknown brand',
      views,
      clicks,
      ctr,
      proxy,
      tier,
      status: meta?.status ?? 'unknown',
    })
  }
  deviceRows.sort((a, b) => b.proxy - a.proxy || b.clicks - a.clicks || b.views - a.views)

  const tiers = MONETIZATION_ORDER.map((tier) => {
    const b = tierCounts.get(tier) ?? { devices: 0, views: 0, proxy: 0 }
    return {
      tier,
      label: MONETIZATION_LABELS[tier],
      devices: b.devices,
      sharePct: deviceSlugs.size > 0 ? sharePct(b.devices, deviceSlugs.size, 1) : 0,
      views: b.views,
      proxy: Math.round(b.proxy * 100) / 100,
    }
  })

  // ── Reconciliation (state from the shared vocab; ±10% reads honest).
  const variance = Math.round((proxyTotal - actualTotal) * 100) / 100
  const state = reconState(proxyTotal, actualTotal)
  const recon = {
    state,
    label: state,
    variancePct: proxyTotal > 0 ? Math.round((variance / proxyTotal) * 10000) / 100 : 0,
  }
  const ctrTotal = deviceViews > 0 ? Math.round((totalClicks / deviceViews) * 10000) / 100 : 0

  // ── Fix queue: name the leak, rank by stake (KES proxy or views).
  const fixQueue: RevenueFixQueueItem[] = []
  const pushIssue = (item: RevenueFixQueueItem) => {
    item.severity = revenueSeverity(item.stake)
    fixQueue.push(item)
  }
  const deviceHref = (slug: string) => {
    const meta = slugMeta.get(slug)
    return meta ? `/devices/${meta.brandSlug || 'unknown'}/${slug}` : null
  }

  // 1) Dead links — a dead link discards the click the page just earned.
  for (const row of linkRes.data ?? []) {
    if (row.ok) continue
    const slug = String(row.device_slug ?? '')
    const views = viewsByDevice.get(slug) ?? 0
    const meta = slugMeta.get(slug)
    pushIssue({
      issue: 'dead_link',
      label: 'Dead buy link',
      action: 'Replace the flagged URL — a dead link discards the click the page just earned.',
      detail: `${row.retailer} link on ${meta?.name ?? slug} failed its last health check.`,
      stake: Math.max(views, 1),
      severity: 'low',
      slug: slug || null,
      name: meta?.name ?? slug,
      href: slug ? deviceHref(slug) : null,
      editHref: slug ? `/admin/devices?search=${encodeURIComponent(slug)}` : null,
    })
  }

  // 2) Taxonomy mismatches + unpriced channels — clicks priced only via the
  // normalised fallback (any literal-key join downstream still drops them).
  for (const ch of ledger) {
    if (ch.state === 'priced' || ch.state === 'idle') continue
    const isMismatch = ch.state === 'tax_mismatch'
    pushIssue({
      issue: isMismatch ? 'tax_mismatch' : 'unpriced_clicks',
      label: isMismatch ? 'Rate key mismatch' : 'Unpriced clicks',
      action: isMismatch
        ? 'Normalise the recorded retailer name to the rate-sheet key — the proxy prices these clicks at zero today.'
        : 'Add a commission rate for this retailer — every click it receives is invisible to the proxy.',
      detail: `${ch.clicks} click${ch.clicks === 1 ? '' : 's'} recorded as "${ch.rawKey}" with no literally-matching rate-sheet key${isMismatch ? ' (priced only via the normalised fallback)' : ''}.`,
      stake: ch.clicks,
      severity: 'low',
      slug: null,
      name: ch.rawKey,
      href: null,
      editHref: '/admin/affiliate',
    })
  }

  // 3) Per-device flow problems, ranked by views at risk.
  for (const row of deviceRows) {
    const buyLinks = slugMeta.get(row.slug)?.buyLinkCount ?? 0
    if (row.tier === 'dormant' && row.views > 0 && row.status === 'published') {
      pushIssue({
        issue: 'no_clicks',
        label: 'Traffic without clicks',
        action: 'Check buy-box placement and link count on this device — views are arriving and leaving without a click.',
        detail: `${row.views.toLocaleString()} views, zero clicks this period${buyLinks === 0 ? ' · no live buy links configured' : ''}.`,
        stake: row.views,
        severity: 'low',
        slug: row.slug,
        name: row.name,
        href: deviceHref(row.slug),
        editHref: `/admin/devices?search=${encodeURIComponent(row.slug)}`,
      })
    } else if (row.tier === 'teaser' && row.views >= 20) {
      pushIssue({
        issue: 'low_ctr',
        label: 'Weak CTR',
        action: 'Move the buy box higher or swap the lead retailer — the page earns attention but not intent.',
        detail: `${row.clicks} clicks from ${row.views.toLocaleString()} views (${row.ctr}% CTR).`,
        stake: row.views,
        severity: 'low',
        slug: row.slug,
        name: row.name,
        href: deviceHref(row.slug),
        editHref: `/admin/devices?search=${encodeURIComponent(row.slug)}`,
      })
    }
  }

  // 4) Blind reconciliation — actuals missing while the proxy is real.
  if (state === 'blind' && proxyTotal > 0) {
    pushIssue({
      issue: 'unimported_actuals',
      label: 'Actuals missing',
      action: 'Import the network statement — proxy without actuals cannot be reconciled.',
      detail: `The proxy shows KES ${proxyTotal.toLocaleString()} this period but no earnings ledger rows were imported.`,
      stake: Math.round(proxyTotal),
      severity: revenueSeverity(Math.round(proxyTotal)),
      slug: null,
      name: 'Earnings ledger',
      href: null,
      editHref: '/admin/analytics?tab=affiliate',
    })
  }

  fixQueue.sort((a, b) => b.stake - a.stake)

  return {
    period,
    money: {
      totals: {
        clicks: totalClicks,
        deviceViews,
        ctr: ctrTotal,
        proxy: Math.round(proxyTotal * 100) / 100,
        actual: actualTotal,
        variance,
        rpm: rpm(proxyTotal, deviceViews),
        pricedClicks,
        unpricedClicks,
      },
      recon,
      momentum: momentumSimple,
    },
    flow: { momentum, tiers, deviceRows },
    channels: { ledger, idleRates },
    action: {
      fixQueue: fixQueue.slice(0, 20),

      stakeTotal: Math.round(fixQueue.reduce((s, i) => s + i.stake, 0) * 100) / 100,
    },
  }
}
// ═══════════════════════════════════════════════════════════════════════════
// Phase 12 — Search & Discovery: demand vs supply
// ═══════════════════════════════════════════════════════════════════════════
//
// One aggregator for the whole tab, same discipline as Devices/Compare/
// Community/Revenue: A Demand (what is typed) → B Supply (can the catalog
// answer it) → C Habit + index health (is search working at all) → D Action
// (the ranked backlog with the fix attached).
//
// The story is NOT "how many searches" (that was the old two-table tab) — it is:
//   1. every query carries an answer state (answered · thin · zero),
//   2. every query carries an intent shape (brand · model · comparison · spec ·
//      price · generic) so the backlog reads as a content brief,
//   3. zero-result queries are matched back to the catalog to catch near misses
//      (a synonym/slug fix, not a new article),
//   4. instrumentation health is on the tab itself: which search layers are live
//      and whether published pages are actually in the index.

export interface SearchNearMiss {
  id: string
  title: string
  url: string
  kind: 'device' | 'article' | 'video'
  similarity: number
}

export interface SearchQueryRow {
  query: string
  searches: number
  avgResults: number
  zeroResults: number
  state: QueryAnswerState
  shape: QueryShape
  sharePct: number
  lastSeen: string
  nearMiss: SearchNearMiss | null
  /** Rows logged with a result count — false means pre-instrumentation legacy rows. */
  recorded: boolean
  /** Searches in this query whose result count was actually captured. */
  recordedSearches: number
}

export interface SearchFixQueueItem {
  issue: SearchIssue
  label: string
  query: string
  searches: number
  zeroSharePct: number
  severity: 'high' | 'medium' | 'low'
  stake: number
  detail: string
  action: string
  /** What the visitor saw — the live search page for this query. */
  href: string
  /** Where the fix lands (device editor / article creator), when applicable. */
  editHref: string | null
}

export interface SearchInsights {
  totals: {
    searches: number
    /** Searches carrying a recorded result count — the denominator for every rate. */
    recordedSearches: number
    /** Searches logged before result instrumentation — real demand, unmeasured quality. */
    unrecordedSearches: number
    uniqueQueries: number
    zeroResultSearches: number
    zeroResultRatePct: number
    answeredSharePct: number
    thinSharePct: number
    avgResults: number
    repeatQuerySharePct: number
    /** Distinct queries typed only once in the period. */
    oneOffQueries: number
    /** Search-page renders recorded by the beacon in the same period. */
    searchPageViews: number
    /** Interval between the first and last logged query in the period (days). */
    activeDays: number
  }
  demand: {
    topQueries: SearchQueryRow[]
    /** Same rows, trimmed for the treemap (volume-ranked, top 24). */
    treemap: Array<{ query: string; searches: number; state: QueryAnswerState; shape: QueryShape; sharePct: number }>
    maxSearches: number
  }
  supply: {
    mix: Array<{ state: QueryAnswerState; label: string; queries: number; searches: number; sharePct: number }>
    shapes: Array<{
      shape: QueryShape
      label: string
      searches: number
      queries: number
      recordedSearches: number
      sharePct: number
      successPct: number
    }>
    headSharePct: number
  }
  habit: {
    buckets: Array<{ bucket: string; label: string; queries: number; searches: number; sharePct: number }>
    topRepeats: SearchQueryRow[]
  }
  health: {
    layers: { postgres: boolean; upstash: boolean; semantic: boolean; upstashAnalytics: boolean }
    indexed: { devices: number; articles: number; videos: number; total: number; readable: boolean }
    published: { devices: number; articles: number; videos: number }
    /** Published devices+articles present in the index (0–100). */
    coveragePct: number
    /** Published catalog rows the index can't serve — the corpus gap. */
    missingFromIndex: string[]
    /**
     * Index-side telemetry from the Upstash account API — query volume the
     * engine actually executed, plus latency percentiles. Used to reconcile
     * against the first-party log (capture rate) and to watch engine latency.
     */
    telemetry: {
      configured: boolean
      ok: boolean
      error: string | null
      indexName: string | null
      indexId: string | null
      /** Upstash stats window (90d clamps to 30d — the API's widest). */
      upstashPeriod: string
      /** Documents in the index per Upstash (cross-checks `indexed.total`). */
      documentCount: number | null
      pendingDocumentCount: number | null
      /** Queries executed today / this month on Upstash's account clock. */
      dailyQueryCount: number | null
      monthlyQueryCount: number | null
      /** Queries executed within the stats window (sum of the throughput series). */
      periodQueryCount: number | null
      /** Logged terms ÷ Upstash-executed queries in the window, %. */
      captureRatePct: number | null
      latencyMeanMs: number | null
      latencyP99Ms: number | null
      queryThroughput: Array<{ ts: string; value: number }>
      fetchedAt: string
    }
  }
  action: {
    fixQueue: SearchFixQueueItem[]
    stakeTotal: number
  }
}

/** Count indexed documents by prefix (best-effort; unreadable index reads as 0). */
async function readIndexCounts(): Promise<{
  devices: number
  articles: number
  videos: number
  total: number
  readable: boolean
  ids: string[]
}> {
  const counts = { devices: 0, articles: 0, videos: 0, total: 0, readable: false, ids: [] as string[] }
  try {
    let cursor: string | undefined
    // Upstash `range` pages at 100 documents max — read 50 pages, which is far
    // beyond any plausible catalog, then stop.
    for (let page = 0; page < 50; page++) {
      const res = await listIndexIds(100, cursor)
      if (res.ids.length === 0) break
      counts.readable = true
      for (const id of res.ids) {
        counts.total++
        counts.ids.push(id)
        if (id.startsWith('device:')) counts.devices++
        else if (id.startsWith('article:')) counts.articles++
        else if (id.startsWith('video:') || id.startsWith('youtube:')) counts.videos++
      }
      if (!res.cursor) break
      cursor = res.cursor
    }
  } catch {
    // unreadable index — reported honestly as readable:false
  }
  return counts
}

/** A query's tokens overlap a catalog title this much → treat it as a near miss. */
const NEAR_MISS_THRESHOLD = 0.5

interface CatalogEntryForMatch {
  id: string
  title: string
  url: string
  kind: 'device' | 'article' | 'video'
}

function findNearMiss(query: string, catalog: CatalogEntryForMatch[]): SearchNearMiss | null {
  let best: SearchNearMiss | null = null
  for (const entry of catalog) {
    const sim = diceSimilarity(query, entry.title)
    if (sim >= NEAR_MISS_THRESHOLD && (!best || sim > best.similarity)) {
      best = {
        id: entry.id,
        title: entry.title,
        url: entry.url,
        kind: entry.kind,
        similarity: Math.round(sim * 100) / 100,
      }
    }
  }
  return best
}

export async function getSearchInsights(period: string): Promise<SearchInsights> {
  const since = sinceISO(period)

  const [queriesRes, devicesRes, articlesRes, videosRes, searchPageRes, indexCounts, telemetryRaw] =
    await Promise.all([
      supabase
        .from('search_queries')
        .select('query, results_count, zero_result, created_at')
        .gte('created_at', since),
      supabase.from('devices').select('slug, name, brand:brands(name, slug)').eq('status', 'published'),
      supabase.from('articles').select('slug, title').eq('status', 'published'),
      supabase.from('videos').select('id, title'),
      supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('path', '/search')
        .gte('created_at', since),
      readIndexCounts(),
      // Account-level telemetry (query volume + latency) — cached 60s, never throws.
      fetchUpstashSearchTelemetry(period).catch(
        (e: unknown): UpstashSearchTelemetry => ({
          ok: false,
          configured: false,
          error: e instanceof Error ? e.message : String(e),
          indexId: null,
          indexName: null,
          period: period,
          documentCount: null,
          pendingDocumentCount: null,
          dailyQueryCount: null,
          monthlyQueryCount: null,
          periodQueryCount: null,
          latencyMeanMs: null,
          latencyP99Ms: null,
          queryThroughput: [],
          fetchedAt: new Date().toISOString(),
        }),
      ),
    ])

  const telemetry = telemetryRaw

  const rows = (queriesRes.data ?? []) as Array<{
    query: string | null
    results_count: number | null
    zero_result: boolean | null
    created_at: string
  }>

  // ── catalog (near-miss target + index-coverage denominator) ────────────────
  const catalog: CatalogEntryForMatch[] = []
  const published = { devices: 0, articles: 0, videos: 0 }
  const brandNames = new Set<string>()

  for (const d of devicesRes.data ?? []) {
    published.devices++
    const brand = d.brand as { name?: string; slug?: string } | null
    if (brand?.name) brandNames.add(brand.name.toLowerCase())
    if (brand?.slug) brandNames.add(brand.slug.toLowerCase())
    catalog.push({
      id: `device:${d.slug}`,
      title: d.name,
      url: `/devices/${brand?.slug ?? 'brand'}/${d.slug}`,
      kind: 'device',
    })
  }
  for (const a of articlesRes.data ?? []) {
    published.articles++
    catalog.push({ id: `article:${a.slug}`, title: a.title, url: `/articles/${a.slug}`, kind: 'article' })
  }
  for (const v of videosRes.data ?? []) {
    published.videos++
    catalog.push({ id: `video:${v.id}`, title: v.title, url: `/videos#${v.id}`, kind: 'video' })
  }
  const brandList = Array.from(brandNames)

  // ── per-query rollup (normalised: casing + whitespace must not split a term)
  //
  // `zero_result = false` with `results_count = 0` is NOT a confirmed miss — it
  // is a row logged before result instrumentation existed. Those rows are real
  // demand but unmeasured quality, so they are tracked separately (`recorded`)
  // and excluded from every rate rather than being counted as zero-results.
  const perQuery = new Map<
    string,
    {
      query: string
      searches: number
      resultSum: number
      zeroResults: number
      recordedSearches: number
      lastSeen: string
    }
  >()
  for (const r of rows) {
    const key = normalizeQuery(String(r.query ?? ''))
    if (!key) continue
    const entry =
      perQuery.get(key) ??
      { query: key, searches: 0, resultSum: 0, zeroResults: 0, recordedSearches: 0, lastSeen: '' }
    entry.searches++
    const count = Number(r.results_count ?? 0)
    const isRecorded = r.zero_result === true || count > 0
    if (isRecorded) {
      entry.recordedSearches++
      entry.resultSum += count
      if (r.zero_result) entry.zeroResults++
    }
    if (r.created_at && r.created_at > entry.lastSeen) entry.lastSeen = r.created_at
    perQuery.set(key, entry)
  }

  const searchesTotal = rows.length
  const queryRows: SearchQueryRow[] = Array.from(perQuery.values())
    .map((e) => {
      const recorded = e.recordedSearches > 0
      const avgResults =
        recorded ? Math.round((e.resultSum / e.recordedSearches) * 100) / 100 : 0
      const state: QueryAnswerState = recorded ? answerStateFor(avgResults) : 'unknown'
      return {
        query: e.query,
        searches: e.searches,
        avgResults,
        zeroResults: e.zeroResults,
        recorded,
        recordedSearches: e.recordedSearches,
        state,
        shape: classifyQueryShape(e.query, brandList),
        sharePct: sharePct(e.searches, searchesTotal, 1),
        lastSeen: e.lastSeen,
        nearMiss: state === 'answered' ? null : findNearMiss(e.query, catalog),
      }
    })
    .sort((a, b) => b.searches - a.searches || a.query.localeCompare(b.query))


  // ── totals ────────────────────────────────────────────────────────────────
  //
  // Rates are computed over RECORDED searches only (rows that carry a result
  // count). Legacy rows are reported as `unrecordedSearches` instead of being
  // silently folded into the zero-result rate as false misses.
  const uniqueQueries = queryRows.length
  const recordedSearches = queryRows.reduce((s, r) => s + r.recordedSearches, 0)
  const unrecordedSearches = searchesTotal - recordedSearches
  const zeroResultSearches = rows.filter((r) => r.zero_result === true).length
  const answeredSearches = queryRows
    .filter((r) => r.state === 'answered')
    .reduce((s, r) => s + r.recordedSearches, 0)
  const thinSearches = queryRows
    .filter((r) => r.state === 'thin')
    .reduce((s, r) => s + r.recordedSearches, 0)
  const resultSum = queryRows.reduce((s, r) => s + r.avgResults * r.recordedSearches, 0)
  const oneOffQueries = queryRows.filter((r) => r.searches === 1).length
  const repeatQuerySharePct = sharePct(searchesTotal - oneOffQueries, searchesTotal, 1)

  const timestamps = rows.map((r) => new Date(r.created_at).getTime()).filter((t) => Number.isFinite(t))
  const activeDays =
    timestamps.length > 1
      ? Math.max(1, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000)) + 1)
      : timestamps.length

  // ── B · supply — answer coverage + intent shapes ──────────────────────────
  const mix = ANSWER_STATE_ORDER.map((state) => {
    const list = queryRows.filter((r) => r.state === state)
    const searched = list.reduce((s, r) => s + r.searches, 0)
    return {
      state,
      label: ANSWER_STATE_LABELS[state],
      queries: list.length,
      searches: searched,
      sharePct: sharePct(searched, searchesTotal, 1),
    }
  })

  const shapes = QUERY_SHAPE_ORDER.map((shape) => {
    const list = queryRows.filter((r) => r.shape === shape)
    const searched = list.reduce((s, r) => s + r.searches, 0)
    const shapeRecorded = list.reduce((s, r) => s + r.recordedSearches, 0)
    const answered = list
      .filter((r) => r.state === 'answered')
      .reduce((s, r) => s + r.recordedSearches, 0)
    return {
      shape,
      label: QUERY_SHAPE_LABELS[shape],
      searches: searched,
      queries: list.length,
      recordedSearches: shapeRecorded,
      sharePct: sharePct(searched, searchesTotal, 1),
      successPct: sharePct(answered, shapeRecorded, 1),
    }
  }).filter((s) => s.searches > 0)

  // Head = the top 20% of queries by volume; the rest is the long tail.
  const headCount = Math.max(1, Math.ceil(queryRows.length * 0.2))
  const headSharePct = sharePct(
    queryRows.slice(0, headCount).reduce((s, r) => s + r.searches, 0),
    searchesTotal,
    1,
  )

  // ── C · habit — is search a habit or a one-off? ───────────────────────────
  const HABIT_BUCKETS: Array<{ bucket: string; label: string; min: number; max: number }> = [
    { bucket: '1', label: '1×', min: 1, max: 1 },
    { bucket: '2', label: '2×', min: 2, max: 2 },
    { bucket: '3-5', label: '3–5×', min: 3, max: 5 },
    { bucket: '6+', label: '6×+', min: 6, max: Number.MAX_SAFE_INTEGER },
  ]
  const buckets = HABIT_BUCKETS.map((b) => {
    const list = queryRows.filter((r) => r.searches >= b.min && r.searches <= b.max)
    const searched = list.reduce((s, r) => s + r.searches, 0)
    return {
      bucket: b.bucket,
      label: b.label,
      queries: list.length,
      searches: searched,
      sharePct: sharePct(searched, searchesTotal, 1),
    }
  })

  // ── C · health — are the search layers actually serving? ──────────────────
  const indexedRoutable = new Set(indexCounts.ids.filter((id) => id.startsWith('device:') || id.startsWith('article:')))
  const missingFromIndex = indexCounts.readable
    ? catalog
        .filter((c) => c.kind !== 'video' && !indexedRoutable.has(c.id))
        .map((c) => `${c.title} (${c.id.split(':')[0]})`)
        .slice(0, 25)
    : []
  const publishedRoutable = published.devices + published.articles
  const indexedPublishedRoutable = catalog.filter((c) => c.kind !== 'video' && indexedRoutable.has(c.id)).length

  // Capture-rate reconciliation: Upstash executed N queries on the index within
  // the stats window; we logged M terms. Interpretation is two-sided — a wide
  // gap can be lost instrumentation OR index traffic from jobs rather than
  // visitors, so the tab states both readings instead of picking one.
  const periodQueryCount = telemetry.periodQueryCount
  const captureRatePct =
    telemetry.ok && periodQueryCount !== null && periodQueryCount > 0
      ? sharePct(recordedSearches ?? searchesTotal, periodQueryCount, 1)
      : null

  const health: SearchInsights['health'] = {
    layers: {
      // Postgres full-text is always available (it is the catalog itself).
      postgres: true,
      upstash: indexCounts.readable,
      semantic: isVectorConfigured(),
      // Upstash's own telemetry feed: live only when the account API answered.
      upstashAnalytics: telemetry.ok,
    },
    indexed: {
      devices: indexCounts.devices,
      articles: indexCounts.articles,
      videos: indexCounts.videos,
      total: indexCounts.total,
      readable: indexCounts.readable,
    },
    published,
    coveragePct: sharePct(indexedPublishedRoutable, publishedRoutable, 1),
    missingFromIndex,
    telemetry: {
      configured: telemetry.configured,
      ok: telemetry.ok,
      error: telemetry.ok ? null : (telemetry.error ?? 'Telemetry unavailable'),
      indexName: telemetry.indexName,
      indexId: telemetry.indexId,
      upstashPeriod: telemetry.period,
      documentCount: telemetry.documentCount,
      pendingDocumentCount: telemetry.pendingDocumentCount,
      dailyQueryCount: telemetry.dailyQueryCount,
      monthlyQueryCount: telemetry.monthlyQueryCount,
      periodQueryCount,
      captureRatePct,
      latencyMeanMs: telemetry.latencyMeanMs,
      latencyP99Ms: telemetry.latencyP99Ms,
      queryThroughput: telemetry.queryThroughput.slice(-24),
      fetchedAt: telemetry.fetchedAt,
    },
  }


  // ── D · action — the backlog, ranked by demand at stake ───────────────────
  const fixQueue: SearchFixQueueItem[] = []

  for (const row of queryRows) {
    if (row.state === 'answered') continue
    const zeroSharePct = sharePct(row.zeroResults, row.recordedSearches, 0)
    const searchHref = `/search?q=${encodeURIComponent(row.query)}`

    // Un-instrumented rows first: real demand, unconfirmed miss. Lowest weight so
    // they never outrank a confirmed gap, but never dropped either.
    if (row.state === 'unknown') {
      const stake = row.searches
      fixQueue.push({
        issue: 'unrecorded_result',
        label: SEARCH_ISSUE_META.unrecorded_result.label,
        query: row.query,
        searches: row.searches,
        zeroSharePct: 0,
        severity: searchSeverity(stake),
        stake,
        detail: row.nearMiss
          ? `${row.searches} search${row.searches === 1 ? '' : 'es'} with no recorded result count. Closest catalog match: ${row.nearMiss.title} — ${Math.round(row.nearMiss.similarity * 100)}% token overlap.`
          : `${row.searches} search${row.searches === 1 ? '' : 'es'} with no recorded result count — the miss is unconfirmed.`,
        action: SEARCH_ISSUE_META.unrecorded_result.action,
        href: searchHref,
        editHref: null,
      })
      continue
    }

    if (row.nearMiss) {
      // Cheapest fix in the queue: the page almost certainly exists already.
      const stake = row.searches * 4
      fixQueue.push({
        issue: 'near_miss',
        label: SEARCH_ISSUE_META.near_miss.label,
        query: row.query,
        searches: row.searches,
        zeroSharePct,
        severity: searchSeverity(stake),
        stake,
        detail: `Closest catalog match: ${row.nearMiss.title} — ${Math.round(row.nearMiss.similarity * 100)}% token overlap.`,
        action: SEARCH_ISSUE_META.near_miss.action,
        href: searchHref,
        editHref: null,
      })
      continue
    }

    if (row.state === 'zero') {
      const singleToken = row.query.trim().split(/\s+/).length === 1
      const issue: SearchIssue = singleToken ? 'vague_query' : 'zero_result'
      const stake = row.searches * (singleToken ? 1 : 3)
      fixQueue.push({
        issue,
        label: SEARCH_ISSUE_META[issue].label,
        query: row.query,
        searches: row.searches,
        zeroSharePct,
        severity: searchSeverity(stake),
        stake,
        detail: `${row.searches} search${row.searches === 1 ? '' : 'es'} · ${zeroSharePct}% returned nothing · no catalog title comes close.`,
        action: SEARCH_ISSUE_META[issue].action,
        href: searchHref,
        editHref: null,
      })
      continue
    }

    const stake = row.searches * 1.5
    fixQueue.push({
      issue: 'thin_result',
      label: SEARCH_ISSUE_META.thin_result.label,
      query: row.query,
      searches: row.searches,
      zeroSharePct,
      severity: searchSeverity(stake),
      stake,
      detail: `${row.searches} search${row.searches === 1 ? '' : 'es'} · ${row.avgResults} results on average — one match is a coin flip.`,
      action: SEARCH_ISSUE_META.thin_result.action,
      href: searchHref,
      editHref: null,
    })
  }

  // Unindexed published pages: the content exists but search cannot serve it.
  // Ranked by a fixed stake (weight 10) and capped so a bulk import can't drown
  // out real demand.
  for (const label of health.missingFromIndex.slice(0, 5)) {
    fixQueue.push({
      issue: 'unindexed_content',
      label: SEARCH_ISSUE_META.unindexed_content.label,
      query: label,
      searches: 0,
      zeroSharePct: 0,
      severity: 'medium',
      stake: 10,
      detail: `${health.coveragePct}% of published devices + articles are in the search index — this one is not.`,
      action: SEARCH_ISSUE_META.unindexed_content.action,
      href: '/admin/devices',
      editHref: null,
    })
  }

  fixQueue.sort((a, b) => b.stake - a.stake || b.searches - a.searches)



  return {
    totals: {
      searches: searchesTotal,
      recordedSearches,
      unrecordedSearches,
      uniqueQueries,
      zeroResultSearches,
      zeroResultRatePct: sharePct(zeroResultSearches, recordedSearches, 1),
      answeredSharePct: sharePct(answeredSearches, recordedSearches, 1),
      thinSharePct: sharePct(thinSearches, recordedSearches, 1),
      avgResults: recordedSearches > 0 ? Math.round((resultSum / recordedSearches) * 100) / 100 : 0,
      repeatQuerySharePct,
      oneOffQueries,
      searchPageViews: searchPageRes.count ?? 0,
      activeDays,
    },
    demand: {
      topQueries: queryRows.slice(0, 50),
      treemap: queryRows.slice(0, 24).map((r) => ({
        query: r.query,
        searches: r.searches,
        state: r.state,
        shape: r.shape,
        sharePct: r.sharePct,
      })),
      maxSearches: queryRows.length > 0 ? queryRows[0].searches : 0,
    },
    supply: { mix, shapes, headSharePct },
    habit: {
      buckets,
      topRepeats: [...queryRows]
        .filter((r) => r.searches >= 2)
        .sort((a, b) => b.searches - a.searches)
        .slice(0, 10),
    },
    health,
    action: {
      fixQueue: fixQueue.slice(0, 25),
      stakeTotal: Math.round(fixQueue.reduce((s, i) => s + i.stake, 0) * 10) / 10,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 13 — Campaigns & Acquisition intelligence
// ─────────────────────────────────────────────────────────────────────────────

/** One row of the UTM registry: a raw, as-recorded tag tuple. */
export interface CampaignTagRow {
  /** Raw values. Case / whitespace variants stay distinct on purpose — that is
   *  exactly what the registry exists to expose. */
  source: string
  medium: string
  campaign: string
  /** Medium → paid · social · creator · email · affiliate · search · owned · unmapped. */
  channelClass: ChannelClass
  channelLabel: string
  views: number
  visitors: number
  /** Clicks attributed by FIRST-TOUCH fp_id join (visit-level), not by the click row. */
  clicks: number
  clickRatePer1k: number
  sharePct: number
  verdict: CampaignVerdict
  compliance: TagCompliance
  complianceLabel: string
  issues: TagIssue[]
  activeDays: number
  lastSeen: string | null
  stale: boolean
  topLanding: { path: string; kind: LandingKind; kindLabel: string; views: number } | null
  /** Share of this campaign's views landing on a device / article / comparison. */
  deepLandingPct: number
  /** Clicks whose OUTBOUND buy link carried this campaign value (retailer-side tags). */
  outboundTaggedClicks: number
}

/** One row of the prescriptive campaign queue. */
export interface CampaignFixQueueItem {
  issue: CampaignIssue
  label: string
  /** What the row is about: a campaign tuple, a platform, or the whole account. */
  target: string
  campaign: string | null
  detail: string
  action: string
  stake: number
  severity: 'high' | 'medium' | 'low'
  href: string
}

export interface CampaignInsights {
  totals: {
    views: number
    visitors: number
    taggedViews: number
    untaggedViews: number
    directViews: number
    /** Tagged views ÷ all views × 100 — how much acquisition is nameable. */
    tagRatePct: number
    /** Untagged views with an external referrer ÷ all views × 100. */
    labelledReferralPct: number
    distinctCampaigns: number
    distinctSources: number
    distinctMediums: number
    activeDays: number
    clicks: number
    interactions: number
    /** Views whose row carries no fp_id — they cannot enter the join model. */
    unidentifiedViews: number
    identityCoveragePct: number
    taggedVisitors: number
    untaggedVisitors: number
    directVisitors: number
  }
  reach: {
    trend: Array<{ date: string; tagged: number; untagged: number; direct: number; total: number }>
    maxDaily: number
    byClass: Array<{
      attribution: AttributionClass
      label: string
      views: number
      visitors: number
      sharePct: number
    }>
    landings: Array<{
      kind: LandingKind
      label: string
      depth: 'deep' | 'shallow'
      views: number
      sharePct: number
      topPath: string
    }>
    /** Top campaigns by views (the registry holds the full list). */
    topCampaigns: CampaignTagRow[]
    /** Referrer-classified but untagged entry sources, biggest first. */
    untaggedSources: Array<{
      label: string
      platform: string | null
      sourceClass: string
      views: number
      visitors: number
      /** Self-referral / dev host — counted in reach, excluded from the queue. */
      internal: boolean
    }>
  }
  attribution: {
    segments: Array<{
      attribution: AttributionClass
      label: string
      visitors: number
      views: number
      /** Visitors who saw more than the entry page. */
      engagedVisitors: number
      engagedPct: number
      clickers: number
      clicks: number
      clickPct: number
      interactions: number
    }>
    identifiedVisitors: number
    unidentifiedViews: number
    downstreamViews: number
    downstreamTaggedViews: number
    /** Downstream rows still carrying a tag ÷ all downstream rows × 100. */
    tagDurabilityPct: number
    creditedClicks: number
    uncreditedClicks: number
    unknownIdentityClicks: number
  }
  efficiency: {
    campaigns: CampaignTagRow[]
    reachMedian: number
    rateMedian: number
    channelMix: Array<{
      channelClass: ChannelClass
      label: string
      views: number
      clicks: number
      campaigns: number
      sharePct: number
    }>
    complianceMix: Array<{ compliance: TagCompliance; label: string; campaigns: number; views: number; sharePct: number }>
    gradedCampaigns: number
    cleanSharePct: number
    bestCampaign: CampaignTagRow | null
    worstCampaign: CampaignTagRow | null
  }
  action: {
    fixQueue: CampaignFixQueueItem[]
    stakeTotal: number
  }
}



/**
 * Campaigns & Acquisition intelligence — the acquisition-integrity story.
 *
 * REACH → ATTRIBUTION → EFFICIENCY → ACTION, from four first-party sources:
 * page_views (the landing/entry record), affiliate_clicks (the money) and
 * interactions (the intent) joined back to page_views by `fp_id`, plus the
 * published catalog to classify where each click actually lands.
 *
 * The model is FIRST-TOUCH BY fp_id, because that is the only durable link the
 * capture layer gives us: the beacons read utm_* from the live URL, so a tag
 * exists on the landing request and vanishes on the next internal navigation,
 * while affiliate_clicks carry the OUTBOUND buy link's own params. Anything the
 * join cannot reach is reported as unattributed rather than guessed.
 */
export async function getCampaignInsights(period: string): Promise<CampaignInsights> {
  const since = sinceISO(period)
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const nowMs = Date.now()

  // Zero-fill every calendar day (UTC) so the reach strip keeps its shape even
  // on quiet days — same discipline as the Traffic tab.
  const dayKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(new Date(nowMs - i * 86400000).toISOString().split('T')[0])
  }
  const daySet = new Set(dayKeys)

  const [viewsRes, clicksRes, interactionsRes, devicesRes, articlesRes] = await Promise.all([
    supabase
      .from('page_views')
      .select('path, referrer, source, platform, fp_id, utm_source, utm_medium, utm_campaign, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('affiliate_clicks')
      .select('fp_id, utm_source, utm_medium, utm_campaign, created_at')
      .gte('created_at', since),
    supabase.from('interactions').select('action, content_type, device_slug, fp_id, created_at').gte('created_at', since),
    supabase.from('devices').select('slug').eq('status', 'published'),
    supabase.from('articles').select('slug').eq('status', 'published'),
  ])

  type ViewRow = {
    path: string | null
    referrer: string | null
    source: string | null
    platform: string | null
    fp_id: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    created_at: string
  }

  const views = (viewsRes.data ?? []) as ViewRow[]
  const clickRows = (clicksRes.data ?? []) as Array<{
    fp_id: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    created_at: string
  }>
  const interactionRows = (interactionsRes.data ?? []) as Array<{
    action: string
    content_type: string | null
    device_slug: string | null
    fp_id: string | null
    created_at: string
  }>

  const deviceSlugs = new Set((devicesRes.data ?? []).map((d) => String(d.slug)))
  const articleSlugs = new Set((articlesRes.data ?? []).map((a) => String(a.slug)))

  const toDayKey = (iso: string) => new Date(iso).toISOString().split('T')[0]

  // ── A · reach — what did the tagged work deliver? ─────────────────────────
  type Enriched = ViewRow & {
    tagged: boolean
    attribution: AttributionClass
    kind: LandingKind
    dayKey: string
  }

  const enriched: Enriched[] = views.map((r) => {
    const tagged = isTagged(r)
    return {
      ...r,
      tagged,
      attribution: attributionClassFor(tagged, r.source),
      kind: classifyLandingPath(r.path ?? '/', deviceSlugs, articleSlugs),
      dayKey: toDayKey(r.created_at),
    }
  })

  const totalViews = enriched.length
  const taggedViews = enriched.filter((v) => v.attribution === 'tagged')
  const untaggedViews = enriched.filter((v) => v.attribution === 'untagged')
  const directViews = enriched.filter((v) => v.attribution === 'direct')

  const visitorsOf = (rows: Enriched[]) => {
    const set = new Set<string>()
    for (const r of rows) if (r.fp_id) set.add(r.fp_id)
    return set
  }

  const identifiedRows = enriched.filter((v) => v.fp_id)
  const visitorSet = visitorsOf(enriched)
  const taggedVisitorSet = visitorsOf(taggedViews)
  const untaggedVisitorSet = visitorsOf(untaggedViews)
  const directVisitorSet = visitorsOf(directViews)

  const activeDays = new Set(enriched.map((v) => v.dayKey).filter((d) => daySet.has(d))).size

  const tagValue = (v: string | null) => normalizeTag(v)
  const campaignSet = new Set(taggedViews.map((v) => tagValue(v.utm_campaign)).filter(Boolean))
  const sourceSet = new Set(taggedViews.map((v) => tagValue(v.utm_source)).filter(Boolean))
  const mediumSet = new Set(taggedViews.map((v) => tagValue(v.utm_medium)).filter(Boolean))


  const byClass: CampaignInsights['reach']['byClass'] = ATTRIBUTION_ORDER.map((cls) => {
    const rows = enriched.filter((v) => v.attribution === cls)
    return {
      attribution: cls,
      label: ATTRIBUTION_LABELS[cls],
      views: rows.length,
      visitors: visitorsOf(rows).size,
      sharePct: sharePct(rows.length, totalViews, 1),
    }
  })

  const LANDING_ORDER: LandingKind[] = ['device', 'compare', 'article', 'video', 'brand', 'home', 'search', 'other']
  const landings: CampaignInsights['reach']['landings'] = LANDING_ORDER.map((kind) => {
    const rows = enriched.filter((v) => v.kind === kind)
    const pathCounts = new Map<string, number>()
    for (const r of rows) {
      const p = r.path ?? '/'
      pathCounts.set(p, (pathCounts.get(p) ?? 0) + 1)
    }
    const topPath = Array.from(pathCounts.entries()).sort((a, b) => b[1] - a[1])[0]
    return {
      kind,
      label: LANDING_KIND_LABELS[kind],
      depth: landingDepth(kind),
      views: rows.length,
      sharePct: sharePct(rows.length, totalViews, 1),
      topPath: topPath ? topPath[0] : '',
    }
  }).filter((l) => l.views > 0)

  const trend = dayKeys.map((date) => {
    const rows = enriched.filter((v) => v.dayKey === date)
    const t = rows.filter((v) => v.attribution === 'tagged').length
    const d = rows.filter((v) => v.attribution === 'direct').length
    return { date, tagged: t, untagged: rows.length - t - d, direct: d, total: rows.length }
  })

  // Reached from an external referrer with no tag: the platform is knowable, the
  // campaign is not. Grouped per platform (social) or per referrer host. Our own
  // domain and dev hosts are self-referral noise — still counted in reach, but
  // flagged here so the queue never asks anyone to "tag" a localhost redirect.
  const untaggedSourceMap = new Map<
    string,
    {
      label: string
      platform: string | null
      sourceClass: string
      views: number
      visitors: Set<string>
      internal: boolean
    }
  >()
  for (const r of untaggedViews) {
    let host = 'unknown referrer'
    try {
      if (r.referrer) host = new URL(r.referrer).hostname.replace(/^www\./, '')
    } catch {
      host = 'unknown referrer'
    }
    const label = r.platform ?? host
    const key = `${r.source ?? 'referral'}::${label}`
    const cur =
      untaggedSourceMap.get(key) ?? {
        label,
        platform: r.platform,
        sourceClass: r.source ?? 'referral',
        views: 0,
        visitors: new Set<string>(),
        internal: isInternalReferrer(host),
      }
    cur.views++
    if (r.fp_id) cur.visitors.add(r.fp_id)
    untaggedSourceMap.set(key, cur)
  }
  const untaggedSources = Array.from(untaggedSourceMap.values())
    .map((s) => ({
      label: s.label,
      platform: s.platform,
      sourceClass: s.sourceClass,
      views: s.views,
      visitors: s.visitors.size,
      internal: s.internal,
    }))
    .sort((a, b) => b.views - a.views)

  // ── B · attribution — first-touch by fp_id ────────────────────────────────
  //
  // `enriched` is ordered by created_at ascending, so the first row seen for an
  // fp_id is that visitor's entry page INSIDE the window. That is the only
  // campaign we can honestly credit — the rows after it carry no tag at all
  // (the beacon reads utm_* from the live URL).
  const rowsByVisitor = new Map<string, Enriched[]>()
  for (const r of enriched) {
    if (!r.fp_id) continue
    const list = rowsByVisitor.get(r.fp_id)
    if (list) list.push(r)
    else rowsByVisitor.set(r.fp_id, [r])
  }

  const entryByVisitor = new Map<string, Enriched>()
  const viewsByVisitor = new Map<string, number>()
  for (const [fp, rows] of rowsByVisitor) {
    entryByVisitor.set(fp, rows[0])
    viewsByVisitor.set(fp, rows.length)
  }

  const clicksByVisitor = new Map<string, number>()
  let unknownIdentityClicks = 0
  for (const c of clickRows) {
    if (!c.fp_id || !entryByVisitor.has(c.fp_id)) {
      // No identity, or the visitor's entry page sits outside the window — we
      // cannot say anything about where they came from, so it is not a "miss".
      unknownIdentityClicks++
      continue
    }
    clicksByVisitor.set(c.fp_id, (clicksByVisitor.get(c.fp_id) ?? 0) + 1)
  }

  const interactionsByVisitor = new Map<string, number>()
  for (const i of interactionRows) {
    if (!i.fp_id) continue
    interactionsByVisitor.set(i.fp_id, (interactionsByVisitor.get(i.fp_id) ?? 0) + 1)
  }

  // Tag durability: of the rows that are NOT the entry page for a tagged
  // visitor, how many still carry a tag? Since every beacon reads the live URL,
  // this is expected to sit at ~0 — the number exists to prove it, not to
  // flatter the model.
  let downstreamViews = 0
  let downstreamTaggedViews = 0
  let creditedClicks = 0
  let uncreditedClicks = 0
  for (const [fp, rows] of rowsByVisitor) {
    const entry = rows[0]
    const visitorClicks = clicksByVisitor.get(fp) ?? 0
    if (entry.attribution === 'tagged') {
      creditedClicks += visitorClicks
      for (let i = 1; i < rows.length; i++) {
        downstreamViews++
        if (rows[i].tagged) downstreamTaggedViews++
      }
    } else {
      // Money we can see being made by a visitor whose campaign we never saw.
      uncreditedClicks += visitorClicks
    }
  }


  // ── C · efficiency — the UTM registry, graded ─────────────────────────────
  //
  // The registry keys on the RAW tuple: `Ramadan Sale` and `ramadan-sale` are
  // deliberately two rows, because that fork is precisely the governance
  // problem the registry exists to expose.
  type CampaignBucket = {
    source: string
    medium: string
    campaign: string
    views: number
    visitors: Set<string>
    landingCounts: Map<LandingKind, number>
    pathCounts: Map<string, number>
    firstSeen: string
    lastSeen: string
    days: Set<string>
    clicks: number
  }

  const registry = new Map<string, CampaignBucket>()
  const tupleKey = (source: string, medium: string, campaign: string) => `${source}|${medium}|${campaign}`

  for (const r of taggedViews) {
    const source = tagValue(r.utm_source)
    const medium = tagValue(r.utm_medium)
    const campaign = tagValue(r.utm_campaign)
    const key = tupleKey(source, medium, campaign)
    const bucket =
      registry.get(key) ??
      {
        source,
        medium,
        campaign,
        views: 0,
        visitors: new Set<string>(),
        landingCounts: new Map<LandingKind, number>(),
        pathCounts: new Map<string, number>(),
        firstSeen: r.created_at,
        lastSeen: r.created_at,
        days: new Set<string>(),
        clicks: 0,
      }
    bucket.views++
    if (r.fp_id) bucket.visitors.add(r.fp_id)
    bucket.landingCounts.set(r.kind, (bucket.landingCounts.get(r.kind) ?? 0) + 1)
    const p = r.path ?? '/'
    bucket.pathCounts.set(p, (bucket.pathCounts.get(p) ?? 0) + 1)
    if (r.created_at < bucket.firstSeen) bucket.firstSeen = r.created_at
    if (r.created_at > bucket.lastSeen) bucket.lastSeen = r.created_at
    bucket.days.add(r.dayKey)
    registry.set(key, bucket)
  }

  // Visit-level click attribution: a click belongs to the campaign the visitor
  // ENTERED on, which is the only tag that survived long enough to be recorded.
  const entryTupleKeyByVisitor = new Map<string, string>()
  for (const [fp, entry] of entryByVisitor) {
    if (entry.attribution !== 'tagged') continue
    entryTupleKeyByVisitor.set(
      fp,
      tupleKey(tagValue(entry.utm_source), tagValue(entry.utm_medium), tagValue(entry.utm_campaign)),
    )
  }
  for (const [fp, count] of clicksByVisitor) {
    const key = entryTupleKeyByVisitor.get(fp)
    if (!key) continue
    const bucket = registry.get(key)
    if (bucket) bucket.clicks += count
  }

  // Outbound-side tags: affiliate_clicks carry the BUY LINK's own utm params
  // (the retailer's tagging), so they are reported as context, never as the
  // campaign attribution.
  const outboundTagClicks = new Map<string, number>()
  for (const c of clickRows) {
    if (!isTagged(c)) continue
    const key = tupleKey(tagValue(c.utm_source), tagValue(c.utm_medium), tagValue(c.utm_campaign))
    outboundTagClicks.set(key, (outboundTagClicks.get(key) ?? 0) + 1)
  }

  const staleCutoff = dayKeys[Math.max(0, dayKeys.length - 8)] ?? dayKeys[0]
  const bucketRows = Array.from(registry.values()).map((b) => {
    const issues = tagIssuesFor({ source: b.source, medium: b.medium, campaign: b.campaign })
    const deepViews = Array.from(b.landingCounts.entries())
      .filter(([kind]) => landingDepth(kind) === 'deep')
      .reduce((s, [, n]) => s + n, 0)
    const topPath = Array.from(b.pathCounts.entries()).sort((a, b2) => b2[1] - a[1])[0]
    const topKind = Array.from(b.landingCounts.entries()).sort((a, b2) => b2[1] - a[1])[0]
    const lastSeenDay = toDayKey(b.lastSeen)
    return {
      source: b.source,
      medium: b.medium,
      campaign: b.campaign,
      channelClass: classifyMedium(b.medium),
      views: b.views,
      visitors: b.visitors.size,
      clicks: b.clicks,
      clickRatePer1k: clickRatePer1k(b.clicks, b.views),
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
      activeDays: b.days.size,
      issues,
      compliance: tagComplianceFor(issues),
      deepLandingPct: sharePct(deepViews, b.views, 1),
      topLanding: topPath
        ? {
            path: topPath[0],
            kind: (topKind ? topKind[0] : 'other') as LandingKind,
            kindLabel: LANDING_KIND_LABELS[(topKind ? topKind[0] : 'other') as LandingKind],
            views: topPath[1],
          }
        : null,
      stale: lastSeenDay < staleCutoff,
      outboundTaggedClicks: outboundTagClicks.get(tupleKey(b.source, b.medium, b.campaign)) ?? 0,
    }
  })

  const reachMedian = median(bucketRows.map((r) => r.views))
  const rateMedian = median(bucketRows.map((r) => r.clickRatePer1k))

  const campaigns: CampaignTagRow[] = bucketRows
    .map((r) => {
      const verdict = campaignVerdict({
        views: r.views,
        clicks: r.clicks,
        reachMedian,
        rateMedian,
      })
      return {
        source: r.source,
        medium: r.medium,
        campaign: r.campaign,
        channelClass: r.channelClass,
        channelLabel: CHANNEL_CLASS_LABELS[r.channelClass],
        views: r.views,
        visitors: r.visitors,
        clicks: r.clicks,
        clickRatePer1k: r.clickRatePer1k,
        sharePct: sharePct(r.views, taggedViews.length, 1),
        verdict,
        compliance: r.compliance,
        complianceLabel: TAG_COMPLIANCE_LABELS[r.compliance],
        issues: r.issues,
        activeDays: r.activeDays,
        lastSeen: r.lastSeen,
        stale: r.stale,
        topLanding: r.topLanding,
        deepLandingPct: r.deepLandingPct,
        outboundTaggedClicks: r.outboundTaggedClicks,
      }
    })
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks)

  const segments: CampaignInsights['attribution']['segments'] = ATTRIBUTION_ORDER.map((cls) => {
    const rows = enriched.filter((v) => v.attribution === cls)
    const classVisitors = new Set<string>()
    for (const r of rows) if (r.fp_id) classVisitors.add(r.fp_id)

    let engaged = 0
    let clickers = 0
    let clicks = 0
    let interactions = 0
    for (const fp of classVisitors) {
      if ((viewsByVisitor.get(fp) ?? 0) > 1) engaged++
      const c = clicksByVisitor.get(fp) ?? 0
      if (c > 0) clickers++
      clicks += c
      interactions += interactionsByVisitor.get(fp) ?? 0
    }

    return {
      attribution: cls,
      label: ATTRIBUTION_LABELS[cls],
      visitors: classVisitors.size,
      views: rows.length,
      engagedVisitors: engaged,
      engagedPct: sharePct(engaged, classVisitors.size, 1),
      clickers,
      clicks,
      clickPct: sharePct(clickers, classVisitors.size, 1),
      interactions,
    }
  })


  const channelMix: CampaignInsights['efficiency']['channelMix'] = CHANNEL_CLASS_ORDER.map((cls) => {
    const rows = campaigns.filter((c) => c.channelClass === cls)
    const views = rows.reduce((s, c) => s + c.views, 0)
    const clicks = rows.reduce((s, c) => s + c.clicks, 0)
    return {
      channelClass: cls,
      label: CHANNEL_CLASS_LABELS[cls],
      views,
      clicks,
      campaigns: rows.length,
      sharePct: sharePct(views, taggedViews.length, 1),
    }
  }).filter((r) => r.campaigns > 0)

  const complianceMix: CampaignInsights['efficiency']['complianceMix'] = (
    ['clean', 'warn', 'broken'] as TagCompliance[]
  )
    .map((compliance) => {
      const rows = campaigns.filter((c) => c.compliance === compliance)
      const views = rows.reduce((s, c) => s + c.views, 0)
      return {
        compliance,
        label: TAG_COMPLIANCE_LABELS[compliance],
        campaigns: rows.length,
        views,
        sharePct: sharePct(views, taggedViews.length, 1),
      }
    })
    .filter((r) => r.campaigns > 0)

  const cleanViews = complianceMix.find((c) => c.compliance === 'clean')?.views ?? 0
  const graded = campaigns.filter((c) => c.views >= 5)
  const byRateDesc = [...graded].sort((a, b) => b.clickRatePer1k - a.clickRatePer1k)

  // ── D · action — one row per campaign, carrying its most actionable issue ──
  const STAKE_WEIGHT: Partial<Record<CampaignIssue, number>> = {
    campaign_no_click: 1.2,
    shallow_landing: 1.5,
    unmapped_medium: 1,
    no_medium: 0.8,
    naming_violation: 0.4,
    stale_campaign: 0.3,
  }

  const fixQueue: CampaignFixQueueItem[] = []
  const campaignQueueHref = '/admin/analytics?tab=campaigns'

  // Money we can see and cannot credit — always the top row when it exists.
  const uncreditedTotal = uncreditedClicks + unknownIdentityClicks
  if (uncreditedTotal > 0) {
    const stake = uncreditedTotal * 8
    fixQueue.push({
      issue: 'unattributed_clicks',
      label: CAMPAIGN_ISSUE_META.unattributed_clicks.label,
      target: 'Attribution integrity',
      campaign: null,
      detail: `${uncreditedTotal} affiliate click${uncreditedTotal === 1 ? '' : 's'} this period came from visitors whose entry page carried no campaign tag (${uncreditedClicks} entered untagged, ${unknownIdentityClicks} had no in-window entry at all) — the commission exists, the campaign cannot be credited.`,
      action: CAMPAIGN_ISSUE_META.unattributed_clicks.action,
      stake,
      severity: campaignSeverity(stake),
      href: '/admin/analytics?tab=affiliate',
    })
  }

  // Creator-led discovery that arrived untagged (per platform).
  for (const s of untaggedSources
    .filter((x) => x.sourceClass === 'social' && !x.internal)
    .slice(0, 3)) {
    const stake = s.views * 2
    fixQueue.push({
      issue: 'creator_unattributed',
      label: CAMPAIGN_ISSUE_META.creator_unattributed.label,
      target: s.label,
      campaign: null,
      detail: `${s.views} view${s.views === 1 ? '' : 's'} from ${s.visitors} visitor${s.visitors === 1 ? '' : 's'} arrived from ${s.label} with no campaign tag — the platform is visible, the creator is not.`,
      action: CAMPAIGN_ISSUE_META.creator_unattributed.action,
      stake,
      severity: campaignSeverity(stake),
      href: '/admin/analytics?tab=traffic',
    })
  }

  // Everything else that arrived with a referrer but no name. Self-referrals and
  // dev hosts are skipped: they are noise, not a placement anyone can tag.
  for (const s of untaggedSources
    .filter((x) => x.sourceClass !== 'social' && !x.internal)
    .slice(0, 4)) {
    const stake = s.views * 0.6
    fixQueue.push({
      issue: 'untagged_referral',
      label: CAMPAIGN_ISSUE_META.untagged_referral.label,
      target: s.label,
      campaign: null,
      detail: `${s.views} view${s.views === 1 ? '' : 's'} from ${s.sourceClass} referral(s) to ${s.label} with no utm tags.`,
      action: CAMPAIGN_ISSUE_META.untagged_referral.action,
      stake,
      severity: campaignSeverity(stake),
      href: '/admin/analytics?tab=traffic',
    })
  }

  // One row per campaign: the single most actionable problem it has, so a badly
  // tagged campaign cannot triple-count its own views in the stake total.
  for (const c of campaigns) {
    const target = `${c.campaign || '(campaign not set)'} · ${c.source || '(source not set)'} / ${c.medium || '(medium not set)'}`
    let issue: CampaignIssue | null = null
    if (c.views >= 5 && c.clicks === 0) issue = 'campaign_no_click'
    else if (c.views >= 5 && c.deepLandingPct < 50) issue = 'shallow_landing'
    else if (c.issues.includes('unmapped_medium')) issue = 'unmapped_medium'
    else if (c.issues.includes('no_medium')) issue = 'no_medium'
    else if (c.issues.some((i) => i === 'spaces' || i === 'uppercase' || i === 'underscores' || i === 'dated')) {
      issue = 'naming_violation'
    } else if (c.stale && c.views >= 3) issue = 'stale_campaign'
    if (!issue) continue

    const stake = c.views * (STAKE_WEIGHT[issue] ?? 1)
    let detail: string
    if (issue === 'campaign_no_click') {
      detail = `${c.views} views from ${c.visitors} visitors and zero affiliate clicks · landing on ${c.topLanding ? c.topLanding.kindLabel.toLowerCase() : 'an unknown page'}.`
    } else if (issue === 'shallow_landing') {
      detail = `Only ${c.deepLandingPct}% of its ${c.views} views landed on a device page, article or comparison — top landing: ${c.topLanding?.path ?? 'unknown'}.`
    } else if (issue === 'stale_campaign') {
      detail = `Last seen ${c.lastSeen ? c.lastSeen.slice(0, 10) : 'unknown'} — no traffic in the last week of the window.`
    } else if (issue === 'naming_violation') {
      detail = `Tag issues: ${c.issues.map((i) => TAG_ISSUE_META[i].label).join(', ')}.`
    } else if (issue === 'no_medium') {
      detail = `Campaign tagged with no utm_medium across ${c.views} views.`
    } else {
      detail = `Medium "${c.medium}" is outside the shared vocabulary across ${c.views} views.`
    }

    fixQueue.push({
      issue,
      label: CAMPAIGN_ISSUE_META[issue].label,
      target,
      campaign: c.campaign || null,
      detail,
      action: CAMPAIGN_ISSUE_META[issue].action,
      stake,
      severity: campaignSeverity(stake),
      href: campaignQueueHref,
    })
  }

  if (taggedViews.length === 0 && totalViews > 0) {
    fixQueue.push({
      issue: 'no_tagged_traffic',
      label: CAMPAIGN_ISSUE_META.no_tagged_traffic.label,
      target: 'All acquisition',
      campaign: null,
      detail: `0 of ${totalViews} views in this period carried a campaign tag.`,
      action: CAMPAIGN_ISSUE_META.no_tagged_traffic.action,
      stake: 25,
      severity: 'high',
      href: '/admin/analytics?tab=traffic',
    })
  }

  fixQueue.sort((a, b) => b.stake - a.stake)

  return {
    totals: {
      views: totalViews,
      visitors: visitorSet.size,
      taggedViews: taggedViews.length,
      untaggedViews: untaggedViews.length,
      directViews: directViews.length,
      tagRatePct: sharePct(taggedViews.length, totalViews, 1),
      labelledReferralPct: sharePct(untaggedViews.length, totalViews, 1),
      distinctCampaigns: campaignSet.size,
      distinctSources: sourceSet.size,
      distinctMediums: mediumSet.size,
      activeDays,
      clicks: clickRows.length,
      interactions: interactionRows.length,
      unidentifiedViews: totalViews - identifiedRows.length,
      identityCoveragePct: sharePct(identifiedRows.length, totalViews, 1),
      taggedVisitors: taggedVisitorSet.size,
      untaggedVisitors: untaggedVisitorSet.size,
      directVisitors: directVisitorSet.size,
    },
    reach: {
      trend,
      maxDaily: trend.reduce((m, t) => Math.max(m, t.total), 0),
      byClass,
      landings,
      topCampaigns: campaigns.slice(0, 12),
      untaggedSources: untaggedSources.slice(0, 12),
    },
    attribution: {
      segments,
      identifiedVisitors: rowsByVisitor.size,
      unidentifiedViews: totalViews - identifiedRows.length,
      downstreamViews,
      downstreamTaggedViews,
      tagDurabilityPct: sharePct(downstreamTaggedViews, downstreamViews, 1),
      creditedClicks,
      uncreditedClicks,
      unknownIdentityClicks,
    },
    efficiency: {
      campaigns,
      reachMedian: Math.round(reachMedian * 10) / 10,
      rateMedian: Math.round(rateMedian * 10) / 10,
      channelMix,
      complianceMix,
      gradedCampaigns: graded.length,
      cleanSharePct: sharePct(cleanViews, taggedViews.length, 1),
      bestCampaign: byRateDesc[0] ?? null,
      worstCampaign: [...graded].sort((a, b) => a.clickRatePer1k - b.clickRatePer1k)[0] ?? null,
    },
    action: {
      fixQueue: fixQueue.slice(0, 25),
      stakeTotal: Math.round(fixQueue.reduce((s, i) => s + i.stake, 0) * 10) / 10,
    },
  }
}
