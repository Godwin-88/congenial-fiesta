// Pure presentation vocabulary for the Outreach & Leads tab (Phase 14).
//
// Dependency-free, same contract as consideration.ts / community.ts / revenue.ts /
// searchStory.ts / campaigns.ts: the server aggregator (`getOutreachInsights` in
// queries.ts) and the client visuals import from here so pipeline states,
// freshness bands, budget ladders and issue codes can never drift between KPI
// cards, charts and the fix queue.
//
// The tab's story is PIPELINE → DEMAND → SELF-SERVE → ACTION:
//   1. what inbound interest arrived and where it stands (pipeline),
//   2. what the market actually asked for (packages + budgets),
//   3. the visitors who behave like leads without filling a form (self-serve),
//   4. and the ranked work queue (money waiting first).
//
// Data reality the module encodes: sponsor AND press inquiries land in one
// table (`sponsor_inquiries`, press rows carry budget_range='press'), statuses
// are a flat enum with no history, so "aging" is honest days-since-created for
// OPEN rows only. package_interest is free text from the advertise form, which
// is why fuzzy matching against the live package catalog is a first-class
// concept (an unmatched interest is a sales problem, not a data typo).

import type { QualifiedLead } from './queries'

/** Inquiry pipeline state — the DB enum, verbatim. */
export type InquiryStatus = 'new' | 'contacted' | 'declined' | 'closed'

export const INQUIRY_STATUS_ORDER: InquiryStatus[] = ['new', 'contacted', 'declined', 'closed']

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  declined: 'Declined',
  closed: 'Closed',
}

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  new: '#3B82F6',
  contacted: '#F59E0B',
  declined: '#94A3B8',
  closed: '#10B981',
}

export const INQUIRY_STATUS_DESCRIPTIONS: Record<InquiryStatus, string> = {
  new:
    'Untouched inbound: somebody raised a hand and nobody has replied. This is the money-waiting bucket — the oldest row here is the most urgent item on the tab.',
  contacted:
    'A reply went out but the outcome is not recorded yet. Aging rows in this state are pipeline rot: either close them or re-contact them.',
  declined:
    'Passed on. Read for pattern, not for guilt: a budget band or package that keeps ending here is a positioning or pricing problem.',
  closed:
    'Completed work. Cross-check the company against the live sponsor wall — closed deals that never became logos are showcase gaps.',
}

/** Open = the inquiry still expects an answer from us. */
export function isOpenStatus(status: InquiryStatus): boolean {
  return status === 'new' || status === 'contacted'
}

// ── Freshness bands (days since created, OPEN rows only) ────────────────────

export type InquiryFreshness = 'fresh' | 'warm' | 'stale' | 'cold'

export const FRESHNESS_ORDER: InquiryFreshness[] = ['fresh', 'warm', 'stale', 'cold']

export const FRESHNESS_LABELS: Record<InquiryFreshness, string> = {
  fresh: 'Fresh (≤7d)',
  warm: 'Warm (8–21d)',
  stale: 'Stale (22–45d)',
  cold: 'Cold (45d+)',
}

export const FRESHNESS_COLORS: Record<InquiryFreshness, string> = {
  fresh: '#10B981',
  warm: '#F59E0B',
  stale: '#F97316',
  cold: '#EF4444',
}

export const FRESHNESS_DESCRIPTIONS: Record<InquiryFreshness, string> = {
  fresh: 'Inside the week — nothing here is a problem yet.',
  warm: 'Two-to-three weeks old: still recoverable with one deliberate reply.',
  stale: 'Past three weeks unanswered. The prospect has likely bought elsewhere; treat re-contact as a long shot and a process fix.',
  cold: 'A month and a half or more. These are foreclosures, not follow-ups — the value is in why they were allowed to get here.',
}

/** Which freshness band an age in days falls into. */
export function freshnessFor(days: number): InquiryFreshness {
  if (days <= 7) return 'fresh'
  if (days <= 21) return 'warm'
  if (days <= 45) return 'stale'
  return 'cold'
}

// ── Budget ladder ───────────────────────────────────────────────────────────

/** The advertise form's budget options, in ladder order (press rows aside). */
export const BUDGET_LADDER = [
  'Under $300',
  '$300–$500',
  '$500–$800',
  '$800–$2,000',
  '$2,000–$5,000',
  '$5,000–$10,000',
  '$10,000+',
] as const

/** Commercial vs press split — press inquiries ride the same table. */
export const PRESS_BUDGET = 'press'

export function isPressInquiry(budgetRange: string): boolean {
  return budgetRange.trim().toLowerCase() === PRESS_BUDGET
}

export const PRESS_BUDGET_LABEL = 'Press (no budget — coverage request)'

/** Position on the ladder (-1 for press / unknown), for ordering and medians. */
export function budgetRank(budgetRange: string): number {
  const idx = BUDGET_LADDER.findIndex((b) => b === budgetRange.trim())
  return idx
}

/** Ladder tier for a raw budget string (press/unknown ride in their own tiers). */
export function rankToTier(budgetRange: string): string {
  if (isPressInquiry(budgetRange)) return 'Press'
  const rank = budgetRank(budgetRange)
  if (rank < 0) return 'Other'
  if (rank <= 1) return 'Entry'
  if (rank <= 3) return 'Mid'
  return 'Top'
}

/** Display label for tiers, shared by the demand section and tooltips. */
export const BUDGET_LADDER_LABELS: Record<string, string> = {
  Entry: 'Entry tier (Under $300 · $300–$500)',
  Mid: 'Mid tier ($500–$1000 · $1000–$2500)',
  Top: 'Top tier ($2500+ · Custom)',
  Press: PRESS_BUDGET_LABEL,
  Other: 'Other / unrecognized budget string',
}

// ── Package matching (advertise form free text → live catalog) ──────────────

export type PackageMatchKind = 'catalog' | 'fuzzy' | 'unmatched' | 'none'

export const PACKAGE_MATCH_LABELS: Record<PackageMatchKind, string> = {
  catalog: 'Exact catalog match',
  fuzzy: 'Fuzzy match',
  unmatched: 'No live package',
  none: 'Not stated',
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function normalizeOutreachName(value: string): string {
  return normalizeName(value)
}

/**
 * Match a free-text package interest against the live package catalog.
 * exact → token-identical · fuzzy → one side contains the other (or ≥1 shared
 * token) · unmatched → stated but no catalog package explains it (a sales /
 * naming gap, queued) · none → the field was empty.
 */
export function matchPackageInterest(
  interest: string | null | undefined,
  catalogNames: string[],
): { matched: string | null; kind: PackageMatchKind } {
  const stated = normalizeName(interest ?? '')
  if (!stated) return { matched: null, kind: 'none' }

  // 1) exact normalized equality
  for (const name of catalogNames) {
    if (normalizeName(name) === stated) return { matched: name, kind: 'catalog' }
  }
  // 2) containment / shared token
  const statedTokens = new Set(stated.split(' '))
  let best: { name: string; shared: number } | null = null
  for (const name of catalogNames) {
    const norm = normalizeName(name)
    if (!norm) continue
    if (norm.includes(stated) || stated.includes(norm)) {
      return { matched: name, kind: 'fuzzy' }
    }
    const tokens = norm.split(' ')
    const shared = tokens.filter((t) => statedTokens.has(t)).length
    if (shared > 0 && (!best || shared > best.shared)) best = { name, shared }
  }
  if (best) return { matched: best.name, kind: 'fuzzy' }
  return { matched: null, kind: 'unmatched' }
}

// ── Self-serve lead framing (the fp_id audience as CRM-handoff leads) ───────

export type LeadTemperature = 'hot' | 'warm' | 'cold'

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

export const LEAD_TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#94A3B8',
}

/**
 * A self-serve lead has gone quiet when they have not been seen in the last
 * `quietDays` of the window (default 7) — hot leads cooling off are the
 * cheapest recovered revenue on this tab.
 */
export function isQuietLead(lead: QualifiedLead, quietDays = 7): boolean {
  if (!lead.lastSeenAt) return false
  const last = new Date(lead.lastSeenAt).getTime()
  if (Number.isNaN(last)) return false
  return Date.now() - last > quietDays * 86400000
}

// ── Fix queue vocabulary ────────────────────────────────────────────────────

/** Why a row is in the outreach fix queue. */
export type OutreachIssue =
  | 'stale_new'
  | 'press_unanswered'
  | 'aging_contacted'
  | 'package_unmatched'
  | 'hot_lead_cooling'
  | 'won_not_showcased'
  | 'no_website'
  | 'no_inquiries'

export const OUTREACH_ISSUE_META: Record<OutreachIssue, { label: string; action: string }> = {
  stale_new: {
    label: 'Money waiting',
    action:
      'This inquiry has sat untouched for weeks. Reply today — even a decline converts better than silence, and the advertise form promised a follow-up.',
  },
  press_unanswered: {
    label: 'Press inquiry unanswered',
    action:
      'The press-room promise is a short reply, and press coverage compounds. Respond with the media kit link even if the full answer needs another day.',
  },
  aging_contacted: {
    label: 'Pipeline rot',
    action:
      'Contacted but never resolved. Re-contact with a concrete next step, or record the outcome so the pipeline reflects reality.',
  },
  package_unmatched: {
    label: 'Interest points at no live package',
    action:
      'The prospect asked for something the catalog does not sell — quote the closest package manually now, then rename or add the package so the next inquiry lands on it.',
  },
  hot_lead_cooling: {
    label: 'Hot lead gone quiet',
    action:
      'A high-intent visitor (compare/save/click behaviour) has not been seen for days. No CRM email exists for fp_id visitors — recover them with a retargeting-friendly surface: fresh related content, a visible sponsorship CTA, or a sign-in prompt.',
  },
  won_not_showcased: {
    label: 'Closed deal missing from the sponsor wall',
    action:
      'This company completed work but is not on the live sponsors list. Add the logo — social proof is the cheapest conversion lever the advertise page has.',
  },
  no_website: {
    label: 'Inquiry without a company site',
    action:
      'No website means no cheap qualification pass before the call. Look the company up manually and note it in the reply so the next contact starts informed.',
  },
  no_inquiries: {
    label: 'No inbound at all',
    action:
      'Zero inquiries in the window: the advertise and press surfaces are not converting. Check the forms still submit, then point distribution at the media kit.',
  },
}

export function outreachSeverity(stake: number): 'high' | 'medium' | 'low' {
  if (stake >= 25) return 'high'
  if (stake >= 10) return 'medium'
  return 'low'
}

