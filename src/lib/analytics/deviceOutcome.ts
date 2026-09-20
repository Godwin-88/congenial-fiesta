// Pure presentation vocabulary for the Devices & Catalog tab.
//
// This module deliberately has NO imports: `src/lib/analytics/queries.ts` pulls
// the Supabase server client, so anything a client chart component needs must
// live in a dependency-free file (same reason `chartFormat.ts` exists). Both the
// server aggregator and the client charts import from here, so the labels and
// palette can never drift between the KPI cards and the visuals.

/** Where a device-page view lands, from a revenue point of view. */
export type DeviceOutcome = 'monetised' | 'live_no_buylink' | 'unpublished' | 'missing'

/** Prescriptive issue codes for the catalog fix queue. */
export type DeviceIssue =
  | 'no_buy_link'
  | 'unpublished_but_trafficked'
  | 'stale_slug'
  | 'broken_link'
  | 'stale_price'
  | 'missing_price'

export const DEVICE_OUTCOME_ORDER: DeviceOutcome[] = ['monetised', 'live_no_buylink', 'unpublished', 'missing']

export const DEVICE_OUTCOME_LABELS: Record<DeviceOutcome, string> = {
  monetised: 'Monetised',
  live_no_buylink: 'Live, no buy link',
  unpublished: 'Not published',
  missing: 'Stale slug',
}

export const DEVICE_OUTCOME_COLORS: Record<DeviceOutcome, string> = {
  monetised: '#10B981',
  live_no_buylink: '#F59E0B',
  unpublished: '#EF4444',
  missing: '#94A3B8',
}

export const DEVICE_OUTCOME_DESCRIPTIONS: Record<DeviceOutcome, string> = {
  monetised: 'Published device page with at least one working buy link — the view can convert.',
  live_no_buylink: 'Published and viewable, but no buy link: the page renders with no way to earn.',
  unpublished: 'The catalog row exists but is not published, so /devices/[brand]/[slug] returns 404.',
  missing: 'No catalog row (or wrong brand slug) matches the path — a stale slug is eating the traffic.',
}

/** Reverse lookup so chart nodes labelled with the outcome label find their colour. */
export function deviceOutcomeFromLabel(label: string): DeviceOutcome | null {
  const found = DEVICE_OUTCOME_ORDER.find((o) => DEVICE_OUTCOME_LABELS[o] === label)
  return found ?? null
}

export const DEVICE_ISSUE_META: Record<DeviceIssue, { label: string; action: string }> = {
  no_buy_link: {
    label: 'No buy link',
    action: 'Add at least one retailer buy link (Jumia / Amazon / Kilimall) — until then the page can never earn.',
  },
  unpublished_but_trafficked: {
    label: 'Unpublished but trafficked',
    action: 'Publish the device, or redirect the path to a live alternative — visitors are hitting a 404 today.',
  },
  stale_slug: {
    label: 'Stale slug',
    action: 'Fix the referring link or add a redirect — this slug no longer exists in the catalog.',
  },
  broken_link: {
    label: 'Broken buy link',
    action: 'Replace the dead retailer URL — the buy box is leaking every click it gets.',
  },
  stale_price: {
    label: 'Stale price',
    action: 'Refresh the price and priceDate so the buy box stops quoting an out-of-date figure.',
  },
  missing_price: {
    label: 'Missing price',
    action: 'Add a price for the link — price-anchored buy boxes convert noticeably better.',
  },
}

export const DEVICE_ISSUE_SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#94A3B8',
}

/** Price tiers (highest to lowest) — the read order for every tier breakdown. */
export const PRICE_TIER_ORDER = ['ultra-premium', 'flagship', 'mid-range', 'budget'] as const

const TIER_LABELS: Record<string, string> = {
  'ultra-premium': 'Ultra-premium',
  flagship: 'Flagship',
  'mid-range': 'Mid-range',
  budget: 'Budget',
  unspecified: 'Unspecified',
}

const CATEGORY_LABELS: Record<string, string> = {
  phones: 'Phones & wearables',
  televisions: 'Televisions',
  sound: 'Sound',
  macs: 'Macs',
  unspecified: 'Unspecified',
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function priceTierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? titleCaseSlug(tier)
}

export function majorCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? titleCaseSlug(category)
}

// ── Retailer taxonomy ─────────────────────────────────────────────────────────
// Three registries have to agree for a click to become commission:
//   1. the catalog    — devices.buy_links[].retailer (also what the buy box and
//                       /api/out/[device]/[retailer] match on, case-sensitively)
//   2. the click log  — affiliate_clicks.retailer
//   3. the rate sheet — affiliate_commission_rates.retailer (drives the proxy)
// The buy box can only render the five known retailers below; anything else
// falls through to "Other", and anything not in the rate sheet is weighted 0.
export const BUYBOX_RETAILER_KEYS = ['jumia', 'amazon', 'kilimall', 'carrier', 'other']

export function normaliseRetailer(value: string): string {
  return value.trim().toLowerCase()
}

export function retailerLabel(retailer: string): string {
  const key = normaliseRetailer(retailer)
  if (!key) return 'Unknown'
  if (BUYBOX_RETAILER_KEYS.includes(key)) return key.charAt(0).toUpperCase() + key.slice(1)
  return titleCaseSlug(key)
}
