import { NextRequest, NextResponse } from 'next/server'
import { getCommunityInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'trust', 'voice', 'people', 'queue']

/**
 * Community & Trust analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=community tab.
 *
 * The page renders from `getCommunityInsights` directly; this route exposes the
 * exact same aggregation to external BI tooling (sheeted dashboards, alerting,
 * a warehouse pipeline) so nobody has to scrape HTML or re-implement the joins.
 *
 *   GET /api/admin/analytics/community?period=30d&view=full
 *
 * views:
 *   full    — the whole CommunityInsights payload (default)
 *   summary — headline KPIs only (safe to poll)
 *   trust   — health bands + totals (grade, coverage, silent, staleness)
 *   voice   — momentum, rating histogram, by-surface, leaderboards
 *   people  — grade mix, contributor roster, watchers
 *   queue   — the community fix queue, ranked by views/signals at stake
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getCommunityInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        trustGrade: 'avgRating/5×60 + coverage%×0.25 + min(15, log2(signals+1)×3) — 0–100',
        proofCoverage: 'published devices with ≥1 rating or comment ÷ published devices',
        healthBands: 'healthy=2+ signals with newest in period · thin=exactly 1 · stale=proof older than period · silent=none ever',
        issueCodes: 'no_proof · thin_proof · stale_proof · orphan_proof · hanging_question · unreviewed_report',
        stakeAtRisk: 'page views on the affected device (devices) or signals on the thread (comment)',
        contributorGrades: 'advocate ≥5 contributions · regular 2–4 · newcomer 1 (period signals per user)',
      },
      sources: ['device_ratings', 'comments', 'rating_votes', 'device_watchers', 'page_views', 'devices', 'brands'],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        trust: insights.trust.totals,
        silentDevices: insights.trust.healthMix.find((b) => b.health === 'silent')?.devices ?? 0,
        voice: { periodSignals: insights.trust.totals.periodRatings + insights.trust.totals.periodComments },
        people: insights.people.totals,
        queue: { size: insights.action.fixQueue.length },
      })
    }

    if (view === 'trust') {
      return NextResponse.json({ meta, trust: insights.trust })
    }

    if (view === 'voice') {
      return NextResponse.json({ meta, voice: insights.voice })
    }

    if (view === 'people') {
      return NextResponse.json({ meta, people: insights.people })
    }

    if (view === 'queue') {
      return NextResponse.json({
        meta,
        count: insights.action.fixQueue.length,
        issues: insights.action.fixQueue,
      })
    }

    return NextResponse.json({ meta, ...insights })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
