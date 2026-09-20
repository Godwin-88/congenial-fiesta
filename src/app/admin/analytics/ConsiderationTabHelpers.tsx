import {
  QUALIFICATION_LABELS,
  QUALIFICATION_COLORS,
  type QualificationTier,
} from '@/lib/analytics/consideration'
import type { ConsiderationInsights, DeviceInsights } from '@/lib/analytics/queries'

type DeviceChip = { label: string; value: string }

export function deviceChipsFor(insights: DeviceInsights): DeviceChip[] {
  const { catalog, demand, leakage, distribution } = insights
  const chips: DeviceChip[] = [
    { label: 'Buy-link fill', value: `${catalog.fillRatePct}% (${catalog.withBuyLink}/${catalog.published})` },
    { label: 'Monetised views', value: `${leakage.monetisedSharePct}%` },
  ]
  if (leakage.wastedViews > 0) {
    chips.push({ label: 'Ghost demand', value: `${leakage.wastedViews.toLocaleString()} views at a dead end` })
  }
  if (demand.byTier.length > 0) {
    const topTier = [...demand.byTier].sort((a, b) => b.views - a.views)[0]
    if (topTier && topTier.views > 0) {
      chips.push({ label: 'Top tier', value: `${topTier.label} · ${topTier.views.toLocaleString()} views` })
    }
  }
  if (distribution.retailerCoverage.length > 0) {
    const topRetailer = distribution.retailerCoverage[0]
    chips.push({ label: 'Broadest retailer', value: `${topRetailer.label} · ${topRetailer.devices} devices` })
  }
  if (leakage.fixQueue.length > 0) {
    const atRisk = leakage.fixQueue.reduce((sum, item) => sum + item.viewsAtRisk, 0)
    chips.push({ label: 'Fix queue', value: `${leakage.fixQueue.length} issues · ${atRisk.toLocaleString()} views at risk` })
  }
  return chips
}

type ConsiderationChip = { label: string; value: string }

export function considerationChipsFor(insights: ConsiderationInsights): ConsiderationChip[] {
  const chips: ConsiderationChip[] = [
    {
      label: 'Browser → buyer',
      value: `${insights.funnel.browserToBuyerPct}% (${insights.funnel.buyClickers.toLocaleString()}/${insights.funnel.browsers.toLocaleString()})`,
    },
  ]
  const hot = insights.audience.totals.hot
  const warm = insights.audience.totals.warm
  if (hot + warm > 0) {
    chips.push({ label: 'Hot + warm', value: `${(hot + warm).toLocaleString()} visitors` })
  }
  if (insights.mix.totals.comparePageViews > 0) {
    chips.push({
      label: 'Comparison runs',
      value: `${insights.demand.totalPairRuns.toLocaleString()} across ${insights.demand.topPairs.length} rivalries`,
    })
  }
  if (insights.demand.topPairs.length > 0) {
    const leader = insights.demand.topPairs[0]
    chips.push({ label: 'Top rivalry', value: `${leader.label} · ${leader.runs} runs` })
  }
  if (insights.action.fixQueue.length > 0) {
    chips.push({
      label: 'Consideration queue',
      value: `${insights.action.fixQueue.length} issues · ${insights.action.interestAtStake.toLocaleString()} interest at stake`,
    })
  }
  return chips
}

export function tierBadgeClass(tier: QualificationTier): string {
  switch (tier) {
    case 'hot':
      return 'bg-red-500/15 text-red-400'
    case 'warm':
      return 'bg-amber-500/15 text-amber-400'
    default:
      return 'bg-foreground/10 text-muted-foreground'
  }
}

export function tierLabel(tier: QualificationTier): string {
  return QUALIFICATION_LABELS[tier]
}

/** Inline dot for scoreboard / tier rows — mirrors the thermometer palette. */
export function TierDot({ tier }: { tier: QualificationTier }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: QUALIFICATION_COLORS[tier] }}
      aria-hidden="true"
    />
  )
}
