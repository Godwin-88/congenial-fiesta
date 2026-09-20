import { NextRequest, NextResponse } from 'next/server'
import { getCampaignInsights } from '@/lib/analytics/queries'
import { requireAdminAuth } from '@/lib/admin/require-admin'

const PERIODS = ['7d', '30d', '90d']
const VIEWS = ['full', 'summary', 'reach', 'attribution', 'efficiency', 'queue']

/**
 * Campaigns & Acquisition analytics as JSON — the BI-facing contract behind the
 * /admin/analytics?tab=campaigns tab.
 *
 *   GET /api/admin/analytics/campaigns?period=30d&view=full
 *
 * views:
 *   full        — the whole CampaignInsights payload (default)
 *   summary     — headline KPIs only (safe to poll)
 *   reach       — attribution split over time, landing mix, top campaigns
 *   attribution — first-touch fp_id segments, tag durability, uncredited clicks
 *   efficiency  — the graded UTM registry + channel/compliance mixes
 *   queue       — the prescriptive tag queue, ranked by stake
 *
 * NOTE the attribution model, because it is not the obvious one: the beacons
 * read utm_* from the LIVE URL, so a campaign tag only ever exists on the
 * landing request, and affiliate_clicks carry the outbound buy link's own
 * params. Campaign→money attribution here is therefore a first-touch join on
 * the fweezy_fp cookie, never a column read on the click row.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    const params = request.nextUrl.searchParams
    const rawPeriod = params.get('period') ?? '30d'
    const rawView = params.get('view') ?? 'full'
    const period = PERIODS.includes(rawPeriod) ? rawPeriod : '30d'
    const view = VIEWS.includes(rawView) ? rawView : 'full'

    const insights = await getCampaignInsights(period)

    const meta = {
      period,
      view,
      generatedAt: new Date().toISOString(),
      definitions: {
        attributionState:
          'tagged = any of utm_source / utm_medium / utm_campaign present on the entry page view · untagged = external referrer but no tag · direct = no referrer and no tag',
        tagRatePct: 'tagged views ÷ all views × 100',
        firstTouch:
          'a visitor (fp_id) is credited to the campaign on their EARLIEST page view inside the window; clicks and interactions are joined back to that entry row',
        tagDurabilityPct:
          'rows after a tagged entry that still carry a tag ÷ all rows after a tagged entry × 100 (the beacons read utm_* from the live URL, so this is structurally near zero)',
        creditedClicks: 'affiliate clicks whose visitor’s entry page carried a campaign tag',
        uncreditedClicks: 'affiliate clicks whose visitor entered untagged or directly',
        unknownIdentityClicks: 'affiliate clicks with no fp_id, or whose visitor has no page view in the window',
        landingDepth:
          'deep = device page / comparison / article (the visitor can act) · shallow = homepage, brand hub, video hub, search, other',
        clickRatePer1k: 'visit-attributed clicks ÷ views × 1000',
        verdict:
          'median-split quadrants: scale = reach ≥ median and rate ≥ median · optimise = reach ≥ median, rate below · test = reach below median, rate ≥ median · pause = both below · untracked = clicks tagged but no tagged landing observed',
        tagCompliance:
          'clean / warn / broken against the house convention: lowercase, hyphen-separated, no whitespace, no date-version noise, always source and medium, medium inside the shared vocabulary',
        stake:
          'reach affected × fix weight: uncreditable clicks ×8 · creator traffic ×2 · shallow landing ×1.5 · reach-with-no-outcome ×1.2 · unmapped medium ×1 · no medium ×0.8 · tag convention ×0.4 · stale campaign ×0.3 (one row per campaign, worst issue first)',
        internalReferrers:
          'self-referrals and dev hosts are counted in reach but excluded from the queue — they are noise, not a placement anyone can tag',
      },
      sources: ['page_views', 'affiliate_clicks', 'interactions', 'devices', 'articles'],
    }

    if (view === 'summary') {
      return NextResponse.json({
        meta,
        totals: insights.totals,
        attribution: {
          creditedClicks: insights.attribution.creditedClicks,
          uncreditedClicks: insights.attribution.uncreditedClicks,
          unknownIdentityClicks: insights.attribution.unknownIdentityClicks,
          tagDurabilityPct: insights.attribution.tagDurabilityPct,
        },
        efficiency: {
          campaigns: insights.efficiency.campaigns.length,
          cleanSharePct: insights.efficiency.cleanSharePct,
          reachMedian: insights.efficiency.reachMedian,
          rateMedian: insights.efficiency.rateMedian,
        },
        queue: { size: insights.action.fixQueue.length, stakeTotal: insights.action.stakeTotal },
      })
    }

    if (view === 'reach') {
      return NextResponse.json({ meta, totals: insights.totals, reach: insights.reach })
    }

    if (view === 'attribution') {
      return NextResponse.json({ meta, totals: insights.totals, attribution: insights.attribution })
    }

    if (view === 'efficiency') {
      return NextResponse.json({ meta, efficiency: insights.efficiency })
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
