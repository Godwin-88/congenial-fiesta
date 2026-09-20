import {
  QUALIFICATION_LABELS,
  QUALIFICATION_COLORS,
  type QualificationTier,
} from '@/lib/analytics/consideration'
import type { ConsiderationInsights, DeviceInsights, CommunityInsights, RevenueInsights } from '@/lib/analytics/queries'
import { RECON_LABELS } from '@/lib/analytics/revenue'

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

type CommunityChip = { label: string; value: string }

export function communityChipsFor(insights: CommunityInsights): CommunityChip[] {
  const chips: CommunityChip[] = [
    { label: 'Trust grade', value: `${insights.trust.totals.grade}/100` },
    {
      label: 'Proof coverage',
      value: `${insights.trust.totals.coveragePct}% (${insights.trust.totals.coveredDevices}/${insights.trust.totals.publishedDevices})`,
    },
    {
      label: 'Signals this period',
      value: `${(insights.trust.totals.periodRatings + insights.trust.totals.periodComments).toLocaleString()} (${insights.trust.totals.periodRatings}★ · ${insights.trust.totals.periodComments}💬)`,
    },
  ]
  if (insights.trust.totals.avgRating !== null) {
    chips.push({ label: 'Avg rating', value: `${insights.trust.totals.avgRating}/5` })
  }
  chips.push({ label: 'Silent devices', value: `${insights.trust.silentDevices.toLocaleString()}` })
  if (insights.people.totals.advocates > 0) {
    chips.push({ label: 'Advocates', value: `${insights.people.totals.advocates}` })
  }
  if (insights.action.fixQueue.length > 0) {
    chips.push({
      label: 'Moderation queue',
      value: `${insights.action.fixQueue.length} items`,
    })
  }
  return chips
}

type RevenueChip = { label: string; value: string }

export function revenueChipsFor(insights: RevenueInsights): RevenueChip[] {
  const chips: RevenueChip[] = [
    { label: 'Est. proxy', value: `KES ${insights.money.totals.proxy.toLocaleString()}` },
    { label: 'Clicks', value: insights.money.totals.clicks.toLocaleString() },
    { label: 'Device CTR', value: `${insights.money.totals.ctr}%` },
  ]
  if (insights.channels.ledger.length > 0) {
    chips.push({
      label: 'Channels',
      value: `${insights.channels.ledger.filter((c) => c.state === 'priced').length} priced / ${insights.channels.ledger.filter((c) => c.state !== 'priced' && c.state !== 'idle').length} leaking`,
    })
  }
  chips.push({ label: 'Recon', value: RECON_LABELS[insights.money.recon.state] })
  if (insights.money.totals.unpricedClicks > 0) {
    chips.push({ label: 'Unpriced clicks', value: `${insights.money.totals.unpricedClicks} (priced at 0)` })
  }
  if (insights.action.fixQueue.length > 0) {
    chips.push({ label: 'Revenue queue', value: `${insights.action.fixQueue.length} leaks` })
  }
  return chips
}
