import Link from 'next/link'
import {
  getTotalPageViews,
  getPageViewsOverTime, getTopPages, getTrafficSources, getDeviceTypeBreakdown,
  getTopAffiliatePages, getAffiliateCTR, getClicksByRetailer, getTopSearchQueries, getFunnelMetrics,
  getZeroReport, getTopDevices, getTopBrands, getTopContentPages, type ContentSection,
  getAudienceMetrics, getConsiderationMetrics, getCampaignMetrics, getTrustMetrics,
  getRevenueProxy, getSearchQuality,
  getQualifiedLeads, getEarningsReconciliation, getLinkHealthSummary,
  getAlertRules, computeAlertKpiValues, listAlertEvents,
  getRetentionStatus, listRetentionLog,
  runExploreQuery, listScheduledExports, getTrafficInsights, getContentInsights,
} from '@/lib/analytics/queries'
import { ROLE_ALLOWED, type TabId } from '@/lib/analytics/tabs'
import { getAdminUser } from '@/lib/admin/require-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileDown,
  Handshake,
  Heart,
  Megaphone,
  MousePointerClick,
  Plug,
  Scale,
  Search,
  Shield,
  Smartphone,
  Tag,
  Target,
  BarChart3,
} from 'lucide-react'
import PageViewsChart from './PageViewsChart'
import TrafficSourcesChart from './TrafficSourcesChart'
import DeviceTypeChart from './DeviceTypeChart'
import TrafficTrendChart from './TrafficTrendChart'
import TrafficMixChart from './TrafficMixChart'
import TrafficSourceTreeChart from './TrafficSourceTreeChart'
import TrafficFlowChart from './TrafficFlowChart'
import TrafficWeekdayChart from './TrafficWeekdayChart'
import TrafficGeoChart from './TrafficGeoChart'
import MetricInfo from './MetricInfo'
import ContentMomentumChart from './ContentMomentumChart'
import ContentAgeChart from './ContentAgeChart'
import ContentConversionScatter from './ContentConversionScatter'
import ContentLaunchChart from './ContentLaunchChart'
import ContentOpportunityList from './ContentOpportunityList'
import ContentDecayQueue from './ContentDecayQueue'
import { countryName, flagEmoji, formatHoverDate, titleCase } from './chartFormat'
import AffiliateTable from './AffiliateTable'
import FunnelStrip from './FunnelStrip'
import ZeroReportTable from './ZeroReportTable'
import TopDevicesTable from './TopDevicesTable'
import TopBrandsTable from './TopBrandsTable'
import RoadmapPanel, { type RoadmapItem } from './RoadmapPanel'
import QualifiedLeadsTable from './QualifiedLeadsTable'
import EarningsReconciliationTable from './EarningsReconciliationTable'
import LinkHealthTable from './LinkHealthTable'
import GoalsPanel from './GoalsPanel'
import RetentionPanel from './RetentionPanel'
import ExplorePanel from './ExplorePanel'
import EarningsImportCard from './EarningsImportCard'
import ScheduledExportsPanel from './ScheduledExportsPanel'
import AffiliateNetworksPanel from './AffiliateNetworksPanel'

const ROADMAP_COMPARE: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'Compare & consider funnel',
    data: 'interactions events: add_to_compare · save · watch',
    kpi: 'kpi_consideration_depth · kpi_qual_score',
  },
  {
    phase: 'Live',
    feature: 'Qualified-leads scoreboard + CSV export',
    data: 'FP-id intent score (compare=3 · save=2 · watch=1 · click=2)',
    kpi: 'High-intent audience bucket → CRM handoff',
  },
]

const ROADMAP_COMMUNITY: RoadmapItem[] = [
  {
    phase: 'Phase 2',
    feature: 'Ratings & comments volume',
    data: 'device_ratings + comments tables (created_at)',
    kpi: 'kpi_trust_coverage: % devices with ≥1 rating/comment',
  },
  {
    phase: 'Phase 3',
    feature: 'Sentiment → CTR correlation',
    data: 'content sentiment joined to affiliate clicks',
    kpi: 'Social/YouTube promotion picks per review',
  },
]

const ROADMAP_CAMPAIGNS: RoadmapItem[] = [
  {
    phase: 'Phase 2',
    feature: 'UTM-based channel mix per campaign',
    data: 'utm_source/medium/campaign capture in page_views',
    kpi: 'Campaign CTR + revenue proxy per campaign',
  },
  {
    phase: 'Phase 3',
    feature: 'Influencer & social trend tracking',
    data: 'creator-linked referrer/UTM + platform API data',
    kpi: 'Creator → click → revenue attribution',
  },
]

const ROADMAP_OUTREACH: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'High-intent audience export',
    data: 'FP-id + qualification score (compare/save/signed-in) → CSV',
    kpi: 'MQL → CRM handoff',
  },
  {
    phase: 'Phase 3',
    feature: 'Press/sponsor/media-kit inquiry funnel',
    data: 'inquiry submissions with status flow',
    kpi: 'Lead volume + status win-rate',
  },
]

const ROADMAP_GOALS: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'Rule engine + alert cron',
    data: 'analytics_alert_rules thresholds x KPI values; alert_events dedupe',
    kpi: 'Prescriptive alerts on CTR / traffic / revenue-leak / search gaps',
  },
  {
    phase: 'Live',
    feature: 'Rule lifecycle (CRUD) + role matrix',
    data: 'owner/admin manage rules; editor/viewer read-only',
    kpi: 'Self-service KPI targets without code',
  },
  {
    phase: 'Live',
    feature: 'Retention & purge policy (Kenya DPA)',
    data: 'per-table TTL in retention_policy; purge cron + admin preview/run; expunge-on-request',
    kpi: 'Governed data lifecycle + DPA accountability (audit log)',
  },
  {
    phase: 'Phase 6',
    feature: 'Weekly digest extension',
    data: 'revenue proxy + alert fires + zero-result gaps in the Monday digest',
    kpi: 'Stakeholder email with funnel + risk summary',
  },
]

const ROADMAP_EXPORT: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'Explore builder + CSV',
    data: 'GA4-style exploration over first-party data',
    kpi: 'Self-serve metric×dimension breakdowns',
  },
  {
    phase: 'Live',
    feature: 'Scheduled exports (email/Slack)',
    data: 'daily/weekly/monthly CSVs via scheduled_exports registry',
    kpi: 'Automatic report delivery without code',
  },
  {
    phase: 'Live',
    feature: 'Affiliate-network API import',
    data: 'programmatic earnings pulls (Amazon/Jumia/Kilimall APIs)',
    kpi: 'Zero-touch finance reconciliation',
  },
]

const SECTION_LABELS: Record<ContentSection, string> = {
  devices: 'Devices',
  articles: 'Articles',
  videos: 'Videos',
  compare: 'Compare',
  search: 'Search',
  other: 'Other pages',
}

function TopPagesTable({ pages }: { pages: Array<{ path: string; views: number }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-2 pr-4 font-medium">Rank</th>
            <th className="text-left py-2 pr-4 font-medium">Path</th>
            <th className="text-right py-2 font-medium">Views</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page, i) => {
            const isDevice = page.path.startsWith('/devices/')
            const isArticle = page.path.startsWith('/articles/')
            return (
              <tr key={page.path} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-4">
                  <a
                    href={page.path}
                    className={`hover:underline ${isDevice ? 'text-brand-primary' : isArticle ? 'text-amber-400' : 'text-foreground'}`}
                  >
                    {page.path}
                  </a>
                </td>
                <td className="py-2 text-right">{page.views.toLocaleString()}</td>
              </tr>
            )
          })}
          {pages.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-muted-foreground">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string; metric?: string; dimension?: string }>
}) {
  const { period: rawPeriod, tab: rawTab, metric: rawMetric, dimension: rawDimension } = await searchParams
  const period = ['7d', '30d', '90d'].includes(rawPeriod ?? '') ? (rawPeriod as string) : '30d'
  const exploreMetric = ['views', 'unique_visitors', 'clicks', 'revenue_proxy', 'saves', 'add_to_compare', 'watches', 'related_clicks'].includes(rawMetric ?? '') ? (rawMetric as string) : 'views'
  const exploreDimension = ['date', 'path', 'device', 'retailer', 'source_medium', 'section', 'action'].includes(rawDimension ?? '') ? (rawDimension as string) : 'path'

  // Role-scoped surfaces — enforced here, so the tab bar only ever shows what the role may see
  const adminUser = await getAdminUser()
  const role = adminUser?.role ?? 'viewer'
  const allowedTabs = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.viewer
  const activeTab: TabId = allowedTabs.includes(rawTab as TabId) ? (rawTab as TabId) : 'overview'

  const [
    totalViews,
 viewsOverTime, topPages, trafficSources, deviceTypes, topAffiliate, affiliateCTR, clicksByRetailer,
 searchQueries, funnel, zeroReport, topDevices, topBrands, topContentPages,
    audience, consideration, campaignRows, trust, revenueProxy, searchQuality,
    qualifiedLeads, earningsRecon, linkHealth,
  ] = await Promise.all([
    getTotalPageViews(period),
    getPageViewsOverTime(period),
    getTopPages(period, 20),
    getTrafficSources(period),
    getDeviceTypeBreakdown(period),
    getTopAffiliatePages(period, 20),
    getAffiliateCTR(period),
    getClicksByRetailer(period),
    getTopSearchQueries(20),
    getFunnelMetrics(period),
    getZeroReport(period, 10),
    getTopDevices(period, 20),
    getTopBrands(period, 15),
    getTopContentPages(period, 150),
    getAudienceMetrics(period),
    getConsiderationMetrics(period),
    getCampaignMetrics(period),
    getTrustMetrics(period),
    getRevenueProxy(period),
    getSearchQuality(period, 10),
    getQualifiedLeads(period, 25),
    getEarningsReconciliation(period),
    getLinkHealthSummary(10),
  ])

  // Goals & Alerts data is heavier (KPI matrix for the rule engine) - only
  // evaluated when the tab is open.
  let alertRules: Awaited<ReturnType<typeof getAlertRules>> = []
  let alertKpiValues: Record<string, number> = {}
  let alertEvents: Awaited<ReturnType<typeof listAlertEvents>> = []
  let retentionStatus: Awaited<ReturnType<typeof getRetentionStatus>> = []
  let retentionLog: Awaited<ReturnType<typeof listRetentionLog>> = []
  if (activeTab === 'goals' && allowedTabs.includes('goals')) {
    alertRules = await getAlertRules()
    alertKpiValues = await computeAlertKpiValues(period)
    alertEvents = await listAlertEvents(25)
    retentionStatus = await getRetentionStatus()
    retentionLog = await listRetentionLog(10)
  }

  // Explore + scheduled exports are only loaded when their tab is open
  let exploreResult: Awaited<ReturnType<typeof runExploreQuery>> | null = null
  if (activeTab === 'explore' && allowedTabs.includes('explore')) {
    exploreResult = await runExploreQuery({ metric: exploreMetric, dimension: exploreDimension, period, limit: 25 })
  }
  let scheduledExports: Awaited<ReturnType<typeof listScheduledExports>> = []
  if (activeTab === 'export' && allowedTabs.includes('export')) {
    scheduledExports = await listScheduledExports()
  }

  // Traffic & Audience deep-dive is built from the daily materialised view +
  // the raw geo column, so it is only loaded when the tab is open.
  let trafficInsights: Awaited<ReturnType<typeof getTrafficInsights>> | null = null
  if (activeTab === 'traffic' && allowedTabs.includes('traffic')) {
    trafficInsights = await getTrafficInsights(period)
  }

  // Insight chips for the Traffic tab header banner
  const trafficChips: Array<{ label: string; value: string }> = []
  if (trafficInsights) {
    if (trafficInsights.topSource) {
      trafficChips.push({
        label: 'Top channel',
        value: `${titleCase(trafficInsights.topSource)} · ${trafficInsights.topSourceShare}%`,
      })
    }
    if (trafficInsights.topPlatform) {
      trafficChips.push({ label: 'Top platform', value: titleCase(trafficInsights.topPlatform) })
    }
    if (trafficInsights.peakDay) {
      trafficChips.push({ label: 'Peak day', value: trafficInsights.peakDay })
    }
    if (trafficInsights.lateVsEarlyPct !== null) {
      const delta = trafficInsights.lateVsEarlyPct
      trafficChips.push({
        label: '2nd half vs 1st half',
        value: `${delta > 0 ? '+' : ''}${delta}%`,
      })
    }
    if (trafficInsights.geoTop) {
      trafficChips.push({
        label: 'Top region',
        value: `${flagEmoji(trafficInsights.geoTop.code)} ${countryName(trafficInsights.geoTop.code)}`,
      })
    }
  }

  // Content & SEO analytics are catalog-aware and only needed when the tab is open.
  let contentInsights: Awaited<ReturnType<typeof getContentInsights>> | null = null
  if (activeTab === 'content' && allowedTabs.includes('content')) {
    contentInsights = await getContentInsights(period)
  }

  // Insight chips for the Content & SEO tab header banner
  const contentChips: Array<{ label: string; value: string }> = []
  if (contentInsights) {
    if (contentInsights.topSection) {
      const label = SECTION_LABELS[contentInsights.topSection as ContentSection] ?? titleCase(contentInsights.topSection)
      contentChips.push({ label: 'Top section', value: `${label} · ${contentInsights.topSectionPct}%` })
    }
    if (contentInsights.ctrLeader) {
      contentChips.push({
        label: 'CTR leader',
        value: `${contentInsights.ctrLeader.path} · ${contentInsights.ctrLeader.ctr}%`,
      })
    }
    if (contentInsights.zeroResultCount > 0) {
      contentChips.push({ label: 'Content gaps', value: `${contentInsights.zeroResultCount} missed searches` })
    }
    if (contentInsights.decayQueueCount > 0) {
      contentChips.push({ label: 'Cold content', value: `${contentInsights.decayQueueCount} pieces to refresh` })
    }
  }

  // Content & SEO: group top pages by section( top 5 per section)
  const contentBySection = new Map<ContentSection, Array<{ path: string; section: ContentSection; views: number }>>()
  for (const section of Object.keys(SECTION_LABELS) as ContentSection[]) {

    const sectionRows = topContentPages.filter((p) => p.section === section)
    contentBySection.set(section, sectionRows.slice(0, 5))
  }

  const csvLinks = [
    { href: `/api/admin/export/top-pages?period=${period}`, label: 'Top Pages CSV' },
    { href: `/api/admin/export/affiliate-clicks?period=${period}`, label: 'Affiliate Clicks CSV' },
    { href: `/api/admin/export/qualified-leads?period=${period}`, label: 'Qualified Leads CSV' },
    { href: `/api/admin/export/earnings-reconciliation?period=${period}`, label: 'Earnings Recon CSV' },
    { href: `/api/admin/export/link-health?period=${period}`, label: 'Link Health CSV' },
  ]

  return (
    <div>
      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sales &amp; marketing funnel — views → device pages → affiliate clicks
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <Link key={p} href={`/admin/analytics?period=${p}&tab=${activeTab}`}>
              <Button
                variant={period === p ? 'default' : 'outline'}
                className={period === p ? 'bg-brand-primary' : 'border-border text-muted-foreground'}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── PANELS ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <FunnelStrip
            totalViews={funnel.totalViews}
            deviceViews={funnel.deviceViews}
            clicks={funnel.clicks}
            deviceToClickRate={funnel.deviceToClickRate}
          />

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{audience.uniqueVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Distinct first-party visitors (FP-id)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Return Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{audience.returnRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Repeat page views vs new visitors</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Consideration Events</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{consideration.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {consideration.saves} saved · {consideration.addToCompare} compared · {consideration.watches} watched
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Proxy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{revenueProxy.weightedClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Commission-weighted clicks (clicks × rate)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-amber-400" />
                Revenue Leakage — Top devices with zero affiliate clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ZeroReportTable data={zeroReport} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <PageViewsChart data={viewsOverTime} />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <TrafficSourcesChart data={trafficSources} totalViews={totalViews} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceTypeChart data={deviceTypes} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <TopPagesTable pages={topPages.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'traffic' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{(trafficInsights?.totalViews ?? totalViews).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{audience.uniqueVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Distinct first-party visitors (FP-id)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Return Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{audience.returnRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Repeat page views vs new visitors</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg Views / Day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{(trafficInsights?.avgPerDay ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Rolling average across the period</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Trend with signal ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Trend</CardTitle>
              <CardDescription>Daily views with a rolling average — hover any point for the full date</CardDescription>
            </CardHeader>
            <CardContent>
              <TrafficTrendChart data={trafficInsights?.trend ?? []} />
            </CardContent>
          </Card>

          {/* ── Insight banner ─────────────────────────────────────── */}
          {trafficInsights && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {trafficChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">{chip.label}:</span>
                    <span className="font-semibold text-foreground">{chip.value}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Data source:{' '}
                <span className="font-medium text-foreground">
                  {trafficInsights.source === 'daily_page_view_summary'
                    ? 'daily_page_view_summary (aggregated by cron)'
                    : 'page_views (raw — aggregator not yet run)'}
                </span>
                {trafficInsights.latestDay
                  ? ` · latest data through ${formatHoverDate(trafficInsights.latestDay)}`
                  : ' · no views recorded in this period yet'}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Mix Over Time</CardTitle>
                <CardDescription>How the source mix shifts day by day — not just the period total</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficMixChart data={trafficInsights?.mix ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sources &amp; Platforms</CardTitle>
                <CardDescription>Space-filling share — coloured by channel, blocks are platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficSourceTreeChart data={trafficInsights?.tree ?? []} />
              </CardContent>
            </Card>
          </div>

          {/* ── Source → content flow ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Where Traffic Lands</CardTitle>
              <CardDescription>Source → content section. Direct &amp; referral traffic mostly shop; social steers to video</CardDescription>
            </CardHeader>
            <CardContent>
              <TrafficFlowChart data={trafficInsights?.flow ?? { nodes: [], links: [] }} />
            </CardContent>
          </Card>

          {/* ── Weekly rhythm + geography ───────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Rhythm</CardTitle>
                <CardDescription>When your audience shows up — peak day highlighted</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficWeekdayChart data={trafficInsights?.weekday ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>First-party geo from Vercel headers</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficGeoChart data={trafficInsights?.geo ?? []} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Pages</CardTitle>
              <Link href={`/api/admin/export/top-pages?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <TopPagesTable pages={topPages} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* ── Insight banner ─────────────────────────────────────── */}
          {contentInsights && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {contentChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">{chip.label}:</span>
                    <span className="font-semibold text-foreground">{chip.value}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Data sources:{' '}
                <span className="font-medium text-foreground">
                  page_views · device/article/video catalog · search_queries
                </span>
                <span className="ml-1">
                  — catalog-aware: audience demand mapped to the sections an editor actually manages.
                </span>
              </p>
            </div>
          )}

          {/* ── Content KPI strip ───────────────────────────────────── */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Total Views</CardTitle>
                <MetricInfo
                  metric="Total Views (kpi_views)"
                  definition="All page views captured in the selected period, bucketed by content section so you see where the audience spends its time."
                  formula="count(page_views)"
                  ga4Alias="pageviews"
                  dataSource="page_views"
                  action="Healthy trending sections are where to double down; a flat one despite publishing is the first decay signal."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{(contentInsights?.totalViews ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Published Pieces</CardTitle>
                <MetricInfo
                  metric="Published pieces"
                  definition="Live articles, devices and videos in the catalog — the content portfolio that backs your traffic."
                  formula="count(published articles + devices + videos)"
                  dataSource="articles · devices · videos"
                  action="Compare against Total Views to see output per piece — the real editorial productivity metric."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{(contentInsights?.totalPublishedPieces ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">articles · devices · videos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">CTR Leader</CardTitle>
                <MetricInfo
                  metric="Buy-link CTR leader"
                  definition="The device page converting views into affiliate clicks at the highest rate this period — your best-performing content at earning."
                  formula="clicks ÷ views × 100"
                  ga4Alias="outbound click rate"
                  dataSource="page_views × affiliate_clicks"
                  action="Study what this page does right (buy-box placement, offer framing) and replicate it across the catalog."
                />
              </CardHeader>
              <CardContent>
                {contentInsights?.ctrLeader ? (
                  <>
                    <p className="truncate text-lg font-bold text-foreground">{contentInsights.ctrLeader.path}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {contentInsights.ctrLeader.ctr}% CTR · {contentInsights.ctrLeader.views.toLocaleString()} views
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-bold text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Content Gaps</CardTitle>
                <MetricInfo
                  metric="Zero-result searches"
                  definition="First-party search queries that returned nothing — search demand nobody who's searching can satisfy. This is the editorial backlog input."
                  formula="count(zero_result search_queries)"
                  ga4Alias="search lost (GSC)"
                  dataSource="search_queries"
                  action="Prioritise the highest-count queries — writing one guide/device page effectively captures that demand."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{(contentInsights?.zeroResultCount ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">missed searches this period</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Momentum heatmap ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Content Momentum
                <MetricInfo
                  metric="Content momentum heatmap"
                  definition="Views per content section over each weekly bucket. Rows are the editorial sections you manage; hotter cells mean that section is pulling traffic that week."
                  formula="Σ views per section per period bucket"
                  dataSource="page_views (classified by path prefix)"
                  action="Spot where momentum is building or fading week-over-week — and time your publishing/promotion accordingly."
                />
              </CardTitle>
              <CardDescription>
                How audience attention shifts across sections each week — intensity = view volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentMomentumChart data={contentInsights?.momentum ?? []} />
            </CardContent>
          </Card>

          {/* ── Content age · decay + conversion scatter ────────────── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Content Age &amp; Decay
                  <MetricInfo
                    metric="Age-bucket distribution + decay queue"
                    definition="Where your traffic sits along the content lifecycle. Fresh content (0–30d) pays off immediately; older buckets show whether you've built evergreen assets. Pieces with zero period views form the decay queue."
                    formula="content age = today − published_at"
                    ga4Alias="— (GA has no content-age axis)"
                    dataSource="page_views × articles/devices/videos published_at"
                    action="If a bucket older than 180d holds most of your views, that's evergreen proof — invest in refresh of quiet pieces before writing brand new ones."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContentAgeChart data={contentInsights?.ageBuckets ?? []} />
                <div className="mt-4 rounded-lg border border-border bg-background/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Decay queue — refresh candidates</p>
                  <ContentDecayQueue data={contentInsights?.decayQueue ?? []} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Conversion Map
                  <MetricInfo
                    metric="Device conversion map"
                    definition="Every device page plotted by view volume (X) and click-through rate to affiliate buy-links (Y). Points in the upper-right are both popular and persuasive — your content heroes."
                    formula="CTR = affiliate clicks ÷ device views × 100"
                    ga4Alias="outbound click rate"
                    dataSource="page_views × affiliate_clicks × devices"
                    action="Invest in the upper-right; diagnostic the high-views low-CTR cluster (lagging offers or buried buy-boxes)."
                  />
                </CardTitle>
                <CardDescription>Views vs buy-link CTR — size of interest, rate of conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <ContentConversionScatter data={topDevices} />
              </CardContent>
            </Card>
          </div>

          {/* ── Launch velocity ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Launch Velocity
                <MetricInfo
                  metric="Content→conversion velocity"
                  definition="Cumulative views of your five newest published pieces, day-by-day, up to their first 30 days. Shows how fast a new review or guide starts earning attention."
                  formula="Σ views per piece by days-since-publish"
                  dataSource="page_views × articles/devices published_at"
                  action="A piece that stays flat after 7 days was either misfit or under-promoted — distinct from the decay of old content."
                />
              </CardTitle>
              <CardDescription>
                How quickly new pieces ramp — the north-star &quot;content→conversion velocity&quot; from the spec
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentLaunchChart data={contentInsights?.launch ?? []} />
            </CardContent>
          </Card>

          {/* ── Opportunity backlog + top pages by section ──────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Content Opportunity Backlog
                <MetricInfo
                  metric="Zero-result content backlog"
                  definition="First-party searches that found nothing. These are proven editorial gaps feeding the content calendar (per the analytics spec: zero-result backlog feeds the editorial roadmap)."
                  formula="count(zero_result search_queries)"
                  ga4Alias="sc lost (GSC)"
                  dataSource="search_queries"
                  action="Write for the loudest gaps first — each listed query is a ready-made title."
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContentOpportunityList data={contentInsights?.zeroResult ?? []} total={contentInsights?.zeroResultCount ?? 0} />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(Object.keys(SECTION_LABELS) as ContentSection[]).map((section) => {
              const rows = contentBySection.get(section) ?? []
              return (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-primary" />
                      {SECTION_LABELS[section]}
                      <MetricInfo
                        metric={`${SECTION_LABELS[section]} section`}
                        definition={`Top pages in the ${SECTION_LABELS[section]} section by views in the selected period — the editorial drill-down of where this section's traffic concentrates.`}
                        formula="Σ views per /(match) path"
                        ga4Alias="pageviews by path"
                        dataSource="page_views (path-classified)"
                        action={`Promote the ${SECTION_LABELS[section]} leaders harder; pair quiet high-views pages with strong buy-links or fresh internal links.`}
                        componentLabel={`Section · ${section}`}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">No data</p>
                    ) : (
                      <ul className="space-y-3">
                        {rows.map((row) => (
                          <li key={row.path}>
                            <a href={row.path} className="text-sm text-brand-primary hover:underline block truncate">
                              {row.path}
                            </a>
                            <span className="text-xs text-muted-foreground">
                              {row.views.toLocaleString()} views
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-primary" />
                Top Devices by Page Views (with affiliate CTR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopDevicesTable data={topDevices} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-brand-primary" />
                Top Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopBrandsTable data={topBrands} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-amber-400" />
                Top Affiliate Pages（ by retailer）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium">Device</th>
                      <th className="text-left py-2 pr-4 font-medium">Retailer</th>
                      <th className="text-right py-2 font-medium">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAffiliate.map((row, i) => (
                      <tr key={`${row.deviceSlug}-${row.retailer}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 text-brand-primary">{row.deviceSlug}</td>
                        <td className="py-2 pr-4 text-muted-foreground capitalize">{row.retailer}</td>
                        <td className="py-2 text-right text-foreground">{row.clicks.toLocaleString()}</td>
                      </tr>
                    ))}
                    {topAffiliate.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">No click data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-400" />
                Buy-Link Health — Distribution Governance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkHealthTable summary={linkHealth.summary} brokenLinks={linkHealth.brokenLinks} />
              <p className="text-muted-foreground text-xs mt-3">
                Fed by the daily link-health cron (HEAD-checks every outbound buy link). Broken links
                leak revenue — fix them to keep the buy funnel healthy.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'affiliate' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-amber-400" />
                Affiliate CTR by Device
              </CardTitle>
              <Link href={`/api/admin/export/affiliate-clicks?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium">Device</th>
                      <th className="text-left py-2 pr-4 font-medium">Retailer</th>
                      <th className="text-right py-2 pr-4 font-medium">Clicks</th>
                      <th className="text-right py-2 pr-4 font-medium">Views</th>
                      <th className="text-right py-2 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AffiliateTable data={affiliateCTR} />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-brand-primary" />
                Clicks by Retailer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clicksByRetailer.map((item) => {
                  const maxClicks = clicksByRetailer.length > 0 ? clicksByRetailer[0].clicks : 1
                  const barWidth = Math.round((item.clicks / maxClicks) * 100)
                  return (
                    <div key={item.retailer} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-muted-foreground capitalize">{item.retailer}</span>
                      <div className="flex-1 bg-foreground/10 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-brand-primary h-full rounded-full flex items-center px-2 text-xs text-white font-medium"
                          style={{ width: `${Math.max(barWidth, 5)}%` }}
                        >
                          {item.clicks.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {clicksByRetailer.length === 0 && (
                  <p className="text-muted-foreground text-sm">No click data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" />
                Revenue Proxy — Commission-Weighted Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Estimated commission-weighted clicks (<span className="text-foreground font-medium">{revenueProxy.weightedClicks.toLocaleString()}</span> total)
                = clicks × each retailer's commission rate (seeded in affiliate_commission_rates). Pairs with real
                commission under Finance reconciliation (Phase 3).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Retailer</th>
                      <th className="text-right py-2 pr-4 font-medium">Clicks</th>
                      <th className="text-right py-2 pr-4 font-medium">Rate</th>
                      <th className="text-right py-2 font-medium">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueProxy.byRetailer.map((r) => (
                      <tr key={r.retailer} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-foreground capitalize">{r.retailer}</td>
                        <td className="py-2 pr-4 text-right">{r.clicks.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right">{Math.round(r.rate * 100 * 100) / 100}%</td>
                        <td className="py-2 text-right font-medium">{r.weighted.toLocaleString()}</td>
                      </tr>
                    ))}
                    {revenueProxy.byRetailer.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">No clicks in period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-400" />
                Earnings Reconciliation — Proxy vs Actual (Finance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EarningsReconciliationTable data={earningsRecon} />
              <p className="text-muted-foreground text-xs mt-3">
                Estimated commission-weighted clicks vs real earnings imported from affiliate networks
                (Amazon Associates, Jumia, Kilimall). A positive variance means the proxy over-counts
                — reconcile monthly before VAT/payout export.
              </p>
            </CardContent>
          </Card>

          <EarningsImportCard canManage={role === 'owner' || role === 'admin'} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-brand-primary" />
                Affiliate Network API Connectors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AffiliateNetworksPanel canManage={role === 'owner' || role === 'admin'} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-brand-primary" />
                Top Internal Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium">Query</th>
                      <th className="text-right py-2 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchQueries.map((q, i) => (
                      <tr key={q.query} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 text-foreground">{q.query}</td>
                        <td className="py-2 text-right">{q.count.toLocaleString()}</td>
                      </tr>
                    ))}
                    {searchQueries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">No search data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Average results per query: <span className="text-foreground font-medium">{searchQuality.avgResults}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-red-500" />
                Zero-Result Searches (Content Backlog)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium">Query</th>
                      <th className="text-right py-2 font-medium">Misses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchQuality.zeroResult.map((q, i) => (
                      <tr key={q.query} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 text-foreground">&quot;{q.query}&quot;</td>
                        <td className="py-2 text-right">{q.count.toLocaleString()}</td>
                      </tr>
                    ))}
                    {searchQuality.zeroResult.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                          No zero-result searches in period — the catalog is matching demand
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Every zero-result query is a content opportunity — turn these into articles, devices or buying guides.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" />
                Consideration Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{consideration.saves.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Saved items</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{consideration.addToCompare.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Add to compare</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{consideration.watches.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Video reviews watched</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{consideration.relatedClicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Related-device clicks</p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-4">
                Qualification intent per visitor (save · compare · watch) is the MQL signal. Weighted
                scores (compare=3 · save=2 · watch=1 · related=1 · affiliate click=2) bucket visitors
                into hot / warm / cold tiers for the high-intent export.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                High-Intent Audience — Qualification Scoreboard
              </CardTitle>
              <Link href={`/api/admin/export/qualified-leads?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> Qualified Leads CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <QualifiedLeadsTable data={qualifiedLeads} />
              <p className="text-muted-foreground text-xs mt-3">
                Hot tier = strong purchase intent (compare + save + clicks). Export to CSVs for CRM
                onboarding / retargeting — the first-party audience asset GA can't give you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-400" />
                Most Considered Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 font-medium">Device</th>
                      <th className="text-right py-2 font-medium">Intent events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consideration.topDevices.map((d, i) => (
                      <tr key={d.deviceSlug} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 text-brand-primary">{d.deviceSlug}</td>
                        <td className="py-2 text-right">{d.count.toLocaleString()}</td>
                      </tr>
                    ))}
                    {consideration.topDevices.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                          No intent events yet — the beacon collects them as users save, compare and watch reviews
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" />
                Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoadmapPanel items={ROADMAP_COMPARE} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'community' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-primary" />
                Trust Coverage — Social Proof Across the Catalog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-3xl font-bold text-foreground">{trust.coveragePct}%</p>
                  <p className="text-xs text-muted-foreground">Devices with ≥1 rating or comment</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-3xl font-bold text-foreground">{trust.coveredDevices} / {trust.totalDevices}</p>
                  <p className="text-xs text-muted-foreground">Covered / published devices</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-3xl font-bold text-foreground">
                    {trust.ratedDevices}
                  </p>
                  <p className="text-xs text-muted-foreground">Rated · {trust.commentedDevices} commented</p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-4">
                Trust is a revenue asset: devices with social proof convert better. Coverage below 100% is the
                editorial review backlog — which devices need a rating or comment next.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-primary" />
                Sentiment Analytics — Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoadmapPanel items={ROADMAP_COMMUNITY} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand-primary" />
                UTM Campaign Channel Mix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Source</th>
                      <th className="text-left py-2 pr-4 font-medium">Medium</th>
                      <th className="text-left py-2 pr-4 font-medium">Campaign</th>
                      <th className="text-right py-2 pr-4 font-medium">Views</th>
                      <th className="text-right py-2 font-medium">Affiliate Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignRows.map((c) => (
                      <tr key={`${c.source}::${c.medium}::${c.campaign}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
                        <td className="py-2 pr-4 text-foreground">{c.source}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.medium || '—'}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.campaign || '—'}</td>
                        <td className="py-2 pr-4 text-right">{c.views.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.clicks.toLocaleString()}</td>
                      </tr>
                    ))}
                    {campaignRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">
                          No UTM-tagged traffic yet — share links with utm_source / utm_medium / utm_campaign
                          to see channel performance
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand-primary" />
                Creator & Influencer Attribution — Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoadmapPanel items={ROADMAP_CAMPAIGNS} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'outreach' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-brand-primary" />
                Outreach &amp; Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoadmapPanel items={ROADMAP_OUTREACH} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          <GoalsPanel
            rules={alertRules}
            values={alertKpiValues}
            events={alertEvents}
            canManage={role === 'owner' || role === 'admin'}
          />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-primary" />
                Data Retention &amp; Privacy (Kenya DPA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RetentionPanel
                status={retentionStatus}
                log={retentionLog}
                canManage={role === 'owner' || role === 'admin'}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-primary" />
                Automation Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoadmapPanel items={ROADMAP_GOALS} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5 text-brand-primary" />
                Available CSV Exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {csvLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                      <Download className="h-4 w-4 mr-1" /> {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API &amp; Scheduled Exports（ Phase 3）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoadmapPanel items={ROADMAP_EXPORT} />
          </CardContent>
        </Card>

        <ScheduledExportsPanel canManage={role === 'owner' || role === 'admin'} />
        </div>
      )}

      {activeTab === 'explore' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-primary" />
                Explore — Build your own breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                GA4-style custom exploration over first-party data. Pick a metric and a breakdown —
                the report adapts automatically. Download any result as CSV.
              </p>
              {exploreResult && (
                <ExplorePanel
                  result={exploreResult}
                  metric={exploreMetric}
                  dimension={exploreDimension}
                  period={period}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}