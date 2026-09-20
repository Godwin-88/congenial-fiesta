import { NextRequest, NextResponse } from 'next/server'
import { getDeviceInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'catalog', 'fix-queue', 'distribution']

/**
 * Devices & Catalog analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=devices tab.
 *
 * The page renders from `getDeviceInsights` directly; this route exposes the
 * exact same aggregation to external BI tooling (sheeted dashboards, alerting,
 * a warehouse pipeline) so nobody has to scrape HTML or re-implement the joins.
 *
 *   GET /api/admin/analytics/devices?period=30d&view=full
 *
 * views:
 *   full         — the whole DeviceInsights payload (default)
 *   summary      — headline KPIs only (small, safe to poll)
 *   catalog      — per-device rows (views · clicks · links · outcome)
 *   fix-queue    — the prescriptive issue list, ranked by views at risk
 *   distribution — retailer coverage, taxonomy reconciliation, link health
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getDeviceInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        fillRatePct: 'published devices with ≥1 valid buy link / published devices',
        monetisedSharePct: 'device-page views landing on a published page with a working buy link / all device-page views',
        wastedViews: 'device-page views on unpublished pages or slugs with no catalog row',
        viewsAtRisk: 'views in the period on a page that currently cannot convert',
        outcomes: 'monetised · live_no_buylink · unpublished · missing',
      },
      sources: [
        'devices',
        'brands',
        'device_types',
        'page_views',
        'affiliate_clicks',
        'interactions',
        'link_health_checks',
        'affiliate_commission_rates',
      ],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        catalog: {
          total: insights.catalog.total,
          published: insights.catalog.published,
          draft: insights.catalog.draft,
          fillRatePct: insights.catalog.fillRatePct,
          buyLinkTotal: insights.catalog.buyLinkTotal,
          retailersUsed: insights.catalog.retailersUsed,
          readiness: insights.catalog.readiness,
        },
        demand: insights.demand.totals,
        leakage: {
          outcomes: insights.leakage.outcomes,
          monetisedViews: insights.leakage.monetisedViews,
          wastedViews: insights.leakage.wastedViews,
          wastedPct: insights.leakage.wastedPct,
          monetisedSharePct: insights.leakage.monetisedSharePct,
          fixQueueSize: insights.leakage.fixQueue.length,
          viewsAtRisk: insights.leakage.fixQueue.reduce((sum, item) => sum + item.viewsAtRisk, 0),
        },
      })
    }

    if (view === 'catalog') {
      return NextResponse.json({ meta, rows: insights.demand.deviceRows })
    }

    if (view === 'fix-queue') {
      return NextResponse.json({
        meta,
        count: insights.leakage.fixQueue.length,
        viewsAtRisk: insights.leakage.fixQueue.reduce((sum, item) => sum + item.viewsAtRisk, 0),
        issues: insights.leakage.fixQueue,
      })
    }

    if (view === 'distribution') {
      return NextResponse.json({
        meta,
        coverage: insights.distribution.retailerCoverage,
        retailerTierMatrix: insights.distribution.retailerTierMatrix,
        taxonomy: insights.distribution.retailerTaxonomy,
        linkHealth: insights.distribution.linkHealth,
      })
    }

    return NextResponse.json({ meta, ...insights })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
