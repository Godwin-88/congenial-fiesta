import { NextRequest, NextResponse } from 'next/server'
import { getOutreachInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'pipeline', 'demand', 'self-serve', 'queue']

/**
 * Outreach & Leads analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=outreach tab.
 *
 *   GET /api/admin/analytics/outreach?period=30d&view=full
 *
 * views:
 *   full       — the whole OutreachInsights payload (default)
 *   summary    — headline KPIs only (safe to poll)
 *   pipeline   — status lifecycle, open freshness, daily arrival trend, ledger
 *   demand     — budget ladder + package-interest matching vs the live catalog
 *   self-serve — fp_id lead scores (hot/warm/cold, cooling) + the bench
 *   queue      — the prescriptive outreach queue, ranked by stake
 *
 * NOTE the two lead sources, because they are genuinely different populations:
 * formal inbound lives in `sponsor_inquiries` (press rows ride the same table
 * with budget_range='press'), and self-serve leads are behavioural fp_id scores
 * with no email address behind them. Aging is days-since-created for OPEN rows
 * only — the status enum carries no transition history, so true time-to-reply
 * is not derivable yet (see the tab's roadmap).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getOutreachInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        inbound:
          'sponsor_inquiries created inside the window; press inquiries ride the same table with budget_range = "press"',
        openStatus: 'status in ("new","contacted") — the only states that still expect an answer from us',
        ageDays:
          'days since created_at; the status enum has no transition history, so aging is honest only for OPEN rows and is never a time-to-reply',
        freshness: 'open rows banded: fresh ≤7d · warm 8–21d · stale 22–45d · cold 45d+',
        budgetTier: 'Entry ≤ ladder rank 1 · Mid 2–3 · Top 4+ (press and unrecognised strings ride their own tiers)',
        packageMatch:
          'normalise (lowercase, strip punctuation) → exact catalogue equality → containment/shared-token fuzzy → unmatched (asked for something the catalogue does not sell) → none (field empty)',
        leadScore:
          'Σ per fp_id: compares×3 · saves×2 · watches×1 · related-clicks×1 · affiliate-clicks×2 (+ signed-in bonus); hot ≥ 8, warm ≥ 4',
        cooling: 'hot leads whose last activity is more than 7 days before the end of the window',
        stake:
          'age or volume × gap cost: stale new ×2/day · contacted rot ×1.5/day · unquotable interest ×6/ask · cooling hot lead ×2/score-point (queue capped at 25 rows)',
        internalNote:
          'the sponsor wall cross-check normalises company names (lowercase, punctuation stripped) and treats containment as a match in either direction',
      },
      sources: ['sponsor_inquiries', 'sponsorship_packages', 'sponsors', 'interactions', 'affiliate_clicks', 'fp_id'],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        totals: insights.totals,
        pipeline: { byStatus: insights.pipeline.byStatus, maxDaily: insights.pipeline.maxDaily },
        demand: {
          unmatchedInterest: insights.demand.unmatchedInterest,
          statedInterest: insights.demand.statedInterest,
          livePackages: insights.demand.livePackages.length,
        },
        selfServe: {
          hot: insights.selfServe.hot,
          warm: insights.selfServe.warm,
          cold: insights.selfServe.cold,
          cooling: insights.selfServe.cooling,
          medianScore: insights.selfServe.medianScore,
        },
        queue: { size: insights.action.fixQueue.length, stakeTotal: insights.action.stakeTotal },
      })
    }

    if (view === 'pipeline') {
      return NextResponse.json({ meta, totals: insights.totals, pipeline: insights.pipeline, ledger: insights.ledger })
    }

    if (view === 'demand') {
      return NextResponse.json({ meta, demand: insights.demand })
    }

    if (view === 'self-serve') {
      return NextResponse.json({ meta, selfServe: insights.selfServe })
    }

    if (view === 'queue') {
      return NextResponse.json({ meta, action: insights.action })
    }

    return NextResponse.json({ meta, ...insights })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
