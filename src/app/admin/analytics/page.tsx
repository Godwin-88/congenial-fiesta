import type { ReactNode } from 'react'
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
} from '@/lib/analytics/queries'
import { getAdminUser } from '@/lib/admin/require-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  Eye,
  FileDown,
  FileText,
  Handshake,
  Heart,
  LayoutDashboard,
  Megaphone,
  MousePointerClick,
  Scale,
  Search,
  Shield,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import PageViewsChart from './PageViewsChart'
import TrafficSourcesChart from './TrafficSourcesChart'
import DeviceTypeChart from './DeviceTypeChart'
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

type TabId =
  | 'overview'
  | 'traffic'
  | 'content'
  | 'devices'
  | 'compare'
  | 'community'
  | 'affiliate'
  | 'search'
  | 'campaigns'
  | 'outreach'
  | 'goals'
  | 'export'

const ALL_TABS: TabId[] = [
  'overview',
  'traffic',
  'content',
  'devices',
  'compare',
  'community',
  'affiliate',
  'search',
  'campaigns',
  'outreach',
  'goals',
  'export',
]

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  traffic: 'Traffic & Audience',
  content: 'Content & SEO',
  devices: 'Devices & Catalog',
  compare: 'Compare & Consideration',
  community: 'Community & Engagement',
  affiliate: 'Affiliate & Revenue',
  search: 'Search & Discovery',
  campaigns: 'Campaigns & Acquisition',
  outreach: 'Outreach & Leads',
  goals: 'Goals & Alerts',
  export: 'Export & API',
}

const TAB_ICONS: Record<TabId, ReactNode> = {
  overview: <LayoutDashboard className="h-4 w-4" />,
  traffic: <Users className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  devices: <Smartphone className="h-4 w-4" />,
  compare: <Scale className="h-4 w-4" />,
  community: <Heart className="h-4 w-4" />,
  affiliate: <MousePointerClick className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  campaigns: <Megaphone className="h-4 w-4" />,
  outreach: <Handshake className="h-4 w-4" />,
  goals: <Target className="h-4 w-4" />,
  export: <FileDown className="h-4 w-4" />,
}

const ROLE_ALLOWED: Record<string, TabId[]> = {
  owner: [...ALL_TABS],
  admin: [...ALL_TABS],
  editor: ['overview', 'traffic', 'content', 'devices', 'compare', 'community'],
  viewer: ['overview', 'traffic'],
}

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
    phase: 'Phase 3',
    feature: 'API builder',
    data: 'governed data release over marts',
    kpi: 'Scheduled exports → Slack/email/CSV',
  },
  {
    phase: 'Phase 3',
    feature: 'Custom dashboard builder',
    data: 'GA4-style exploration over aggregates',
    kpi: 'Self-serve cohort & funnel builders',
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
  searchParams: Promise<{ period?: string; tab?: string }>
}) {
  const { period: rawPeriod, tab: rawTab } = await searchParams
  const period = ['7d', '30d', '90d'].includes(rawPeriod ?? '') ? (rawPeriod as string) : '30d'

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

      {/* ── TAB BAR ───────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {allowedTabs.map((id) => {
          const active = id === activeTab
          return (
            <Link key={id} href={`/admin/analytics?tab=${id}&period=${period}`}>
              <Button
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={[
                  active ? 'bg-brand-primary' : 'border-border text-muted-foreground',
                  'whitespace-nowrap',
                ].join(' ')}
              >
                <span className="flex items-center gap-1">
                  {TAB_ICONS[id]}
                  {TAB_LABELS[id]}
                </span>
              </Button>
            </Link>
          )
        })}
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
              <CardTitle>Page Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <PageViewsChart data={viewsOverTime} />
            </CardContent>
          </Card>

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
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(Object.keys(SECTION_LABELS) as ContentSection[]).map((section) => {
              const rows = contentBySection.get(section) ?? []
              return (
                <Card key={section}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-primary" />
                      {SECTION_LABELS[section]}
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
        </div>
      )}
    </div>
  )
}