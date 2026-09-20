// Campaign efficiency matrix — reach × click rate, as quadrants.
//
// The classic portfolio read, applied to acquisition: the x axis is how many
// viewers a campaign delivered, the y axis is how many of them acted (clicks per
// 1,000 views). Bubble size is absolute clicks, bubble colour is the verdict.
//
// The two axes answer different questions and that is the point:
//   · low reach + high rate = the audience is right, the spend is not  → TEST
//   · high reach + low rate = the traffic is fine, the offer is not    → OPTIMISE
//   · both high                                                       → SCALE
//   · both low                                                        → PAUSE
// Quadrant splits are the period medians, so the matrix always partitions the
// campaigns actually observed rather than an arbitrary absolute bar.

import type { CampaignTagRow } from '@/lib/analytics/queries'
import { VERDICT_COLORS, VERDICT_DESCRIPTIONS, VERDICT_LABELS, type CampaignVerdict } from '@/lib/analytics/campaigns'

type Props = {
  campaigns: CampaignTagRow[]
  reachMedian: number
  rateMedian: number
}

const VERDICT_ORDER_IN_MATRIX: CampaignVerdict[] = ['scale', 'optimise', 'test', 'pause', 'untracked']

export default function CampaignEfficiencyMatrix({ campaigns, reachMedian, rateMedian }: Props) {
  const graded = campaigns.filter((c) => c.views > 0)
  if (graded.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No campaign-tagged traffic in this period — the efficiency matrix fills as soon as a tagged link delivers
        visitors.
      </p>
    )
  }

  const maxViews = Math.max(...graded.map((c) => c.views), 1)
  const maxRate = Math.max(...graded.map((c) => c.clickRatePer1k), 1)
  // Log-ish x scaling so a single runaway campaign does not crush the rest flat.
  const xOf = (views: number) => Math.sqrt(views / maxViews) * 100
  const yOf = (rate: number) => (rate / maxRate) * 100
  const reachSplit = Math.max(reachMedian, 5)
  const rateSplit = rateMedian > 0 ? rateMedian : 1
  const splitX = xOf(reachSplit)
  const splitY = 100 - yOf(rateSplit)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {VERDICT_ORDER_IN_MATRIX.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VERDICT_COLORS[v] }} />
            <span className="text-foreground">{VERDICT_LABELS[v]}</span>
            <span className="tabular-nums text-muted-foreground">
              {campaigns.filter((c) => c.verdict === v).length}
            </span>
          </span>
        ))}
      </div>

      <div className="relative mt-3 h-72 w-full rounded-lg border border-border bg-foreground/[0.03]">
        {/* Median rules */}
        <div className="absolute bottom-0 top-0 border-l border-dashed border-border" style={{ left: `${splitX}%` }} />
        <div className="absolute left-0 right-0 border-t border-dashed border-border" style={{ bottom: `${100 - splitY}%` }} />

        {/* Quadrant labels */}
        <span className="absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Small reach · strong rate → test harder
        </span>
        <span className="absolute right-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Big reach · strong rate → scale
        </span>
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Small reach · weak rate → pause
        </span>
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Big reach · weak rate → optimise
        </span>

        {/* Bubbles */}
        {graded.map((c, i) => {
          const size = 14 + Math.sqrt(c.clicks) * 9
          const label = c.campaign || '(campaign not set)'
          return (
            <div
              key={`${c.source}|${c.medium}|${c.campaign}|${i}`}
              className="absolute -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-background/60"
              style={{
                left: `${Math.min(Math.max(xOf(c.views), 2), 98)}%`,
                bottom: `${Math.min(Math.max(yOf(c.clickRatePer1k), 2), 98)}%`,
                width: `${Math.min(size, 46)}px`,
                height: `${Math.min(size, 46)}px`,
                backgroundColor: `${VERDICT_COLORS[c.verdict]}cc`,
              }}
              title={`${label} — ${c.views} views · ${c.clicks} clicks · ${c.clickRatePer1k}/1k · ${VERDICT_LABELS[c.verdict]}`}
            >
              <span className="sr-only">{label}</span>
            </div>
          )
        })}

        {/* Axis titles */}
        <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground">0 views</span>
        <span className="absolute -bottom-5 right-0 text-[10px] text-muted-foreground">
          {maxViews.toLocaleString()} views (√ scaled)
        </span>
        <span className="absolute -left-1 top-0 -translate-x-full text-[10px] text-muted-foreground">
          {maxRate}/1k
        </span>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        Quadrant split at the period medians ({reachSplit.toLocaleString()} views · {rateSplit}/1k). Hover a bubble for
        the campaign. {VERDICT_DESCRIPTIONS.scale}
      </p>
    </div>
  )
}
