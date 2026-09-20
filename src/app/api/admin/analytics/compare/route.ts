import { NextRequest, NextResponse } from 'next/server'
import { getConsiderationInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'funnel', 'audience', 'pairs', 'queue']

/**
 * Compare & Consideration analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=compare tab.
 *
 * The page renders from `getConsiderationInsights` directly; this route exposes
 * the exact same aggregation to external BI tooling (sheeted dashboards,
 * alerting, a warehouse pipeline) so nobody has to scrape HTML or re-implement
 * the joins.
 *
 *   GET /api/admin/analytics/compare?period=30d&view=full
 *
 * views:
 *   full      — the whole ConsiderationInsights payload (default)
 *   summary   — headline KPIs only (safe to poll)
 *   funnel    — browser → saver → comparer → buy-clicker stages
 *   audience  — tier counts, histogram, top-25 scored visitors
 *   pairs     — canonical comparison rivalries + per-device depth rows
 *   queue     — the consideration fix queue, ranked by interest at stake
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getConsiderationInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        intentScore: 'add_to_compare×3 + save×2 + watch×1 + related_click×1 per device',
        qualificationScore: 'intent weights + affiliate_click×2 + signed_in×2 per visitor',
        tiers: 'hot ≥8 · warm 4–7 · cold <4',
        intentPerView: 'intent score per 100 device-page views on the device',
        intentToClick: 'affiliate clicks per 100 intent points on the device',
        interestAtStake: 'intent score (devices) / pair runs (comparisons) sitting on a fix-queue row',
      },
      sources: ['interactions', 'page_views', 'affiliate_clicks', 'devices', 'brands'],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        funnel: insights.funnel,
        mix: insights.mix.totals,
        audience: insights.audience.totals,
        demand: {
          totalPairRuns: insights.demand.totalPairRuns,
          lopsidedPairs: insights.demand.lopsidedPairs,
          consideredDevices: insights.demand.consideredDevices,
          consideredSharePct: insights.demand.consideredSharePct,
        },
        queue: {
          size: insights.action.fixQueue.length,
          interestAtStake: insights.action.interestAtStake,
        },
      })
    }

    if (view === 'funnel') {
      return NextResponse.json({ meta, funnel: insights.funnel, momentum: insights.mix.momentum })
    }

    if (view === 'audience') {
      return NextResponse.json({ meta, audience: insights.audience })
    }

    if (view === 'pairs') {
      return NextResponse.json({
        meta,
        topPairs: insights.demand.topPairs,
        totalPairRuns: insights.demand.totalPairRuns,
        lopsidedPairs: insights.demand.lopsidedPairs,
        deviceRows: insights.demand.deviceRows,
      })
    }

    if (view === 'queue') {
      return NextResponse.json({
        meta,
        count: insights.action.fixQueue.length,
        interestAtStake: insights.action.interestAtStake,
        issues: insights.action.fixQueue,
      })
    }

    return NextResponse.json({ meta, ...insights })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
