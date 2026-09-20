import { NextRequest, NextResponse } from 'next/server'
import { getRevenueInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'money', 'flow', 'channels', 'queue']

/**
 * Affiliate & Revenue analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=affiliate tab.
 *
 * The page renders from `getRevenueInsights` directly; this route exposes the
 * exact same aggregation to external BI tooling (sheeted dashboards, alerting,
 * a warehouse pipeline) so nobody has to scrape HTML or re-implement the joins.
 *
 *   GET /api/admin/analytics/revenue?period=30d&view=full
 *
 * views:
 *   full     — the whole RevenueInsights payload (default)
 *   summary  — headline KPIs only (safe to poll)
 *   money    — proxy/actual totals + reconciliation + bucket momentum
 *   flow     — click momentum by channel + monetization tiers + device rows
 *   channels — the retailer ledger (states: priced/mismatch/unpriced/idle)
 *   queue    — the revenue fix queue, ranked by stake
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getRevenueInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        revenueProxy: 'Σ clicks × rate(retailer) — KES; rate from affiliate_commission_rates',
        deviceCtr: 'affiliate clicks ÷ device-page views × 100 (≈ GA4 outbound_click_rate)',
        rpm: 'proxy ÷ device views × 1000 — revenue per mille (≈ ad RPM)',
        reconciliation: 'state = reconciled | overcount | undercount | blind; tolerance ±10% of proxy',
        channelStates: 'priced · tax_mismatch (recorded name ≠ literal rate-sheet key) · unpriced (no rate) · idle (rate, no clicks)',
        monetizationTiers: 'converter CTR ≥3% · engaged 1–3% · teaser <1% · dormant (views, 0 clicks) · unsold (no views)',
        stake: 'KES proxy (channel rows) or views (traffic rows) at risk; severity ≥100 high, ≥20 medium',
      },
      sources: ['affiliate_clicks', 'affiliate_commission_rates', 'affiliate_earnings', 'link_health_checks', 'devices', 'brands', 'page_views'],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        totals: insights.money.totals,
        recon: insights.money.recon,
        channels: { priced: insights.channels.ledger.filter((c) => c.state === 'priced').length, leaking: insights.channels.ledger.filter((c) => c.state === 'tax_mismatch' || c.state === 'unpriced').length },
        queue: { size: insights.action.fixQueue.length, stakeTotal: insights.action.stakeTotal },
      })
    }

    if (view === 'money') {
      return NextResponse.json({ meta, money: insights.money })
    }

    if (view === 'flow') {
      return NextResponse.json({ meta, flow: insights.flow })
    }

    if (view === 'channels') {
      return NextResponse.json({ meta, channels: insights.channels })
    }

    if (view === 'queue') {
      return NextResponse.json({
        meta,
        count: insights.action.fixQueue.length,
        stakeTotal: insights.action.stakeTotal,
        issues: insights.action.fixQueue,
      })
    }

    return NextResponse.json({ meta, ...insights })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
