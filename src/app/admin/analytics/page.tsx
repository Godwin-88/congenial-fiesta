import Link from 'next/link'
import {
  getTotalPageViews,
  getPageViewsOverTime, getTopPages, getTrafficSources, getDeviceTypeBreakdown,
  getTopAffiliatePages, getAffiliateCTR, getClicksByRetailer, getTopSearchQueries, getFunnelMetrics,
  getZeroReport, getTopDevices, getTopContentPages, type ContentSection,
  getAudienceMetrics, getConsiderationMetrics, getCampaignMetrics, getTrustMetrics,
  getRevenueProxy, getSearchQuality,
  getQualifiedLeads, getEarningsReconciliation, getLinkHealthSummary,
  getAlertRules, computeAlertKpiValues, listAlertEvents,
  getRetentionStatus, listRetentionLog,
  runExploreQuery, listScheduledExports, getTrafficInsights, getContentInsights, getDeviceInsights,
  getConsiderationInsights, getCommunityInsights,
} from '@/lib/analytics/queries'
import { ROLE_ALLOWED, type TabId } from '@/lib/analytics/tabs'
import { getAdminUser } from '@/lib/admin/require-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Boxes,
  Download,
  FileDown,
  Gauge,
  Handshake,
  Heart,
  Layers,
  Link2Off,
  Megaphone,
  MousePointerClick,
  Plug,
  Route,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Smartphone,
  Store,
  Tag,
  Target,
  TrendingUp,
  Wallet,
  Wrench,
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
import SectionHeading from './SectionHeading'
import BuyLinkFillGauge from './BuyLinkFillGauge'
import CatalogReadinessChecklist from './CatalogReadinessChecklist'
import RetailerCoverageMatrix from './RetailerCoverageMatrix'
import RetailerTaxonomyTable from './RetailerTaxonomyTable'
import CatalogConcentrationChart from './CatalogConcentrationChart'
import DeviceDemandHeatmap from './DeviceDemandHeatmap'
import DeviceDemandFlowChart from './DeviceDemandFlowChart'
import DeviceOutcomeSplit from './DeviceOutcomeSplit'
import DemandBreakdownTables from './DemandBreakdownTables'
import CatalogFixQueue from './CatalogFixQueue'
import OrphanDemandTable from './OrphanDemandTable'
import CatalogPerformanceTable from './CatalogPerformanceTable'
import ConsiderationFunnelGauge from './ConsiderationFunnelGauge'
import IntentMomentumChart from './IntentMomentumChart'
import QualificationThermometer from './QualificationThermometer'
import ComparePairChord from './ComparePairChord'
import ConsiderationDepthTable from './ConsiderationDepthTable'
import ConsiderationFixQueue from './ConsiderationFixQueue'
import TrustHealthBand from './TrustHealthBand'
import VoiceMomentumChart from './VoiceMomentumChart'
import RatingHistogram from './RatingHistogram'
import DiscussionTable from './DiscussionTable'
import ContributorRoster from './ContributorRoster'
import CommunityFixQueue from './CommunityFixQueue'
import { deviceChipsFor, considerationChipsFor, communityChipsFor, tierBadgeClass, tierLabel, TierDot } from './ConsiderationTabHelpers'
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
  const exploreMetric = ['views', 'unique_visitors', 'clicks', 'revenue_proxy', 'saves', 'add_to_compare', 'watches', 'related_clicks', 'intent_score'].includes(rawMetric ?? '') ? (rawMetric as string) : 'views'
  const exploreDimension = ['date', 'path', 'device', 'price_tier', 'category', 'retailer', 'source_medium', 'section', 'action', 'qualification_tier'].includes(rawDimension ?? '') ? (rawDimension as string) : 'path'

  // Role-scoped surfaces — enforced here, so the tab bar only ever shows what the role may see
  const adminUser = await getAdminUser()
  const role = adminUser?.role ?? 'viewer'
  const allowedTabs = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.viewer
  const activeTab: TabId = allowedTabs.includes(rawTab as TabId) ? (rawTab as TabId) : 'overview'

  const [
    totalViews,
 viewsOverTime, topPages, trafficSources, deviceTypes, topAffiliate, affiliateCTR, clicksByRetailer,
 searchQueries, funnel, zeroReport, topDevices, topContentPages,
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

  // Devices & Catalog analytics join the catalog itself to the audience, so the
  // whole tab hangs off one aggregator (same discipline as Traffic/Content).
  let deviceInsights: Awaited<ReturnType<typeof getDeviceInsights>> | null = null
  if (activeTab === 'devices' && allowedTabs.includes('devices')) {
    deviceInsights = await getDeviceInsights(period)
  }
  const deviceChips = deviceInsights ? deviceChipsFor(deviceInsights) : []

  // Compare & Consideration analytics join intent to traffic + catalog, so the
  // whole tab hangs off one aggregator (same discipline as Devices).
  let considerationInsights: Awaited<ReturnType<typeof getConsiderationInsights>> | null = null
  if (activeTab === 'compare' && allowedTabs.includes('compare')) {
    considerationInsights = await getConsiderationInsights(period)
  }
  const compareChips = considerationInsights ? considerationChipsFor(considerationInsights) : []

  // Community & Engagement analytics join social proof to traffic, so the
  // whole tab hangs off one aggregator (same discipline as Compare).
  let communityInsights: Awaited<ReturnType<typeof getCommunityInsights>> | null = null
  if (activeTab === 'community' && allowedTabs.includes('community')) {
    communityInsights = await getCommunityInsights(period)
  }
  const communityChips = communityInsights ? communityChipsFor(communityInsights) : []

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
          {/* ── Insight banner ─────────────────────────────────────── */}
          {deviceInsights && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {deviceChips.map((chip) => (
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
                  devices · brands · device_types · page_views · affiliate_clicks · interactions · link_health_checks ·
                  affiliate_commission_rates
                </span>
                <span className="ml-1">
                  — catalog-aware: every visual joins the catalog you maintain to the audience you already record, so the
                  tab reads as coverage → demand → leakage → action.
                </span>
              </p>
            </div>
          )}

          {/* ══ A · COVERAGE — can this catalog earn at all? ══════════ */}
          <SectionHeading
            letter="A"
            title="Coverage — can this catalog earn at all?"
            hint="kpi_buy_fill · catalog readiness"
          />
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Buy-Link Fill Rate</CardTitle>
                <MetricInfo
                  metric="Buy-link fill rate (kpi_buy_fill)"
                  definition="Share of published devices that carry at least one valid retailer buy link. A published page without a buy link can never earn, no matter how much traffic it attracts."
                  formula="count(published devices with ≥1 buy link) / count(published devices)"
                  ga4Alias="— (catalog KPI, not in GA4)"
                  dataSource="devices.buy_links (published rows)"
                  action="Target ≥80%. Every listed device without a link is a page you are hosting and promoting for free."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {(deviceInsights?.catalog.fillRatePct ?? 0).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceInsights?.catalog.withBuyLink ?? 0} of {deviceInsights?.catalog.published ?? 0} published ·{' '}
                  {deviceInsights?.catalog.withoutBuyLink ?? 0} missing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Monetised View Share</CardTitle>
                <MetricInfo
                  metric="Monetised view share"
                  definition="Of every device-page view in the period, the share that landed on a published page with a working buy link — a view that could actually convert."
                  formula="views(monetised pages) / views(all device pages)"
                  ga4Alias="— (catalog-aware, not in GA4)"
                  dataSource="page_views × devices (status + buy_links)"
                  action="Raising this is a content-ops job, not a traffic job: it moves when you fix the pages you already rank for."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{deviceInsights?.leakage.monetisedSharePct ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceInsights?.leakage.monetisedViews.toLocaleString() ?? 0} of{' '}
                  {deviceInsights?.demand.totals.deviceViews.toLocaleString() ?? 0} device views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Catalog Reach</CardTitle>
                <MetricInfo
                  metric="Catalog reach (visited vs total)"
                  definition="How much of the catalog was actually seen in the period: devices that earned at least one view, against every device in the catalog including drafts."
                  formula="count(devices with ≥1 view) / count(all devices)"
                  dataSource="devices × page_views"
                  action="A low reach with a high publish count means the catalog is being written but not linked or indexed."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {deviceInsights?.demand.totals.devicesWithViews ?? 0}
                  <span className="text-base font-normal text-muted-foreground">
                    /{deviceInsights?.demand.deviceRows.length ?? 0}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceInsights?.demand.totals.publishedWithoutViews ?? 0} published pages got zero views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Wasted Views</CardTitle>
                <MetricInfo
                  metric="Wasted (ghost) views"
                  definition="Device-page views that could not earn anything: the page was unpublished (so it 404'd) or the slug matched no catalog row at all."
                  formula="views(unpublished) + views(stale slugs)"
                  dataSource="page_views × devices.status"
                  action="The cheapest wins on the site — the traffic already exists, only the catalog entry is missing."
                />
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${
                    (deviceInsights?.leakage.wastedViews ?? 0) > 0 ? 'text-amber-400' : 'text-foreground'
                  }`}
                >
                  {(deviceInsights?.leakage.wastedViews ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceInsights?.leakage.wastedPct ?? 0}% of device views ·{' '}
                  {deviceInsights?.leakage.orphanPaths.length ?? 0} dead paths
                </p>
              </CardContent>
            </Card>
          </div>
          {/* ── Coverage instruments ──────────────────────────────── */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-brand-primary" />
                  Buy-Link Fill Instrument
                  <MetricInfo
                    metric="kpi_buy_fill instrument"
                    definition="The fill rate as a gauge against an 80% operating target, with the distribution of links per published device underneath. One link is the floor; 2–3 lets the buy box show competing prices."
                    formula="covered / published vs 80% target · histogram of links per device"
                    dataSource="devices.buy_links"
                    action="Work the 'No link' bucket first (it is ranked in the fix queue below), then give single-link devices a second retailer for price competition."
                  />
                </CardTitle>
                <CardDescription>How many published pages can actually take money today</CardDescription>
              </CardHeader>
              <CardContent>
                <BuyLinkFillGauge
                  fillRatePct={deviceInsights?.catalog.fillRatePct ?? 0}
                  published={deviceInsights?.catalog.published ?? 0}
                  withBuyLink={deviceInsights?.catalog.withBuyLink ?? 0}
                  withoutBuyLink={deviceInsights?.catalog.withoutBuyLink ?? 0}
                  buckets={deviceInsights?.catalog.linkCountBuckets ?? []}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand-primary" />
                  Catalog Readiness
                  <MetricInfo
                    metric="Catalog readiness"
                    definition="Coverage of the six attributes a device page needs to do its job — findable (SEO title), trustworthy (images, verdict, score) and clickable (price, buy link)."
                    formula="covered published devices / published devices, per attribute"
                    ga4Alias="— (catalog completeness)"
                    dataSource="devices (seo_title · images · verdict_pros · scores_overall · price_kes · buy_links)"
                    action="The weakest bar is the single highest-leverage catalog task this period — fix it before adding new devices."
                  />
                </CardTitle>
                <CardDescription>Attribute coverage across every published device</CardDescription>
              </CardHeader>
              <CardContent>
                <CatalogReadinessChecklist rows={deviceInsights?.catalog.readiness ?? []} />
              </CardContent>
            </Card>
          </div>

          {/* ── Distribution plane ─────────────────────────────────── */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-brand-primary" />
                  Retailer × Price-Tier Coverage
                  <MetricInfo
                    metric="Distribution coverage matrix"
                    definition="For every retailer, how many published devices it can sell in each price tier. A blank cell is unmet demand: that tier has traffic but no buy path through that retailer."
                    formula="count(published devices with a buy link for retailer, per price tier)"
                    dataSource="devices.buy_links × devices.price_tier"
                    action="Read the blank columns first — a whole tier with no coverage is a partnership conversation, not a page edit."
                  />
                </CardTitle>
                <CardDescription>Where the catalog can be bought, by price band</CardDescription>
              </CardHeader>
              <CardContent>
                <RetailerCoverageMatrix
                  tiers={deviceInsights?.distribution.retailerTierMatrix.tiers ?? []}
                  tierLabels={deviceInsights?.distribution.retailerTierMatrix.tierLabels ?? []}
                  rows={deviceInsights?.distribution.retailerTierMatrix.rows ?? []}
                  maxCell={deviceInsights?.distribution.retailerTierMatrix.maxCell ?? 1}
                  published={deviceInsights?.catalog.published ?? 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  Retailer Taxonomy — Do The Registries Agree?
                  <MetricInfo
                    metric="Retailer taxonomy health"
                    definition="A click only becomes commission when three registries use the same retailer key: the catalog buy link, the click log and the commission rate sheet. The buy box additionally only renders five known keys."
                    formula="presence + case-match across catalog · affiliate_clicks · affiliate_commission_rates · buy-box keys"
                    dataSource="devices.buy_links · affiliate_clicks · affiliate_commission_rates"
                    action="Fix mismatched keys before trusting any per-retailer revenue number — a case mismatch silently prices clicks at zero."
                  />
                </CardTitle>
                <CardDescription>The silent failure mode behind per-retailer revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <RetailerTaxonomyTable rows={deviceInsights?.distribution.retailerTaxonomy ?? []} />
              </CardContent>
            </Card>
          </div>

          {/* ══ B · DEMAND — which assets pull their weight? ═══════════ */}
          <SectionHeading
            letter="B"
            title="Demand — which assets pull their weight?"
            hint="views · clicks · intent, sliced by the catalog's own dimensions"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-primary" />
                Catalog Concentration — The Head And The Long Tail
                <MetricInfo
                  metric="Catalog concentration (Pareto)"
                  definition="Views per device ranked highest-first, with the running share on the second axis. Shows how few pages carry the catalog, and how much of it earns nothing."
                  formula="ranked views + cumulative share · rank where cumulative share crosses 80%"
                  ga4Alias="pageviews by page path"
                  dataSource="page_views (/devices/*) · devices"
                  action="Everything after the 80% rank is the tail: link it from the head, merge near-duplicates, or prune the pages no one ever reads."
                />
              </CardTitle>
              <CardDescription>
                How many pages carry the catalog — and what the tail is worth ignoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CatalogConcentrationChart
                data={deviceInsights?.demand.concentration ?? []}
                paretoIndex={deviceInsights?.demand.paretoIndex ?? null}
                top10SharePct={deviceInsights?.demand.top10SharePct ?? 0}
                totalViews={deviceInsights?.demand.totals.deviceViews ?? 0}
              />
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-primary" />
                  Demand Rhythm By Price Tier
                  <MetricInfo
                    metric="Demand rhythm (tier × time)"
                    definition="Device-page views per time bucket, split by price tier. Same recipe as the Content tab's section momentum, keyed to the catalog's price ladder instead of content sections."
                    formula="Σ views per (bucket × price_tier)"
                    dataSource="page_views × devices.price_tier"
                    action="A tier that only lights up in one week is a payday or launch effect — time the next review drop and stock conversation to it."
                  />
                </CardTitle>
                <CardDescription>Where attention moves across the price ladder</CardDescription>
              </CardHeader>
              <CardContent>
                <DeviceDemandHeatmap
                  buckets={(deviceInsights?.demand.heatmap ?? []).map((h) => h.bucket)}
                  tiers={deviceInsights?.demand.heatmapTiers ?? []}
                  tierLabels={deviceInsights?.demand.heatmapTierLabels ?? []}
                  matrix={deviceInsights?.demand.heatmap ?? []}
                  maxCell={Math.max(1, ...(deviceInsights?.demand.heatmap ?? []).flatMap((h) => Object.values(h.tiers)))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5 text-amber-400" />
                  Affiliate Clicks By Device &amp; Retailer
                  <MetricInfo
                    metric="Affiliate clicks per device × retailer"
                    definition="The raw click log every conversion is built on: which device page sent which retailer the most clicks in the period."
                    formula="count(affiliate_clicks) grouped by device_slug, retailer"
                    ga4Alias="outbound clicks"
                    dataSource="affiliate_clicks"
                    action="A device with clicks on a retailer you have no commission rate for is mispriced revenue — cross-check the taxonomy table above."
                  />
                </CardTitle>
                <CardDescription>Who actually clicks, and where they are sent</CardDescription>
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

          </div>

          {/* ══ C · LEAKAGE — where does demand hit a dead end? ════════ */}
          <SectionHeading
            letter="C"
            title="Leakage — where does demand hit a dead end?"
            hint="ghost demand · 404 paths · link health"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-brand-primary" />
                Ghost Demand — Brand To Reality
                <MetricInfo
                  metric="Ghost demand flow"
                  definition="Every device-page view, traced from the brand it was looking for to what the page actually delivered: a monetised page, a live page with no buy link, an unpublished row, or a slug that no longer exists."
                  formula="views(brand) → views(outcome), where outcome = status + buy_links + catalog match"
                  dataSource="page_views × devices (status · buy_links · brand)"
                  action="Follow any widening amber or red ribbon back to the brand on the left — that brand has demand arriving and nothing to sell it."
                />
              </CardTitle>
              <CardDescription>
                Ribbon width = views · colour = whether that view could ever have earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceDemandFlowChart
                data={deviceInsights?.leakage.flow ?? { nodes: [], links: [] }}
                outcomes={deviceInsights?.leakage.outcomes ?? []}
              />
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Outcome split — where the period&apos;s device views ended up
                </p>
                <DeviceOutcomeSplit
                  outcomes={deviceInsights?.leakage.outcomes ?? []}
                  totalViews={deviceInsights?.demand.totals.deviceViews ?? 0}
                />
              </div>
            </CardContent>
          </Card>

          {/* __DEVICES_TAB_HEALTH__ */}

          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2Off className="h-5 w-5 text-amber-400" />
                  Dead Device Paths
                  <MetricInfo
                    metric="Dead device paths (orphan demand)"
                    definition="Device-page paths that matched no catalog row at all in the period. The visitor asked for a device and got a 404 — no catalog edit can fix these, only a redirect or a new page."
                    formula="count(views where /devices/{brand}/{slug} has no matching devices.slug)"
                    dataSource="page_views (/devices/*) left-joined to devices"
                    action="Redirect the loudest paths to the current slug; a path that keeps attracting traffic with no product behind it is a page idea."
                  />
                </CardTitle>
                <CardDescription>Traffic that arrived and found nothing</CardDescription>
              </CardHeader>
              <CardContent>
                <OrphanDemandTable
                  paths={deviceInsights?.leakage.orphanPaths ?? []}
                  totalViews={deviceInsights?.demand.totals.deviceViews ?? 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  Buy-Link Health — Distribution Governance
                  <MetricInfo
                    metric="Buy-link health census"
                    definition="The daily cron HEAD-checks every outbound buy link. Three numbers matter: how many live URLs it has verified, how many live buy links it has never seen, and how many URLs it still checks that the catalog has dropped."
                    formula="distinct(link_health_checks.url) matched against live devices.buy_links[].url"
                    dataSource="link_health_checks · devices.buy_links"
                    action="Broken links lose the click they just earned; unchecked live links are blind spots the cron has not covered yet."
                  />
                </CardTitle>
                <CardDescription>
                  Checked{' '}
                  <span className="font-semibold text-foreground">
                    {deviceInsights?.distribution.linkHealth.checked ?? 0}
                  </span>{' '}
                  · broken{' '}
                  <span className="font-semibold text-amber-400">
                    {deviceInsights?.distribution.linkHealth.broken ?? 0}
                  </span>{' '}
                  · never checked{' '}
                  <span className="font-semibold text-foreground">
                    {deviceInsights?.distribution.linkHealth.uncheckedLive ?? 0}
                  </span>{' '}
                  · orphan checks{' '}
                  <span className="font-semibold text-muted-foreground">
                    {deviceInsights?.distribution.linkHealth.orphanChecks ?? 0}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LinkHealthTable summary={linkHealth.summary} brokenLinks={linkHealth.brokenLinks} />
                <p className="text-muted-foreground text-xs mt-3">
                  Fed by the daily link-health cron (HEAD-checks every outbound buy link)
                  {deviceInsights?.distribution.linkHealth.lastCheckedAt
                    ? ` · last run ${formatHoverDate(deviceInsights.distribution.linkHealth.lastCheckedAt.slice(0, 10))}`
                    : ''}
                  . Broken links leak revenue — every one is already queued in the fix queue below.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ══ D · ACTION — what to fix, in revenue order ════════════ */}
          <SectionHeading
            letter="D"
            title="Action — what to fix, ranked by views at risk"
            hint="the loop from analytics back into the catalog"
          />

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-400" />
                  Catalog Fix Queue
                  <MetricInfo
                    metric="Catalog fix queue"
                    definition="One row per (device, issue) with the views currently at risk, so the ticket order is the revenue order. Issues come from the catalog's own state plus the link-health cron — every row names the exact catalog edit."
                    formula="issues from status · buy_links · priceDate · link_health_checks, ranked by views at risk"
                    ga4Alias="— (prescriptive, not a GA4 metric)"
                    dataSource="devices · page_views · link_health_checks"
                    action="Work top-down: each fixed row moves views from 'wasted' to 'monetised' without a single extra visitor."
                  />
                </CardTitle>
                <CardDescription>Prescriptive, prioritised, deep-linked into the device editor</CardDescription>
              </div>
              <Link href={`/api/admin/export/catalog-gaps?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <CatalogFixQueue items={deviceInsights?.leakage.fixQueue ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-primary" />
                  Catalog Performance Grid
                  <MetricInfo
                    metric="Catalog performance grid"
                    definition="Every catalog row with its audience, conversion and monetisation state in one sortable view — the long-tail workbench behind the concentration chart."
                    formula="views · clicks (CTR) · buy links · save/compare/watch intent per device"
                    ga4Alias="pageviews + outbound clicks by path"
                    dataSource="devices × page_views × affiliate_clicks × interactions"
                    action="Sort by intent descending with 0 links to find pages your audience is already saving but cannot buy — the fastest wins in the catalog."
                  />
                </CardTitle>
                <CardDescription>Search, filter by outcome, sort any column</CardDescription>
              </div>
              <Link href={`/api/admin/export/device-catalog?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <CatalogPerformanceTable rows={deviceInsights?.demand.deviceRows ?? []} />
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
          {/* ── Insight banner ─────────────────────────────────────── */}
          {considerationInsights && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {compareChips.map((chip) => (
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
                  interactions · page_views · affiliate_clicks · devices · brands
                </span>
                <span className="ml-1">
                  — intent-aware: every visual joins the first-party intent beacon to the traffic it rode in on, so the
                  tab reads as funnel → mix → audience → pairs → action.
                </span>
              </p>
            </div>
          )}

          {/* ══ A · FUNNEL — how many browsers become buyers? ═════════ */}
          <SectionHeading
            letter="A"
            title="Funnel — how many browsers become buyers?"
            hint="browsers · savers · comparers · buy clickers"
          />
          {/* __COMPARE_KPIS__ */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Intent Events</CardTitle>
                <MetricInfo
                  metric="Intent events"
                  definition="Every save · compare · watch · related-click the first-party beacon recorded in the period. This is the raw material the whole tab is built from."
                  formula="count(interactions.action in [save, add_to_compare, watch, related_click])"
                  ga4Alias="events"
                  dataSource="interactions"
                  action="If this is thin, the tab's job is instrumentation first: check which surfaces fire the beacon before trusting any ratio."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {(considerationInsights?.mix.totals.events ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {considerationInsights?.mix.totals.activeVisitors ?? 0} active visitors ·{' '}
                  {considerationInsights?.mix.totals.signedInVisitors ?? 0} signed in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Comparison Runs</CardTitle>
                <MetricInfo
                  metric="Comparison runs"
                  definition="Completed /compare page renders carrying two or more device slugs — the deepest intent signal on the site, one step above the buy click."
                  formula="count(page_views.path like /compare% with ≥2 devices)"
                  ga4Alias="pageviews on /compare"
                  dataSource="page_views"
                  action="Rivalries with real runs deserve editorial love: an H2H review, a video, or a price-drop alert naming both devices."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {(considerationInsights?.demand.totalPairRuns ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(considerationInsights?.demand.topPairs.length ?? 0)} live rivalries ·{' '}
                  {considerationInsights?.mix.totals.comparePageViews ?? 0} /compare views
                </p>
              </CardContent>
            </Card>

            {/* __COMPARE_KPIS_2__ */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Hot + Warm Audience</CardTitle>
                <MetricInfo
                  metric="Hot + warm audience"
                  definition="Scored visitors at 4+: warm (4–7, one nudge from purchase) and hot (8+, purchase-ready). This is the MQL-equivalent pool the plan asks for."
                  formula="count(visitors with compare×3 + save×2 + watch + related + click×2 + signed-in×2 ≥ 4)"
                  ga4Alias="— (first-party audience, not in GA4)"
                  dataSource="interactions × affiliate_clicks"
                  action="Export hot for retargeting/CRM and warm for price-drop and new-review alerts — reach without this list is spray."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {(
                    (considerationInsights?.audience.totals.hot ?? 0) +
                    (considerationInsights?.audience.totals.warm ?? 0)
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {considerationInsights?.audience.totals.hot ?? 0} hot ·{' '}
                  {considerationInsights?.audience.totals.warm ?? 0} warm · avg score{' '}
                  {considerationInsights?.audience.totals.avgScore ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Browser → Buyer</CardTitle>
                <MetricInfo
                  metric="Browser → buyer conversion"
                  definition="End-to-end consideration: distinct device-page browsers who clicked any buy link in the period. Identity is the first-party FP-id, so this bridges anonymous browsing to purchase intent."
                  formula="distinct buy-click visitors / distinct device-page browsers"
                  dataSource="page_views.fp_id × affiliate_clicks.fp_id"
                  action="This is the tab's north star. It moves when shortlisted devices get buy links — see the consideration queue."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {considerationInsights?.funnel.browserToBuyerPct ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(considerationInsights?.funnel.buyClickers ?? 0).toLocaleString()} clickers of{' '}
                  {(considerationInsights?.funnel.browsers ?? 0).toLocaleString()} browsers
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" />
                Consideration Funnel
                <MetricInfo
                  metric="Consideration funnel"
                  definition="Distinct visitors per stage, top-down: browsers (device-page views), savers, comparers, buy clickers. A visitor in two stages counts in both — the story is the shrinkage between bars."
                  formula="distinct fp_id per stage · step % = stage / previous stage"
                  dataSource="page_views · interactions · affiliate_clicks (fp_id)"
                  action="The fastest-shrinking bar is the quarter's project: a collapsing save→compare bar means the compare entry points are broken or invisible."
                />
              </CardTitle>
              <CardDescription>Distinct visitors per stage — the shrinkage is the story</CardDescription>
            </CardHeader>
            <CardContent>
              <ConsiderationFunnelGauge
                stages={considerationInsights?.funnel.stages ?? []}
                browserToBuyerPct={considerationInsights?.funnel.browserToBuyerPct ?? 0}
              />
            </CardContent>
          </Card>

          {/* ══ B · MIX — where does intent concentrate? ══════════════ */}
          <SectionHeading
            letter="B"
            title="Mix — where does intent concentrate?"
            hint="action × content type × momentum"
          />
          {/* __COMPARE_MIX__ */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-primary" />
                  Intent Momentum By Action
                  <MetricInfo
                    metric="Intent momentum"
                    definition="Intent events per time bucket, split by action (compare · save · watch · related). Same recipe as the Devices tab's demand-rhythm heatmap, keyed to behaviour instead of price tier."
                    formula="Σ intent events per (bucket × action)"
                    dataSource="interactions"
                    action="A compare row that only lights up on one date is a single viral page, not a habit — find it and replicate the entry point."
                  />
                </CardTitle>
                <CardDescription>Which behaviour is accelerating, which is flat-lining</CardDescription>
              </CardHeader>
              <CardContent>
                <IntentMomentumChart
                  momentum={considerationInsights?.mix.momentum ?? []}
                  maxCell={Math.max(
                    1,
                    ...(considerationInsights?.mix.momentum ?? []).flatMap((m) => [
                      m.save,
                      m.add_to_compare,
                      m.watch,
                      m.related_click,
                    ]),
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand-primary" />
                  Intent By Action &amp; Content Type
                  <MetricInfo
                    metric="Intent mix"
                    definition="Where the period's intent events sit: which action dominates, how many distinct visitors and devices each action touches, and which content types earn the intent."
                    formula="events · distinct visitors · distinct devices per action; events per content_type"
                    dataSource="interactions"
                    action="A dominant action is the behaviour to design around; a content type with zero intent is a surface that never converts attention."
                  />
                </CardTitle>
                <CardDescription>The shape of this period&apos;s intent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(considerationInsights?.mix.byAction ?? []).map((row) => {
                    const maxEvents = Math.max(1, ...(considerationInsights?.mix.byAction ?? []).map((r) => r.events))
                    return (
                      <div key={row.action}>
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="font-medium text-foreground">{row.label}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            <span className="font-semibold text-foreground">{row.events.toLocaleString()}</span>
                            {' · '}
                            {row.sharePct}% · {row.visitors.toLocaleString()} visitors · {row.devices.toLocaleString()} devices
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(row.events / maxEvents) * 100}%`,
                              backgroundColor:
                                row.action === 'add_to_compare'
                                  ? '#8B5CF6'
                                  : row.action === 'save'
                                    ? '#3B82F6'
                                    : row.action === 'watch'
                                      ? '#EF4444'
                                      : '#10B981',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {(considerationInsights?.mix.byAction ?? []).every((r) => r.events === 0) && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No intent events in this period yet.
                    </p>
                  )}
                </div>
                {(considerationInsights?.mix.byContentType ?? []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {considerationInsights!.mix.byContentType.map((row) => (
                      <span
                        key={row.type}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">{row.label}:</span>
                        <span className="font-semibold text-foreground">
                          {row.events.toLocaleString()} · {row.sharePct}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ══ C · AUDIENCE — who are the hot, warm and cold? ════════ */}
          <SectionHeading
            letter="C"
            title="Audience — who are the hot, warm and cold?"
            hint="qualification score · hot/warm/cold"
          />
          {/* __COMPARE_AUDIENCE__ */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-400" />
                  Qualification Thermometer
                  <MetricInfo
                    metric="Qualification tiers (hot / warm / cold)"
                    definition="Every scored visitor bucketed by the shared qualification score: hot (8+, purchase-ready), warm (4–7, one nudge away), cold (under 4, browsing). The MQL-equivalent audience the canvas asks for."
                    formula="hot = score ≥ 8 · warm = 4–7 · cold < 4 (compare×3 + save×2 + watch + related + click×2 + signed-in×2)"
                    ga4Alias="— (first-party audience, not in GA4)"
                    dataSource="interactions × affiliate_clicks"
                    action="A fat cold band with a thin hot band is a nurture problem: warm needs price-drop alerts, hot needs retargeting now."
                  />
                </CardTitle>
                <CardDescription>The shape of the audience, not just its size</CardDescription>
              </CardHeader>
              <CardContent>
                <QualificationThermometer
                  tiers={considerationInsights?.audience.tiers ?? []}
                  total={considerationInsights?.audience.totals.scored ?? 0}
                  avgScore={considerationInsights?.audience.totals.avgScore ?? 0}
                />
                {(considerationInsights?.audience.scoreHistogram ?? []).some((h) => h.visitors > 0) && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Score distribution
                    </p>
                    <div className="flex h-16 items-end gap-1.5">
                      {(considerationInsights?.audience.scoreHistogram ?? []).map((h) => {
                        const max = Math.max(
                          1,
                          ...(considerationInsights?.audience.scoreHistogram ?? []).map((x) => x.visitors),
                        )
                        return (
                          <div key={h.bucket} className="flex flex-1 flex-col items-center gap-1" title={`Score ${h.bucket}: ${h.visitors} visitors`}>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {h.visitors > 0 ? h.visitors : ''}
                            </span>
                            <div
                              className="w-full rounded-sm bg-brand-primary/70"
                              style={{ height: `${Math.max(3, (h.visitors / max) * 44)}px` }}
                            />
                            <span className="text-[10px] text-muted-foreground">{h.bucket}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-400" />
                    High-Intent Audience — Qualification Scoreboard
                    <MetricInfo
                      metric="Qualification scoreboard"
                      definition="Top-25 scored visitors with their signal mix (compares · saves · watches · related · clicks) and tier. The same score the thermometer buckets — row-level for CRM handoff."
                      formula="compare×3 + save×2 + watch + related + affiliate_click×2 + signed-in×2"
                      dataSource="interactions × affiliate_clicks (fp_id)"
                      action="Export hot for retargeting and signed-in warm for lifecycle email — the first-party audience asset GA can't give you."
                    />
                  </CardTitle>
                  <CardDescription>Row-level scores for the CRM handoff</CardDescription>
                </div>
                <Link href={`/api/admin/export/qualified-leads?period=${period}`}>
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                    <Download className="h-4 w-4 mr-1" /> Qualified Leads CSV
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <QualifiedLeadsTable data={qualifiedLeads} />
                <p className="text-muted-foreground text-xs mt-3">
                  Hot tier = strong purchase intent (compare + save + clicks). Export to CSV for CRM
                  onboarding / retargeting — the first-party audience asset GA can&apos;t give you.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ══ D · PAIRS — what is being compared? ═══════════════════ */}
          <SectionHeading
            letter="D"
            title="Pairs — what is being compared, and what converts attention?"
            hint="rivalries · per-device intent depth"
          />
          {/* __COMPARE_PAIRS__ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand-primary" />
                Live Rivalries — What The Audience Puts Head To Head
                <MetricInfo
                  metric="Comparison pairs"
                  definition="Completed comparisons grouped by canonical pair (slugs sorted — redirects enforce this shape on the page itself). The thickest arcs are the rivalries worth editorial investment."
                  formula="runs per sorted slug pair from /compare?devices= paths"
                  ga4Alias="pageviews on /compare by query"
                  dataSource="page_views (/compare)"
                  action="Give the top 3 rivalries an H2H article or video each; fix or redirect any pair that runs on a dead slug."
                />
              </CardTitle>
              <CardDescription>
                Arcs = devices in the current top pairs · chords = pair runs ·{' '}
                {considerationInsights?.demand.lopsidedPairs ?? 0} lopsided or half-dead pairs detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComparePairChord
                pairs={considerationInsights?.demand.topPairs ?? []}
                totalRuns={considerationInsights?.demand.totalPairRuns ?? 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-primary" />
                  Consideration Depth — Attention To Purchase, Per Device
                  <MetricInfo
                    metric="Consideration depth ledger"
                    definition="Every device's intent score beside the two ratios that matter: intent-per-100-views (attention density) and clicks-per-100-intent (shortlist conversion). Temperature is the device-level heat of the demand on it."
                    formula="intent = compare×3 + save×2 + watch + related · density = intent/100 views · conversion = clicks/100 intent"
                    dataSource="interactions × page_views × affiliate_clicks × devices"
                    action="High density + low conversion = the buy box is failing a device people already want. High density + zero links = the quarter's easiest win."
                  />
                </CardTitle>
                <CardDescription>S·C·W·R = raw saves · compares · watches · related-clicks</CardDescription>
              </div>
              <Link href={`/api/admin/export/consideration-funnel?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ConsiderationDepthTable rows={considerationInsights?.demand.deviceRows ?? []} />
            </CardContent>
          </Card>

          {/* ══ E · ACTION — what to fix, in interest order ═══════════ */}
          <SectionHeading
            letter="E"
            title="Action — what to fix, ranked by the interest at stake"
            hint="the loop from consideration back into catalog + editorial"
          />

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-400" />
                  Consideration Queue
                  <MetricInfo
                    metric="Consideration fix queue"
                    definition="One row per (device or pair, issue) with the interest currently at stake, so the ticket order is the revenue order. Device rows deep-link into the device editor; pair rows link to the live comparison."
                    formula="issues from intent × views × clicks × buy links × pair health, ranked by interest at stake"
                    ga4Alias="— (prescriptive, not a GA4 metric)"
                    dataSource="interactions · page_views · affiliate_clicks · devices"
                    action="Work top-down: each fixed row converts attention you already earned — no extra traffic needed."
                  />
                </CardTitle>
                <CardDescription>Prescriptive, prioritised, deep-linked where it counts</CardDescription>
              </div>
              <Link href={`/api/admin/export/consideration-queue?period=${period}`}>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ConsiderationFixQueue items={considerationInsights?.action.fixQueue ?? []} />
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
          {/* ── Insight banner ─────────────────────────────────────── */}
          {communityInsights && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {communityChips.map((chip) => (
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
                  device_ratings · comments · rating_votes · device_watchers · devices · page_views
                </span>
                <span className="ml-1">
                  — trust reads the whole ledger (any age), voice and people read the period; the tab reads as trust →
                  voice → people → action.
                </span>
              </p>
            </div>
          )}

          {/* ══ A · TRUST — the catalog-wide social-proof position ════ */}
          <SectionHeading
            letter="A"
            title="Trust — how much of the catalog can prove itself?"
            hint="coverage · health lifecycle · grade"
          />
          {/* __COMMUNITY_TRUST__ */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Trust Grade</CardTitle>
                <MetricInfo
                  metric="Trust grade"
                  definition="A 0–100 composite of the catalog's social-proof position: rating quality (avg rating, up to 60) + proof coverage (up to 25) + signal volume (up to 15, log-scaled). One number for the monthly review."
                  formula="grade = avgRating/5×60 + coverage%×0.25 + min(15, log2(signals+1)×3)"
                  ga4Alias="— (composite, not a GA4 metric)"
                  dataSource="device_ratings × comments × devices"
                  action="The grade only climbs when coverage climbs — volume on the same 20 devices plateaus it. Watch the silent band, not the average."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {communityInsights?.trust.totals.grade ?? 0}
                  <span className="text-base font-normal text-muted-foreground">/100</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  avg rating {communityInsights?.trust.totals.avgRating ?? '—'} ·{' '}
                  {communityInsights?.trust.totals.lifetimeRatings.toLocaleString() ?? 0} lifetime ratings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Proof Coverage</CardTitle>
                <MetricInfo
                  metric="Proof coverage"
                  definition="Published devices with at least one rating or comment (any age) ÷ all published devices. The old coverage KPI, kept as the tab's second card — it is the denominator of trust."
                  formula="covered published devices ÷ published devices"
                  ga4Alias="— (first-party coverage, not in GA4)"
                  dataSource="device_ratings · comments · devices"
                  action="Every uncovered device is a page that ships without proof — the queue ranks them by the traffic they waste."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {communityInsights?.trust.totals.coveragePct ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {communityInsights?.trust.totals.coveredDevices ?? 0} of{' '}
                  {communityInsights?.trust.totals.publishedDevices ?? 0} published devices
                </p>
              </CardContent>
            </Card>

            {/* __COMMUNITY_KPIS_2__ */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Signals This Period</CardTitle>
                <MetricInfo
                  metric="Community signals"
                  definition="Ratings + comments created inside the period — the flow, not the stock. Ratings are drive-by verdicts; comments are dialogue. The balance between them is the community's character."
                  formula="count(device_ratings) + count(comments) created_at ≥ period start"
                  dataSource="device_ratings · comments"
                  action="A rating-heavy mix means people score and leave — add reply prompts to convert verdicts into conversations."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {((communityInsights?.trust.totals.periodRatings ?? 0) +
                    (communityInsights?.trust.totals.periodComments ?? 0)).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {communityInsights?.trust.totals.periodRatings ?? 0} ratings ·{' '}
                  {communityInsights?.trust.totals.periodComments ?? 0} comments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <CardTitle className="text-sm">Watchers</CardTitle>
                <MetricInfo
                  metric="Device watchers"
                  definition="Distinct devices with at least one 'notify me' watcher registered. This is owned demand — emails you can reach the moment availability or price changes, no algorithm in between."
                  formula="count(distinct device_watchers.device_id)"
                  dataSource="device_watchers"
                  action="Availability flips and price drops should trigger a watcher email first — this list converts better than any campaign."
                />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {communityInsights?.people.totals.watchers ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">devices with notify-me demand</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-primary" />
                Social-Proof Health Across The Catalog
                <MetricInfo
                  metric="Trust health bands"
                  definition="Every catalog device classified by its social-proof lifecycle: healthy (2+ signals, one inside the period), thin (exactly one signal — an outlier risk), stale (proof exists but nothing recent), silent (never proven). Read the bands, not just coverage."
                  formula="health = f(signal count, newest signal age) per device"
                  dataSource="device_ratings · comments · devices"
                  action="Thin devices need a second voice, stale devices need revival, silent devices need their first — the queue ranks all three by traffic."
                />
              </CardTitle>
              <CardDescription>The lifecycle, not just the percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <TrustHealthBand
                mix={communityInsights?.trust.healthMix ?? []}
                total={(communityInsights?.trust.healthMix ?? []).reduce((s, m) => s + m.devices, 0)}
              />
            </CardContent>
          </Card>

          {/* ══ B · VOICE — what the community actually said ══════════ */}
          <SectionHeading
            letter="B"
            title="Voice — what the community actually said"
            hint="distribution · momentum · where dialogue lives"
          />
          {/* __COMMUNITY_VOICE__ */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-primary" />
                  Voice Momentum — Ratings vs Comments
                  <MetricInfo
                    metric="Voice momentum"
                    definition="Community signals per time bucket, stacked by kind. The layers tell two different stories: ratings are one-tap verdicts, comments are dialogue that can answer objections. A healthy community does both."
                    formula="Σ ratings / Σ comments per bucket"
                    dataSource="device_ratings · comments"
                    action="Comment droughts precede trust droughts — seed conversations on the devices the queue flags as thin."
                  />
                </CardTitle>
                <CardDescription>Verdicts vs dialogue, per bucket</CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceMomentumChart momentum={communityInsights?.voice.momentum ?? []} />
                {(communityInsights?.voice.bySurface ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(communityInsights?.voice.bySurface ?? []).map((row) => (
                      <span
                        key={row.surface}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">{row.label}:</span>
                        <span className="font-semibold text-foreground">
                          {row.comments.toLocaleString()} · {row.sharePct}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary" />
                  Rating Distribution
                  <MetricInfo
                    metric="Rating distribution"
                    definition="The shape of this period's verdicts, 5★ → 1★. The average hides the shape: a 3.8 can be a fat 5★ band with a product-claim tail, or a lukewarm hump — and they call for opposite actions."
                    formula="count(device_ratings.rating = n) per n ∈ 1..5"
                    ga4Alias="rating distribution"
                    dataSource="device_ratings"
                    action="A fat 2★/1★ tail is a product-claim problem: read those comments before the device is promoted anywhere."
                  />
                </CardTitle>
                <CardDescription>The average hides the shape — read the bands</CardDescription>
              </CardHeader>
              <CardContent>
                <RatingHistogram histogram={communityInsights?.voice.ratingHistogram ?? []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary" />
                  Most Discussed Devices
                  <MetricInfo
                    metric="Most discussed devices"
                    definition="Devices ranked by comment count in the period, beside the traffic each carried. Dialogue on high traffic is an asset to curate; dialogue on dead slugs is proof going to waste (see the queue)."
                    formula="count(comments.content_type = 'device') per slug × views"
                    dataSource="comments × page_views"
                    action="Pin the best answers, reply as the brand, and surface the thread on the device page — curated dialogue converts."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiscussionTable rows={communityInsights?.voice.mostDiscussed ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary" />
                  Most Helpful Threads
                  <MetricInfo
                    metric="Helpful-vote leaderboard"
                    definition="Devices whose comments earned the most 'helpful' votes — proof that the community answers its own questions. These threads are the catalog's best free sales copy."
                    formula="Σ comments.helpful_count per device slug"
                    dataSource="comments"
                    action="Quote the top-voted answers in the device verdict block, and thank the authors — recognition is the cheapest retention there is."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DiscussionTable rows={communityInsights?.voice.helpfulLeaderboard ?? []} helpfulMode />
              </CardContent>
            </Card>
          </div>

          {/* ══ C · PEOPLE — who carries the community ════════════════ */}
          <SectionHeading
            letter="C"
            title="People — who carries the community"
            hint="grades · roster · the advocacy pipeline"
          />
          {/* __COMMUNITY_PEOPLE__ */}
          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary" />
                  Contributor Grades
                  <MetricInfo
                    metric="Contributor grades"
                    definition="The community's pipeline shape: advocates (5+ contributions) are the asset, regulars (2–4) are the dependable middle, newcomers (1) are the future. A roster that is all newcomers has no advocates to keep it alive."
                    formula="grade = f(ratings + comments per user in period)"
                    dataSource="device_ratings · comments · rating_votes"
                    action="Thank advocates publicly, prompt regulars at review-worthy moments, onboard newcomers with a reply — the pipeline is the program."
                  />
                </CardTitle>
                <CardDescription>Advocates · regulars · newcomers — the pipeline shape</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(communityInsights?.people.gradeMix ?? []).map((g) => (
                    <div key={g.grade} className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{g.contributors.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">{g.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {communityInsights?.people.totals.contributors.toLocaleString() ?? 0} contributing users ·{' '}
                  {communityInsights?.people.totals.newContributors ?? 0} first-timers this period ·{' '}
                  {communityInsights?.people.totals.avgPerContributor ?? 0} contributions each on average.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary" />
                  Top Contributors
                  <MetricInfo
                    metric="Contributor roster"
                    definition="The top hands, ranked by helpful votes received (value) then contribution count (effort). Admin-only: users appear as truncated ids, never names or emails."
                    formula="Σ helpful votes received · contributions per user"
                    dataSource="device_ratings · comments · rating_votes"
                    action="These are the people to recognise first — early access, badges, or a simple thank-you beat incentives."
                  />
                </CardTitle>
                <CardDescription>Value first, effort second — ids truncated, admin-only</CardDescription>
              </CardHeader>
              <CardContent>
                <ContributorRoster
                  contributors={communityInsights?.people.contributors ?? []}
                  gradeMix={communityInsights?.people.gradeMix ?? []}
                  total={communityInsights?.people.totals.contributors ?? 0}
                />
              </CardContent>
            </Card>
          </div>

          {/* ══ D · ACTION — the moderation / solicitation queue ══════ */}
          <SectionHeading
            letter="D"
            title="Action — what to fix, ranked by views at stake"
            hint="the loop from trust back into traffic + editorial"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-400" />
                Community Queue
                <MetricInfo
                  metric="Community fix queue"
                  definition="One row per (device, issue): traffic without proof, single-voice proof, hanging questions, proof stranded on dead slugs, and unreviewed reports. Ranked by the traffic or signals at stake, so the ticket order is the revenue order."
                  formula="issues from signals × views × report state, ranked by stake"
                  ga4Alias="— (prescriptive, not a GA4 metric)"
                  dataSource="device_ratings · comments · devices · page_views"
                  action="Work top-down — each fixed row compounds proof on traffic you already have, no campaign needed."
                />
              </CardTitle>
              <CardDescription>Prescriptive, prioritised, deep-linked where it counts</CardDescription>
            </CardHeader>
            <CardContent>
              <CommunityFixQueue items={communityInsights?.action.fixQueue ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-brand-primary" />
                Roadmap
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