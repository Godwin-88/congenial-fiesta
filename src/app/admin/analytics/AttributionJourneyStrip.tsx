// Attribution journey strip — the signature visual of the Campaigns tab.
//
// Every visitor is put in exactly one bucket by the page they ENTERED on:
// campaign-tagged, referrer-without-a-tag, or direct. Then each bucket is
// walked down the only journey the first-party data can actually prove:
//
//     visitors → saw a second page → clicked a buy link
//
// joined by the fweezy_fp cookie, because no UTM tag survives the first
// internal navigation (the beacons read the live URL) and the click rows carry
// the OUTBOUND link's own params.
//
// The footer is the honest part: tag durability (how many in-session rows still
// carried a tag — structurally near zero) and the clicks we can see but cannot
// credit to any campaign. That number is the reason this tab exists.

import { ATTRIBUTION_COLORS, ATTRIBUTION_DESCRIPTIONS, type AttributionClass } from '@/lib/analytics/campaigns'

type Segment = {
  attribution: AttributionClass
  label: string
  visitors: number
  views: number
  engagedVisitors: number
  engagedPct: number
  clickers: number
  clicks: number
  clickPct: number
  interactions: number
}

type Props = {
  segments: Segment[]
  identifiedVisitors: number
  unidentifiedViews: number
  downstreamViews: number
  downstreamTaggedViews: number
  tagDurabilityPct: number
  creditedClicks: number
  uncreditedClicks: number
  unknownIdentityClicks: number
}

export default function AttributionJourneyStrip({
  segments,
  identifiedVisitors,
  unidentifiedViews,
  downstreamViews,
  downstreamTaggedViews,
  tagDurabilityPct,
  creditedClicks,
  uncreditedClicks,
  unknownIdentityClicks,
}: Props) {
  if (identifiedVisitors === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No identified visitors in this period ({unidentifiedViews.toLocaleString()} views carry no fp_id) — the
        attribution journey needs the first-party cookie to join page views to clicks.
      </p>
    )
  }

  const maxVisitors = Math.max(1, ...segments.map((s) => s.visitors))
  const uncreditable = uncreditedClicks + unknownIdentityClicks

  return (
    <div className="space-y-4">
      {segments.map((s) => (
        <div key={s.attribution}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ATTRIBUTION_COLORS[s.attribution] }} />
              {s.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{s.visitors.toLocaleString()}</span> visitors ·{' '}
              {s.views.toLocaleString()} views
            </span>
          </div>

          {/* Journey bar: pale width = visitors; solid overlay = engaged; caption = clicked */}
          <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((s.visitors / maxVisitors) * 100, 1)}%`,
                backgroundColor: `${ATTRIBUTION_COLORS[s.attribution]}66`,
                border: `1px solid ${ATTRIBUTION_COLORS[s.attribution]}`,
              }}
              title={`${s.visitors} visitors entered in this state`}
            />
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: `${Math.max((s.visitors / maxVisitors) * (s.engagedPct / 100) * 100, 0)}%`,
                backgroundColor: ATTRIBUTION_COLORS[s.attribution],
              }}
              title={`${s.engagedVisitors} of ${s.visitors} visitors saw more than the entry page (${s.engagedPct}%)`}
            />
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{s.engagedPct}%</span> saw a second page (
              {s.engagedVisitors}/{s.visitors})
            </span>
            <span>
              <span className="font-medium text-foreground">{s.clickers}</span> clickers · {s.clicks} clicks (
              {s.clickPct}% of visitors)
            </span>
            <span>
              <span className="font-medium text-foreground">{s.interactions}</span> interactions
            </span>
          </div>

          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{ATTRIBUTION_DESCRIPTIONS[s.attribution]}</p>
        </div>
      ))}

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tag durability</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {downstreamViews === 0 ? (
              <span className="text-muted-foreground">n/a</span>
            ) : (
              <>
                {tagDurabilityPct}%
                <span className="ml-1 text-sm font-normal text-muted-foreground">of in-session rows</span>
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {downstreamViews === 0 ? (
              <>No tagged visitor saw a second page in this window, so there is nothing to measure yet.</>
            ) : (
              <>
                {downstreamTaggedViews.toLocaleString()} of {downstreamViews.toLocaleString()} rows after a tagged
                landing still carried a tag. Expected near zero: the beacons read utm_* from the live URL, so the tag
                exists on the landing request only — which is exactly why every number here is a first-touch fp_id join
                rather than a column read.
              </>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clicks by attribution</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {creditedClicks.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted-foreground">credited to a campaign</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {uncreditable > 0 ? (
              <>
                <span className="font-semibold text-rose-400">{uncreditable} uncreditable</span> — {uncreditedClicks}{' '}
                from visitors who entered untagged, {unknownIdentityClicks} with no in-window entry at all (no cookie, or
                they arrived before the window opened).
              </>
            ) : (
              <>Every affiliate click in the window belongs to a visitor whose entry carried a campaign tag.</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

