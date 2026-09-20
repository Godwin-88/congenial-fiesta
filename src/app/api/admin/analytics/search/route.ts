import { NextRequest, NextResponse } from 'next/server'
import { getSearchInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'demand', 'supply', 'habit', 'health', 'telemetry', 'queue']

/**
 * Search & Discovery analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=search tab.
 *
 * The page renders from `getSearchInsights` directly; this route exposes the
 * exact same aggregation to external BI tooling (sheeted dashboards, alerting,
 * warehouse pipelines, the editorial calendar) so nobody scrapes HTML or
 * re-implements the query classification.
 *
 *   GET /api/admin/analytics/search?period=30d&view=full
 *
 * views:
 *   full    — the whole SearchInsights payload (default)
 *   summary — headline KPIs only (safe to poll)
 *   demand  — top queries with answer state, intent shape and near-miss match
 *   supply  — answer-state mix, intent-shape success rates, head share
 *   habit   — repetition buckets + most repeated terms
 *   health  — live search layers, index coverage, published-vs-indexed counts
 *   telemetry — Upstash Developer-API index telemetry (query volume, capture
 *               rate, latency percentiles, document count)
 *   queue   — the backlog, ranked by demand at stake
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getSearchInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        answerState: 'answered = avg results ≥ 4 · thin = 1–3 · zero = < 1 · unknown = logged before result instrumentation (result_count never captured)',
        zeroResultRate: 'zero-result rows ÷ recorded searches × 100 (recorded = rows carrying a result count)',
        answeredWithDepth: 'rows with results_count ≥ 4 ÷ recorded searches × 100',
        repeatDemand: '(searches − distinct normalised terms) ÷ searches × 100',
        intentShape: 'ordered classification — comparison → price intent → spec intent → brand (brand_only if one token, else brand_model) → generic',
        nearMiss: 'Sørensen–Dice token similarity ≥ 0.5 between the query and a published catalog title (devices · articles · videos)',
        headShare: 'searches in the top 20% of terms by volume ÷ all searches × 100',
        indexCoverage: 'published devices + articles present in the Upstash index ÷ published devices + articles × 100',
        stake: 'searches × fix weight (near miss 4 · zero-result 3 · thin 1.5) ; unindexed page flat 10 ; unrecorded row 1',
        captureRatePct: 'logged measured terms ÷ queries Upstash executed in the stats window × 100 (Upstash counts every index operation, so a low rate can be lost instrumentation or non-visitor traffic)',
        telemetryWindow: 'Upstash Developer API /v2/search/{id}/stats — 90d/30d requests degrade to the widest window the index tier allows (upstashPeriod reports what served)',
        logging: 'only committed searches are logged — autocomplete keystrokes are deliberately excluded',
      },
      sources: [
        'search_queries',
        'devices',
        'articles',
        'videos',
        'page_views',
        'upstash_search_index',
        'upstash_developer_api (query volume + latency telemetry)',
      ],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        totals: insights.totals,
        supply: { headSharePct: insights.supply.headSharePct, mix: insights.supply.mix },
        health: { coveragePct: insights.health.coveragePct, layers: insights.health.layers },
        queue: { size: insights.action.fixQueue.length, stakeTotal: insights.action.stakeTotal },
      })
    }

    if (view === 'demand') {
      return NextResponse.json({ meta, totals: insights.totals, demand: insights.demand })
    }

    if (view === 'supply') {
      return NextResponse.json({ meta, totals: insights.totals, supply: insights.supply })
    }

    if (view === 'habit') {
      return NextResponse.json({ meta, totals: insights.totals, habit: insights.habit })
    }

    if (view === 'health') {
      return NextResponse.json({ meta, health: insights.health })
    }

    if (view === 'telemetry') {
      return NextResponse.json({ meta, telemetry: insights.health.telemetry, layers: insights.health.layers })
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
