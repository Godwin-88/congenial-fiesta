// Pure presentation vocabulary for the Campaigns & Acquisition tab (Phase 13).
//
// Dependency-free, same contract as deviceOutcome.ts / consideration.ts /
// community.ts / revenue.ts / searchStory.ts: the server aggregator
// (`getCampaignInsights` in queries.ts) and the client visuals import from here
// so attribution classes, tag-compliance grades, verdicts and the palette can
// never drift between KPI cards, charts and the fix queue.
//
// The tab's story is REACH → ATTRIBUTION → EFFICIENCY → ACTION:
//   1. what the tagged work actually delivered (reach),
//   2. how far the tag survives the visit (attribution integrity),
//   3. which campaigns earn their keep and whether the tags are governable
//      (efficiency + tag lifecycle),
//   4. and the ranked fix queue.
//
// ── The finding this tab is built on ───────────────────────────────────────
// Every UTM surface in the codebase reads the *live URL*:
//   · PageViewBeacon reads window.location.search per page view,
//   · trackEvent (interactions) does the same,
//   · /api/out/[device]/[retailer] reads the OUTBOUND buy link's own params.
// So a campaign tag exists on the landing request and is gone one click later,
// and affiliate_clicks carry the retailer's tags, not ours. The only durable
// link between "which campaign" and "did it make money" is the first-party
// `fp_id` cookie. This tab therefore attributes FIRST-TOUCH BY fp_id, measures
// how many downstream rows still carry a tag (tag durability), and quantifies
// the clicks whose visitor entry carried no tag at all (uncredited money).

/** How a visitor arrived, from the campaign-tag point of view. */
export type AttributionClass = 'tagged' | 'untagged' | 'direct'

export const ATTRIBUTION_ORDER: AttributionClass[] = ['tagged', 'untagged', 'direct']

export const ATTRIBUTION_LABELS: Record<AttributionClass, string> = {
  tagged: 'Campaign-tagged',
  untagged: 'Referrer, no tag',
  direct: 'Direct / no referrer',
}

export const ATTRIBUTION_COLORS: Record<AttributionClass, string> = {
  tagged: '#10B981',
  untagged: '#F59E0B',
  direct: '#94A3B8',
}

export const ATTRIBUTION_DESCRIPTIONS: Record<AttributionClass, string> = {
  tagged:
    'Arrived on a URL carrying utm_source / utm_medium / utm_campaign — the only visitors whose acquisition we can name.',
  untagged:
    'Arrived from an external referrer we can classify (search, social, referral) but with no campaign tag: we know the neighbourhood, not the campaign.',
  direct:
    'No referrer and no tag — bookmarks, apps, copied links and dark social. Unattributable by design, not by failure.',
}

/** Is this row campaign-tagged? Any one of the three params is enough. */
export function isTagged(row: {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}): boolean {
  return Boolean(
    (row.utm_source && row.utm_source.trim()) ||
      (row.utm_medium && row.utm_medium.trim()) ||
      (row.utm_campaign && row.utm_campaign.trim()),
  )
}

/**
 * Attribution class for a landing row. `sourceClass` is the first-party
 * `page_views.source` value ('direct' | 'search' | 'social' | 'referral').
 */
export function attributionClassFor(tagged: boolean, sourceClass: string | null): AttributionClass {
  if (tagged) return 'tagged'
  if (!sourceClass || sourceClass === 'direct') return 'direct'
  return 'untagged'
}

// ── Tag lifecycle (the UTM registry rules) ──────────────────────────────────

/**
 * What is wrong with a tag tuple. These are the house convention rules, kept
 * here so the registry, the fix queue and the docs cannot disagree:
 * lowercase · hyphen-separated · no whitespace · no date/version noise ·
 * a source and a medium always, a medium from the shared vocabulary.
 */
export type TagIssue =
  | 'spaces'
  | 'uppercase'
  | 'underscores'
  | 'dated'
  | 'no_source'
  | 'no_medium'
  | 'unmapped_medium'

export const TAG_ISSUE_META: Record<TagIssue, { label: string; action: string }> = {
  spaces: {
    label: 'Whitespace in tag',
    action: 'Whitespace URL-encodes to %20 and splits the same campaign across report lines — replace it with a hyphen.',
  },
  uppercase: {
    label: 'Uppercase in tag',
    action: 'Case-sensitive grouping turns "Ramadan" and "ramadan" into two campaigns — lowercase every tag.',
  },
  underscores: {
    label: 'Underscores in tag',
    action: 'The house convention is hyphens; underscores ship as literal %5F and fork the campaign name.',
  },
  dated: {
    label: 'Date / version noise',
    action: 'Version and date suffixes (v2, 2026-Q1, final) make a campaign a one-off — keep the version in the creative, not the tag.',
  },
  no_source: {
    label: 'No utm_source',
    action: 'Without a source the channel is unknowable — the medium and campaign alone cannot be reported on.',
  },
  no_medium: {
    label: 'No utm_medium',
    action: 'Without a medium, paid and organic spend on the same source blur together — always declare how it was bought.',
  },
  unmapped_medium: {
    label: 'Medium outside the vocabulary',
    action: 'An unmapped medium cannot be classified as paid, social, creator or owned — pick the closest standard medium.',
  },
}

/** Worst-first, so a registry row reads by its most serious problem. */
export const TAG_ISSUE_ORDER: TagIssue[] = [
  'no_source',
  'no_medium',
  'unmapped_medium',
  'spaces',
  'uppercase',
  'underscores',
  'dated',
]

export type TagCompliance = 'clean' | 'warn' | 'broken'

export const TAG_COMPLIANCE_LABELS: Record<TagCompliance, string> = {
  clean: 'Clean',
  warn: 'Needs cleanup',
  broken: 'Broken',
}

export const TAG_COMPLIANCE_COLORS: Record<TagCompliance, string> = {
  clean: '#10B981',
  warn: '#F59E0B',
  broken: '#EF4444',
}

/**
 * The house tag convention, as a pure check. Takes the RAW (as-recorded)
 * values — the point is to flag how they were actually written.
 */
export function tagIssuesFor(input: {
  source?: string | null
  medium?: string | null
  campaign?: string | null
}): TagIssue[] {
  const source = (input.source ?? '').trim()
  const medium = (input.medium ?? '').trim()
  const campaign = (input.campaign ?? '').trim()
  const all = [source, medium, campaign]
  const issues: TagIssue[] = []

  if (!source) issues.push('no_source')
  if (campaign && !medium) issues.push('no_medium')
  if (medium && classifyMedium(medium) === 'unmapped') issues.push('unmapped_medium')
  if (all.some((v) => /\s/.test(v))) issues.push('spaces')
  if (all.some((v) => /[A-Z]/.test(v))) issues.push('uppercase')
  if (all.some((v) => v.includes('_'))) issues.push('underscores')
  if (all.some((v) => /(^|[-\s])(v\d+|\d{4}|q[1-4]|final|copy|test\d?|new|old)([-\s]|$)/i.test(v))) {
    issues.push('dated')
  }

  // Stable, worst-first order so the UI never renders issues differently.
  return TAG_ISSUE_ORDER.filter((i) => issues.includes(i))
}

export function tagComplianceFor(issues: TagIssue[]): TagCompliance {
  if (issues.length === 0) return 'clean'
  if (issues.some((i) => i === 'no_source' || i === 'spaces' || i === 'uppercase')) return 'broken'
  return 'warn'
}

// ── Channel vocabulary (Distribution / MarCom) ──────────────────────────────

export type ChannelClass =
  | 'paid'
  | 'social'
  | 'creator'
  | 'email'
  | 'affiliate'
  | 'search'
  | 'owned'
  | 'unmapped'

export const CHANNEL_CLASS_ORDER: ChannelClass[] = [
  'paid',
  'social',
  'creator',
  'email',
  'affiliate',
  'search',
  'owned',
  'unmapped',
]

export const CHANNEL_CLASS_LABELS: Record<ChannelClass, string> = {
  paid: 'Paid media',
  social: 'Social',
  creator: 'Creator / influencer',
  email: 'Email',
  affiliate: 'Affiliate & partners',
  search: 'Search',
  owned: 'Owned & offline',
  unmapped: 'Unmapped',
}

export const CHANNEL_CLASS_COLORS: Record<ChannelClass, string> = {
  paid: '#3B82F6',
  social: '#F59E0B',
  creator: '#8B5CF6',
  email: '#06B6D4',
  affiliate: '#14B8A6',
  search: '#6366F1',
  owned: '#64748B',
  unmapped: '#EF4444',
}

export const CHANNEL_CLASS_DESCRIPTIONS: Record<ChannelClass, string> = {
  paid: 'Bought impressions and clicks — the spend has to show up as reach and clicks here or the budget is being wasted.',
  social: 'Organic social distribution: reach is real, but per-post attribution only exists if the link is tagged.',
  creator: 'Creator-led discovery — the trend the audience actually moves on; untagged creator links cannot be renewed selectively.',
  email: 'Owned list and newsletter traffic: usually the highest click rate per view, so it is the cheapest reach to defend.',
  affiliate: 'Partner and affiliate placements pointing at the same catalog the outbound links monetise.',
  search: 'Organic search entry — acquisition we earn editorially; the Search & Discovery tab measures what it then asks for.',
  owned: 'Owned surfaces and offline codes (QR, SMS, print) — reach you control, timing you can compare.',
  unmapped: 'A medium outside the shared vocabulary: it cannot be classified as paid, social, creator or owned, so it cannot be budgeted.',
}

const MEDIUM_VOCAB: Record<string, ChannelClass> = {
  cpc: 'paid',
  ppc: 'paid',
  sem: 'paid',
  paid: 'paid',
  paid_search: 'paid',
  paidsearch: 'paid',
  display: 'paid',
  banner: 'paid',
  retargeting: 'paid',
  remarketing: 'paid',
  paid_social: 'paid',
  paidsocial: 'paid',
  social: 'social',
  organic_social: 'social',
  social_organic: 'social',
  fb: 'social',
  ig: 'social',
  tiktok: 'social',
  creator: 'creator',
  influencer: 'creator',
  kol: 'creator',
  ugc: 'creator',
  creator_led: 'creator',
  email: 'email',
  newsletter: 'email',
  edm: 'email',
  mail: 'email',
  affiliate: 'affiliate',
  aff: 'affiliate',
  partner: 'affiliate',
  search: 'search',
  organic_search: 'search',
  seo: 'search',
  owned: 'owned',
  sms: 'owned',
  whatsapp: 'owned',
  push: 'owned',
  qr: 'owned',
  print: 'owned',
  offline: 'owned',
  direct: 'owned',
  app: 'owned',
}

/** Which channel class a medium belongs to ('unmapped' when unknown). */
export function classifyMedium(medium: string | null | undefined): ChannelClass {
  if (!medium) return 'unmapped'
  const key = medium.trim().toLowerCase().replace(/[-\s]+/g, '_')
  return MEDIUM_VOCAB[key] ?? 'unmapped'
}

// ── Landing depth ───────────────────────────────────────────────────────────

export type LandingKind = 'device' | 'article' | 'compare' | 'video' | 'brand' | 'search' | 'home' | 'other'

export const LANDING_KIND_LABELS: Record<LandingKind, string> = {
  device: 'Device page',
  article: 'Article',
  compare: 'Comparison',
  video: 'Video hub',
  brand: 'Brand hub',
  search: 'Search',
  home: 'Homepage',
  other: 'Other',
}

/** Deep = the click is spent on something that can convert. */
export function landingDepth(kind: LandingKind): 'deep' | 'shallow' {
  return kind === 'device' || kind === 'article' || kind === 'compare' ? 'deep' : 'shallow'
}

export function landingKindLabel(kind: LandingKind): string {
  return LANDING_KIND_LABELS[kind]
}

/**
 * Self-referrals and dev hosts: real page views, but they are not a placement
 * we can chase for a missing tag, so they are excluded from the fix queue
 * (never from reach — the views happened either way).
 */
export function isInternalReferrer(host: string): boolean {
  const h = host.toLowerCase()
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.localhost') ||
    h === 'fweezytech.com' ||
    h === 'www.fweezytech.com' ||
    h.endsWith('.fweezytech.com') ||
    h.endsWith('.vercel.app')
  )
}

/**
 * Classify a landing path against the published catalog. Pure: the caller
 * passes the slug sets so this stays dependency-free (and testable).
 */
export function classifyLandingPath(
  path: string,
  deviceSlugs: Set<string>,
  articleSlugs: Set<string>,
): LandingKind {
  const clean = (path || '/').split('?')[0].replace(/\/+$/, '') || '/'
  if (clean === '/') return 'home'
  if (clean.startsWith('/compare')) return 'compare'
  if (clean.startsWith('/search')) return 'search'
  if (clean.startsWith('/videos')) return 'video'
  if (clean.startsWith('/devices/')) {
    const parts = clean.split('/').filter(Boolean)
    if (parts.length >= 3) return deviceSlugs.has(parts[2]) ? 'device' : 'other'
    return 'brand'
  }
  if (clean.startsWith('/articles/')) {
    const parts = clean.split('/').filter(Boolean)
    return parts.length >= 2 && articleSlugs.has(parts[1]) ? 'article' : 'other'
  }
  return 'other'
}

// ── Campaign verdict (reach × outcome) ──────────────────────────────────────

export type CampaignVerdict = 'scale' | 'optimise' | 'test' | 'pause' | 'untracked'

export const VERDICT_ORDER: CampaignVerdict[] = ['scale', 'optimise', 'test', 'pause', 'untracked']

export const VERDICT_LABELS: Record<CampaignVerdict, string> = {
  scale: 'Scale',
  optimise: 'Optimise',
  test: 'Test harder',
  pause: 'Pause',
  untracked: 'Untracked entry',
}

export const VERDICT_COLORS: Record<CampaignVerdict, string> = {
  scale: '#10B981',
  optimise: '#F59E0B',
  test: '#06B6D4',
  pause: '#EF4444',
  untracked: '#8B5CF6',
}

export const VERDICT_DESCRIPTIONS: Record<CampaignVerdict, string> = {
  scale:
    'Above-median reach AND above-median click rate: the campaign to put more budget and more inventory behind.',
  optimise:
    'Real reach, weak click rate: the traffic arrives and does not act — fix the landing depth and the offer before adding budget.',
  test: 'Small reach, strong click rate: the audience is right, the spend is not — buy more of it before touching anything else.',
  pause: 'Below-median reach and click rate: it consumes creative time without moving either axis. Stop it or rebuild it.',
  untracked:
    'Clicks carry this campaign tag but no tagged landing was recorded in the period — the money happened, the entry was never observed.',
}

/** Clicks per 1,000 views — the rate the verdict is built on. */
export function clickRatePer1k(clicks: number, views: number): number {
  if (views <= 0) return 0
  return Math.round((clicks / views) * 1000 * 10) / 10
}

/**
 * Reach × outcome verdict. Thresholds are the medians of the campaigns in the
 * period (with a floor of 5 views / 1 click per 1k when the median is
 * degenerate), so the quadrants split the observed set rather than an arbitrary
 * absolute bar.
 */
export function campaignVerdict(input: {
  views: number
  clicks: number
  reachMedian: number
  rateMedian: number
}): CampaignVerdict {
  const { views, clicks, reachMedian, rateMedian } = input
  if (views === 0 && clicks > 0) return 'untracked'
  const rate = clickRatePer1k(clicks, views)

  const reachHigh = views >= Math.max(reachMedian, 5)
  const rateHigh = rate >= (rateMedian > 0 ? rateMedian : 1)

  if (reachHigh && rateHigh) return 'scale'
  if (reachHigh) return 'optimise'
  if (rateHigh) return 'test'
  return 'pause'
}

/** Median of a numeric list (0 for an empty list). */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// ── Fix queue vocabulary ────────────────────────────────────────────────────

/** Why a campaign row is in the fix queue. */
export type CampaignIssue =
  | 'unattributed_clicks'
  | 'creator_unattributed'
  | 'untagged_referral'
  | 'shallow_landing'
  | 'campaign_no_click'
  | 'unmapped_medium'
  | 'no_medium'
  | 'naming_violation'
  | 'stale_campaign'
  | 'no_tagged_traffic'

export const CAMPAIGN_ISSUE_META: Record<CampaignIssue, { label: string; action: string }> = {
  unattributed_clicks: {
    label: 'Clicks we cannot credit',
    action:
      'These affiliate clicks belong to visitors whose entry page carried no campaign tag. Tag every distributed landing link and the next statement can be credited to a campaign.',
  },
  creator_unattributed: {
    label: 'Creator traffic untagged',
    action:
      'Social platform referrals with no campaign tag: creator-led discovery is arriving and cannot be renewed selectively. Agree a per-creator campaign name and ship it in the bio link.',
  },
  untagged_referral: {
    label: 'Referrer without a tag',
    action:
      'External referrals we can classify but not name. Add utm_source / utm_medium / utm_campaign to the placement itself — the referrer tells you the platform, never the campaign.',
  },
  shallow_landing: {
    label: 'Campaign lands on a shallow page',
    action:
      'Most of this campaign’s clicks are spent on the homepage or a hub, so the visitor still has to do the navigation. Point the ad at the exact device, comparison or guide the campaign is about.',
  },
  campaign_no_click: {
    label: 'Reach with no outcome',
    action:
      'This campaign delivered visitors and produced zero affiliate clicks. Either the audience is wrong for the inventory, or the landing page never offers the buy link — check buy-link fill before buying more.',
  },
  unmapped_medium: {
    label: 'Medium outside the vocabulary',
    action:
      'The medium cannot be classified as paid, social, creator or owned, so this campaign cannot be budgeted. Re-tag with the closest standard medium.',
  },
  no_medium: {
    label: 'No medium declared',
    action:
      'The campaign carries no utm_medium: paid and organic traffic on the same source blur together. Add the medium the placement was bought as.',
  },
  naming_violation: {
    label: 'Tag breaks the convention',
    action:
      'Whitespace, uppercase, underscores or date/version noise fork one campaign into several report lines. Re-tag to lowercase-hyphen with the version in the creative, then re-share the link.',
  },
  stale_campaign: {
    label: 'Campaign went quiet',
    action:
      'This campaign carried traffic earlier in the window and nothing in the last week. Confirm whether it has ended — an abandoned tag keeps collecting long-tail traffic with no owner.',
  },
  no_tagged_traffic: {
    label: 'No tagged traffic at all',
    action:
      'Nothing in this period arrived with a campaign tag, so every acquisition number here is contextual, not attributable. Start by tagging the next placement you ship.',
  },
}

export function campaignSeverity(stake: number): 'high' | 'medium' | 'low' {
  if (stake >= 20) return 'high'
  if (stake >= 8) return 'medium'
  return 'low'
}

// ── Text helpers (pure) ─────────────────────────────────────────────────────

/** Normalise a tag value for grouping: trim + collapse whitespace, capped. */
export function normalizeTag(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

/** '(not set)' reads better than an empty cell in the registry. */
export function tagLabel(value: string): string {
  return value.length > 0 ? value : '(not set)'
}
