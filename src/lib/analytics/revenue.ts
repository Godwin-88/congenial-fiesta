// Pure presentation vocabulary for the Affiliate & Revenue tab.
//
// Dependency-free, same contract as deviceOutcome.ts / consideration.ts /
// community.ts: the server aggregator (`getRevenueInsights` in queries.ts) and
// the client charts import from here so monetization tiers, reconciliation
// states, channel states and the revenue queue can never drift between KPI
// cards, charts and the ledger.
//
// The tab's story: every click is priced, every retailer is a channel, and the
// revenue proxy must reconcile with real earnings. Nothing on the tab is a
// vanity count — each state names a specific leak in click → price → payout.

/** How well a device page converts its traffic into affiliate clicks. */
export type MonetizationTier = 'converter' | 'engaged' | 'teaser' | 'dormant' | 'unsold'

export const MONETIZATION_ORDER: MonetizationTier[] = [
  'converter',
  'engaged',
  'teaser',
  'dormant',
  'unsold',
]

export const MONETIZATION_LABELS: Record<MonetizationTier, string> = {
  converter: 'Converter',
  engaged: 'Engaged',
  teaser: 'Teaser',
  dormant: 'Dormant',
  unsold: 'Unsold',
}

export const MONETIZATION_COLORS: Record<MonetizationTier, string> = {
  converter: '#10B981',
  engaged: '#3B82F6',
  teaser: '#F59E0B',
  dormant: '#F97316',
  unsold: '#EF4444',
}

export const MONETIZATION_DESCRIPTIONS: Record<MonetizationTier, string> = {
  converter: 'CTR ≥ 3% — the buy box is doing its job; protect these placements and their links.',
  engaged: 'CTR 1–3% — earning, but below converter level; try buy-box position or retailer choice.',
  teaser: 'Clicks exist but CTR < 1% — a trickle; the page sells attention, not intent.',
  dormant: 'Traffic but zero clicks this period — the shelf is stocked and nobody picks anything up.',
  unsold: 'No views this period — no audience to monetize; a demand problem, not a revenue one.',
}

/** CTR thresholds driving the tiers (kept here so UI and aggregator agree). */
export const CONVERTER_CTR = 3
export const ENGAGED_CTR = 1

export function monetizationTier(ctrPct: number, views: number, clicks: number): MonetizationTier {
  if (clicks > 0) {
    if (ctrPct >= CONVERTER_CTR) return 'converter'
    if (ctrPct >= ENGAGED_CTR) return 'engaged'
    return 'teaser'
  }
  return views > 0 ? 'dormant' : 'unsold'
}

/** How trustworthy the proxy vs actual reconciliation is. */
export type ReconState = 'reconciled' | 'overcount' | 'undercount' | 'blind'

export const RECON_LABELS: Record<ReconState, string> = {
  reconciled: 'Reconciled',
  overcount: 'Proxy over-counts',
  undercount: 'Proxy under-counts',
  blind: 'Blind — no actuals',
}

export const RECON_COLORS: Record<ReconState, string> = {
  reconciled: '#10B981',
  overcount: '#F59E0B',
  undercount: '#3B82F6',
  blind: '#EF4444',
}

export const RECON_DESCRIPTIONS: Record<ReconState, string> = {
  reconciled: 'Actual earnings sit within ±10% of the proxy — the rate sheet is honest; export for payout review.',
  overcount: 'The proxy promises more than networks paid — rates are optimistic or clicks are not converting.',
  undercount: 'Networks paid more than the proxy shows — the rate sheet under-prices real commission.',
  blind: 'No earnings imported for the period — import statements before trusting any revenue number.',
}

/** Variance within ±10% of the proxy reads as reconciled. */
export const RECON_TOLERANCE_PCT = 10

export function reconState(totalProxy: number, totalActual: number): ReconState {
  if (totalActual <= 0) return 'blind'
  if (totalProxy <= 0) return 'undercount'
  const variancePct = Math.abs(((totalProxy - totalActual) / totalProxy) * 100)
  if (variancePct <= RECON_TOLERANCE_PCT) return 'reconciled'
  return totalProxy > totalActual ? 'overcount' : 'undercount'
}

/** Health of one retailer as a monetization channel. */
export type ChannelState = 'priced' | 'tax_mismatch' | 'unpriced' | 'idle'

export const CHANNEL_LABELS: Record<ChannelState, string> = {
  priced: 'Priced',
  'tax_mismatch': 'Taxonomy mismatch',
  unpriced: 'Unpriced',
  idle: 'Idle',
}

export const CHANNEL_COLORS: Record<ChannelState, string> = {
  priced: '#10B981',
  'tax_mismatch': '#F59E0B',
  unpriced: '#EF4444',
  idle: '#94A3B8',
}

export const CHANNEL_DESCRIPTIONS: Record<ChannelState, string> = {
  priced: 'Clicks flow and a commission rate matches the key — the channel is earning its keep.',
  'tax_mismatch': 'Clicks flow but the recorded retailer name does not literally match the rate-sheet key (casing/spacing) — every proxy now prices these via a case-insensitive fallback, but any literal-key join downstream silently drops them.',
  unpriced: 'Clicks flow but no commission rate exists for this retailer — real revenue the proxy cannot see.',
  idle: 'A rate is configured but no clicks this period — either the catalog stopped linking or the channel is dead.',
}

/**
 * Normalize a retailer label for joining: lowercase + collapse internal
 * whitespace. The live click stream records 'Amazon'/'Jumia' while the rate
 * sheet keys are lowercase — this join is the taxonomy check.
 */
export function normalizeRetailerKey(retailer: string): string {
  return retailer.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Issue codes for the revenue fix queue. */
export type RevenueIssue =
  | 'unpriced_clicks'
  | 'tax_mismatch'
  | 'no_clicks'
  | 'low_ctr'
  | 'dead_link'
  | 'unimported_actuals'

export const REVENUE_ISSUE_META: Record<RevenueIssue, { label: string; action: string }> = {
  unpriced_clicks: {
    label: 'Unpriced clicks',
    action: 'Add a commission rate for this retailer — every click it receives is invisible to the proxy.',
  },
  'tax_mismatch': {
    label: 'Rate key mismatch',
    action: 'Normalise the recorded retailer name to the rate-sheet key (casing/spacing) — the proxy prices these clicks via a case-insensitive fallback today, and any literal-key join downstream silently drops them.',
  },
  no_clicks: {
    label: 'Traffic without clicks',
    action: 'Check buy-box placement and link count on this device — views are arriving and leaving without a click.',
  },
  low_ctr: {
    label: 'Weak CTR',
    action: 'Move the buy box higher or swap the lead retailer — the page earns attention but not intent.',
  },
  dead_link: {
    label: 'Dead buy link',
    action: 'Replace the flagged URL — a dead link discards the click the page just earned.',
  },
  unimported_actuals: {
    label: 'Actuals missing',
    action: 'Import the network statement for this retailer — proxy without actuals cannot be reconciled.',
  },
}

/** Severity palette — same visual language as the Devices/Community queues. */
export const REVENUE_ISSUE_SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#94A3B8',
}

/** Stake thresholds: KES proxy or views at risk. high ≥100, medium ≥20. */
export function revenueSeverity(stake: number): 'high' | 'medium' | 'low' {
  if (stake >= 100) return 'high'
  if (stake >= 20) return 'medium'
  return 'low'
}

/** Revenue per mille — proxy KES per 1,000 device views (GA4-ish RPM). */
export function rpm(proxy: number, deviceViews: number): number {
  if (deviceViews <= 0) return 0
  return Math.round((proxy / deviceViews) * 1000 * 100) / 100
}
