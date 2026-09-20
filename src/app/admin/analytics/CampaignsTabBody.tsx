// Campaigns tab body — REACH → ATTRIBUTION → EFFICIENCY → ACTION.
//
// Same contract as the other story tabs: insight chip banner, lettered
// SectionHeadings, KPI cards with MetricInfo, visuals, fix queue, roadmap.
// The story here is acquisition integrity: what the tagged work delivered, how
// far the tag survives the visit (first-touch fp_id join), which campaigns
// earn their keep, and whether the tags themselves are governable.

import type { CampaignInsights } from '@/lib/analytics/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Gauge, Megaphone, MousePointerClick, Route, Tag, TrendingUp, Wrench } from 'lucide-react'
import MetricInfo from './MetricInfo'
import SectionHeading from './SectionHeading'
import RoadmapPanel, { type RoadmapItem } from './RoadmapPanel'

const ROADMAP_CAMPAIGNS_TAB: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'UTM registry + first-touch fp_id attribution',
    data: 'utm_source/medium/campaign capture in page_views; clicks joined by entry page',
    kpi: 'Visit-credited clicks · tag durability · uncredited-click queue',
  },
  {
    phase: 'Phase 3',
    feature: 'Influencer & social trend tracking',
    data: 'creator-linked referrer/UTM + platform API data',
    kpi: 'Creator → click → revenue attribution',
  },
]

export type CampaignChip = { label: string; value: string }

type Props = {
  insights: CampaignInsights | null
  chips: CampaignChip[]
}


import CampaignReachChart from './CampaignReachChart'
import CampaignLandingTable from './CampaignLandingTable'
import AttributionJourneyStrip from './AttributionJourneyStrip'

import CampaignEfficiencyMatrix from './CampaignEfficiencyMatrix'
import CampaignTagRegistry from './CampaignTagRegistry'
import CampaignFixQueue from './CampaignFixQueue'

export default function CampaignsTabBody({ insights, chips }: Props) {
  return (
    <div className="space-y-6">
      {/* ── Insight banner ─────────────────────────────────────── */}
      {insights && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
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
              page_views · affiliate_clicks · interactions · devices · articles
            </span>
            <span className="ml-1">
              — first-touch attribution: every visitor is credited to the campaign on their earliest page view in the
              window (the beacons read utm_* from the live URL, so the tag exists on the landing request only, and
              click rows carry the outbound link&apos;s own tags). Reads as reach → attribution → efficiency + tag
              governance → action.
            </span>
          </p>
        </div>
      )}

      {/* ══ A · REACH — what did the tagged work deliver? ═════════ */}
      <SectionHeading
        letter="A"
        title="Reach — what did the tagged work deliver?"
        hint="attribution state over time · where each click lands"
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-sm">Tagged Share</CardTitle>
            <MetricInfo
              metric="Tagged share of traffic"
              definition="Share of all page views in the period that arrived carrying any campaign tag — the only acquisition the site can actually name."
              formula="tagged views ÷ all views × 100"
              ga4Alias="— (session-scoped, not GA4)"
              dataSource="page_views.utm_source / utm_medium / utm_campaign"
              action="A flat zero here means every acquisition number on this tab is contextual. Tag the next placement you ship and this number moves first."
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{insights?.totals.tagRatePct ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(insights?.totals.taggedViews ?? 0).toLocaleString()} of{' '}
              {(insights?.totals.views ?? 0).toLocaleString()} views ·{' '}
              {(insights?.totals.distinctCampaigns ?? 0)} campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-sm">Identified Visitors</CardTitle>
            <MetricInfo
              metric="Identity coverage"
              definition="Share of page views carrying the first-party fp_id cookie — the only durable thread between a campaign entry and a later click."
              formula="views with fp_id ÷ all views × 100"
              ga4Alias="— (first-party)"
              dataSource="page_views.fp_id"
              action="Attribution only exists where the join key exists. If this is low, fix cookie delivery before buying more reach — unidentified views can never be credited."
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{insights?.totals.identityCoveragePct ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(insights?.totals.visitors ?? 0).toLocaleString()} visitors ·{' '}
              {(insights?.totals.unidentifiedViews ?? 0).toLocaleString()} views without an id
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-sm">Credited Clicks</CardTitle>
            <MetricInfo
              metric="Visit-credited affiliate clicks"
              definition="Affiliate clicks whose visitor entered the site on a campaign-tagged page in the window — joined by fp_id, because the click row itself only carries the outbound link's tags."
              formula="clicks by visitors with a tagged entry ÷ clicks by visitors with any in-window entry"
              ga4Alias="— (first-party)"
              dataSource="affiliate_clicks ⋈ page_views on fp_id"
              action="Clicks that cannot be credited sit in the fix queue with names. Chase them before buying more reach."
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {(insights?.attribution.creditedClicks ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {((insights?.attribution.uncreditedClicks ?? 0) +
                (insights?.attribution.unknownIdentityClicks ?? 0)).toLocaleString()}{' '}
              uncreditable clicks in the window
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-sm">Clean Tags</CardTitle>
            <MetricInfo
              metric="Tagged views on clean tags"
              definition="Share of tagged traffic whose raw tuple keeps the house convention — lowercase, hyphenated, always a source and a medium, medium inside the shared vocabulary."
              formula="views on compliance-clean tag tuples ÷ tagged views × 100"
              ga4Alias="— (first-party)"
              dataSource="page_views UTM registry"
              action="A dirty registry forks one campaign into several report lines and splits its budget. Clean the top offenders in the registry below first."
            />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{insights?.efficiency.cleanSharePct ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(insights?.totals.distinctSources ?? 0)} sources · {(insights?.totals.distinctMediums ?? 0)} mediums ·
              active {insights?.totals.activeDays ?? 0}d of the window
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-primary" />
            Campaign Reach — Tagged vs Referrer-Only vs Direct
            <MetricInfo
              metric="Reach strip"
              definition="One column per calendar day, stacked by attribution state: campaign-tagged, referrer-classified-but-untagged, and direct. Same scale across the row so a quiet tagged campaign never hides behind a peak."
              formula="count(views by attribution state) per calendar day (UTC, zero-filled)"
              dataSource="page_views (source + UTM columns)"
              action="Watch the amber band, not the green one: the amber band is traffic someone was kind enough to classify for you and nobody tagged — half-owned reach is the cheapest win on this tab."
            />
          </CardTitle>
          <CardDescription>Every view in exactly one band · hover a column for the day&apos;s split</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignReachChart
            trend={insights?.reach.trend ?? []}
            maxDaily={insights?.reach.maxDaily ?? 0}
            byClass={insights?.reach.byClass ?? []}
            tagRatePct={insights?.totals.tagRatePct ?? 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-brand-primary" />
            Where The Tagged Click Lands — Campaign By Campaign
            <MetricInfo
              metric="Campaign landing table"
              definition="Every campaign tuple paired with the page it actually delivered visitors to, and the depth of that landing: device page, comparison or article count as deep (the visitor can act), everything else is shallow."
              formula="views per raw tag tuple × classifyLandingPath(entry path)"
              dataSource="page_views × devices + articles catalog"
              action="Deep below 50% with real reach means the ad is spending on navigation the visitor will not finish — point the creative at the exact landing page and the verdict changes without touching the budget."
            />
          </CardTitle>
          <CardDescription>Reach × landing truth for every tuple · deep = actable</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignLandingTable campaigns={insights?.reach.topCampaigns ?? []} />
        </CardContent>
      </Card>

      {/* ══ B · ATTRIBUTION — how far the tag survives ═════════════ */}
      <SectionHeading
        letter="B"
        title="Attribution — how far the tag survives the visit"
        hint="one visitor · one entry state · first-touch join by fp_id"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-brand-primary" />
            The Attribution Journey — Visitors → a Second Page → a Click
            <MetricInfo
              metric="Attribution journey strip"
              definition="Visitors bucketed once — by how they ENTERED — then walked down the only downstream journey the first-party data can prove: saw a second page, then clicked a buy link, joined by the fp_id cookie."
              formula="fp_id segments by entry state · engagement = views > 1 · clickers = ≥1 affiliate click in window"
              dataSource="page_views ⋈ affiliate_clicks ⋈ interactions on fp_id"
              action="Compare the three green overlays, not the bars: engagement is the fair comparison between campaigns you ran and traffic you inherited. The durability panel below explains why this model exists at all."
            />
          </CardTitle>
          <CardDescription>First-touch only · a tag lives on the landing request and nowhere else</CardDescription>
        </CardHeader>
        <CardContent>
          <AttributionJourneyStrip
            segments={insights?.attribution.segments ?? []}
            identifiedVisitors={insights?.attribution.identifiedVisitors ?? 0}
            unidentifiedViews={insights?.attribution.unidentifiedViews ?? 0}
            downstreamViews={insights?.attribution.downstreamViews ?? 0}
            downstreamTaggedViews={insights?.attribution.downstreamTaggedViews ?? 0}
            tagDurabilityPct={insights?.attribution.tagDurabilityPct ?? 0}
            creditedClicks={insights?.attribution.creditedClicks ?? 0}
            uncreditedClicks={insights?.attribution.uncreditedClicks ?? 0}
            unknownIdentityClicks={insights?.attribution.unknownIdentityClicks ?? 0}
          />
        </CardContent>
      </Card>

      {/* ══ C · EFFICIENCY — which campaigns earn ═══════════════════ */}
      <SectionHeading
        letter="C"
        title="Efficiency + governance — which campaigns earn, and whether the tags are governable"
        hint="reach × outcome verdicts · channel mix · the registry"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-brand-primary" />
            Campaign Efficiency — Reach × Click Rate
            <MetricInfo
              metric="Efficiency matrix"
              definition="Every campaign plotted on reach (views, √-scaled) against outcome (visit-attributed clicks per 1,000 views). Split lines are the period medians, so the four quadrants always partition the campaigns actually observed."
              formula="x = views (√-scaled) · y = clicks/views×1000 · bubble size = clicks"
              ga4Alias="— (first-party)"
              dataSource="fp_id join + period medians"
              action="Fund the top-right, clone the top-left at higher spend, rewrite the bottom-right landing before touching its budget, and stop the bottom-left."
            />
          </CardTitle>
          <CardDescription>Split at the period medians · bubble size is clicks</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignEfficiencyMatrix
            campaigns={insights?.efficiency.campaigns ?? []}
            reachMedian={insights?.efficiency.reachMedian ?? 0}
            rateMedian={insights?.efficiency.rateMedian ?? 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-brand-primary" />
            The UTM Registry — Every Tag Tuple, Graded
            <MetricInfo
              metric="UTM registry"
              definition="Every raw tag tuple recorded in the period — kept raw on purpose, so Ramadan Sale and ramadan-sale read as two rows and the cost of sloppiness is visible — graded against the house convention with its click verdict attached."
              formula="GROUP BY raw (source, medium, campaign) · house-convention lint + visit-attributed clicks"
              ga4Alias="— (first-party)"
              dataSource="page_views UTM columns"
              action="Work the broken rows before the warn rows: whitespace and case are the cheapest fixes with the largest reporting payoff. Self-referral and dev rows are not actionable and are flagged, not queued."
            />
          </CardTitle>
          <CardDescription>Raw keys, graded rows · channel from the shared medium vocabulary</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignTagRegistry
            campaigns={insights?.efficiency.campaigns ?? []}
            cleanSharePct={insights?.efficiency.cleanSharePct ?? 0}
          />
        </CardContent>
      </Card>

      {/* ══ D · ACTION — the ranked tag queue ═══════════════════════ */}
      <SectionHeading
        letter="D"
        title="Action — the tag queue, ranked by reach at stake"
        hint="uncredited money first · then creator gaps · then campaign fixes"
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-brand-primary" />
              Campaign Fix Queue
              <MetricInfo
                metric="Campaign fix queue"
                definition="One row per fixable gap, ranked by reach at stake. The money rows always lead: clicks whose visitor's entry page carried no campaign tag — the commission exists, but no campaign can be credited."
                formula="stake = reach × weight (uncredited clicks ×8 · creator ×2 · shallow ×1.5 · no-outcome ×1.2 · medium ×1 · convention ×0.4 · stale ×0.3)"
                dataSource="registry × untagged entry sources × fp_id join gaps"
                action="Work top-down: the first rows are the ones where money already moved and nobody got the credit."
              />
            </CardTitle>
            <CardDescription>Prescriptive, prioritised, deep-linked where it counts</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CampaignFixQueue items={insights?.action.fixQueue ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-primary" />
            Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoadmapPanel items={ROADMAP_CAMPAIGNS_TAB} />
        </CardContent>
      </Card>
    </div>
  )
}

