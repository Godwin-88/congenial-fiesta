import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/actions'
import {
  getTotalPageViews,
  getPageViewsOverTime,
  getTopPages,
  getTrafficSources,
  getDeviceTypeBreakdown,
  getTopAffiliatePages,
  getAffiliateCTR,
  getClicksByRetailer,
  getTopSearchQueries,
} from '@/lib/analytics/queries'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Search, Eye, MousePointerClick, Users } from 'lucide-react'
import PageViewsChart from './PageViewsChart'
import TrafficSourcesChart from './TrafficSourcesChart'
import DeviceTypeChart from './DeviceTypeChart'
import AffiliateTable from './AffiliateTable'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period = ['7d', '30d', '90d'].includes(rawPeriod ?? '') ? (rawPeriod as string) : '30d'

  // Auth check
  const user = await getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/')
  }

  const [
    totalViews,
    viewsOverTime,
    topPages,
    trafficSources,
    deviceTypes,
    topAffiliate,
    affiliateCTR,
    clicksByRetailer,
    searchQueries,
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
  ])

  const topSource = trafficSources.length > 0 ? trafficSources[0].source : 'N/A'
  const topDevicePage = topPages.find((p) => p.path.startsWith('/devices/'))
  const topAffiliatePage = topAffiliate.length > 0
    ? `${topAffiliate[0].deviceSlug} (${topAffiliate[0].retailer})`
    : 'N/A'

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <Link key={p} href={`/admin/analytics?period=${p}`}>
              <Button
                variant={period === p ? 'default' : 'outline'}
                className={period === p ? 'bg-[#0066FF]' : 'border-gray-700 text-gray-300'}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#0066FF]" /> Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0066FF]" /> Top Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{topSource}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400" /> Top Device Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">
              {topDevicePage ? topDevicePage.path : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-green-500" /> Top Affiliate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">{topAffiliatePage}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── PAGE VIEWS OVER TIME CHART ─────────────────────── */}
      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Page Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <PageViewsChart data={viewsOverTime} />
        </CardContent>
      </Card>

      {/* ── TRAFFIC SOURCES + DEVICE TYPES ROW ────────────── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <TrafficSourcesChart data={trafficSources} totalViews={totalViews} />
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceTypeChart data={deviceTypes} />
          </CardContent>
        </Card>
      </div>

      {/* ── TOP PAGES TABLE ──────────────────────────────── */}
      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Top Pages</CardTitle>
          <Link href={`/api/admin/export/top-pages?period=${period}`}>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Rank</th>
                  <th className="text-left py-2 pr-4">Path</th>
                  <th className="text-right py-2">Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page, i) => {
                  const isDevice = page.path.startsWith('/devices/')
                  const isArticle = page.path.startsWith('/articles/')
                  return (
                    <tr key={page.path} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <a
                          href={page.path}
                          className={`hover:underline ${isDevice ? 'text-[#0066FF]' : isArticle ? 'text-amber-400' : 'text-gray-300'}`}
                        >
                          {page.path}
                        </a>
                      </td>
                      <td className="py-2 text-right">{page.views.toLocaleString()}</td>
                    </tr>
                  )
                })}
                {topPages.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── AFFILIATE PERFORMANCE ────────────────────────── */}
      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Affiliate Performance</CardTitle>
          <Link href={`/api/admin/export/affiliate-clicks?period=${period}`}>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 text-amber-400">Top Affiliate Pages</h3>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Rank</th>
                  <th className="text-left py-2 pr-4">Device</th>
                  <th className="text-left py-2 pr-4">Retailer</th>
                  <th className="text-right py-2 pr-4">Clicks</th>
                  <th className="text-right py-2 pr-4">Views</th>
                  <th className="text-right py-2">CTR</th>
                </tr>
              </thead>
              <tbody>
                <AffiliateTable data={affiliateCTR} />
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mb-4">Clicks by Retailer</h3>
          <div className="space-y-2">
            {clicksByRetailer.map((item) => {
              const maxClicks = clicksByRetailer.length > 0 ? clicksByRetailer[0].clicks : 1
              const barWidth = Math.round((item.clicks / maxClicks) * 100)
              return (
                <div key={item.retailer} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-400 capitalize">{item.retailer}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-[#0066FF] h-full rounded-full flex items-center px-2 text-xs text-white font-medium"
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    >
                      {item.clicks.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
            {clicksByRetailer.length === 0 && (
              <p className="text-gray-500 text-sm">No click data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SEARCH QUERIES ───────────────────────────────── */}
      <Card className="bg-gray-900 border-gray-800 mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-[#0066FF]" /> Top Internal Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Rank</th>
                  <th className="text-left py-2 pr-4">Query</th>
                  <th className="text-right py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {searchQueries.map((q, i) => (
                  <tr key={q.query} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-4 text-gray-300">{q.query}</td>
                    <td className="py-2 text-right">{q.count.toLocaleString()}</td>
                  </tr>
                ))}
                {searchQueries.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-500">No search data</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-2">Source: Upstash Search analytics</p>
        </CardContent>
      </Card>
    </div>
  )
}