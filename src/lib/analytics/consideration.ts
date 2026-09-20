// Pure presentation vocabulary for the Compare & Consideration tab.
//
// Dependency-free, same contract as `deviceOutcome.ts`: the server aggregator
// (`getConsiderationInsights` in queries.ts) and the client charts import from
// here so intent actions, funnel stages, qualification tiers and the palette
// can never drift between KPI cards, charts and the scoreboard.

/** First-party intent actions recorded by the interactions beacon. */
export type IntentAction = 'save' | 'add_to_compare' | 'watch' | 'related_click'

export const INTENT_ACTION_ORDER: IntentAction[] = ['add_to_compare', 'save', 'watch', 'related_click']

export const INTENT_ACTION_LABELS: Record<IntentAction, string> = {
  add_to_compare: 'Add to compare',
  save: 'Save',
  watch: 'Video watch',
  related_click: 'Related-device click',
}

export const INTENT_ACTION_COLORS: Record<IntentAction, string> = {
  add_to_compare: '#8B5CF6',
  save: '#3B82F6',
  watch: '#EF4444',
  related_click: '#10B981',
}

export const INTENT_ACTION_DESCRIPTIONS: Record<IntentAction, string> = {
  add_to_compare: 'A shortlist entry — the visitor named two or more devices worth comparing side by side.',
  save: 'A bookmark with intent — the visitor wants this device back later, usually at decision time.',
  watch: 'A video review engagement tied to a device; attention with audio on.',
  related_click: 'A lateral move — the visitor finished one device page and opened a related one instead of leaving.',
}

/** Weight per intent action in the qualification score (shared with getQualifiedLeads). */
export const INTENT_WEIGHTS: Record<IntentAction, number> = {
  add_to_compare: 3,
  save: 2,
  watch: 1,
  related_click: 1,
}

/** Affiliate click weight used by the shared qualification score. */
export const AFFILIATE_CLICK_WEIGHT = 2

/** Signed-in bonus used by the shared qualification score. */
export const SIGNED_IN_BONUS = 2

/** Qualification tiers — the MQL-equivalent audience buckets. */
export type QualificationTier = 'hot' | 'warm' | 'cold'

export const QUALIFICATION_ORDER: QualificationTier[] = ['hot', 'warm', 'cold']

export const QUALIFICATION_LABELS: Record<QualificationTier, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

export const QUALIFICATION_COLORS: Record<QualificationTier, string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#94A3B8',
}

export const QUALIFICATION_DESCRIPTIONS: Record<QualificationTier, string> = {
  hot: 'Purchase-ready: scored 8+ from compare + save + watch + clicks. Retarget this visitor with the devices they shortlisted.',
  warm: 'Considering: scored 4–7. One more comparison or price drop away from purchase — keep them in the loop.',
  cold: 'Browsing: scored under 4. Curious, not committed; worth reach, not budget.',
}

/** Map a qualification score to its tier (mirrors INTENT_WEIGHTS thresholds). */
export function qualificationTier(score: number): QualificationTier {
  if (score >= 8) return 'hot'
  if (score >= 4) return 'warm'
  return 'cold'
}

/** Funnel stages — the order the tab reads, from browsing to buying. */
export type FunnelStage = 'browse' | 'save' | 'compare_run' | 'buy_click'

export const FUNNEL_ORDER: FunnelStage[] = ['browse', 'save', 'compare_run', 'buy_click']

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  browse: 'Browsers',
  save: 'Savers',
  compare_run: 'Comparers',
  buy_click: 'Buy clickers',
}

export const FUNNEL_COLORS: Record<FunnelStage, string> = {
  browse: '#3B82F6',
  save: '#8B5CF6',
  compare_run: '#F59E0B',
  buy_click: '#10B981',
}

export const FUNNEL_DESCRIPTIONS: Record<FunnelStage, string> = {
  browse: 'Distinct visitors who viewed any device page in the period.',
  save: 'Visitors who saved at least one device (or comparison) for later.',
  compare_run: 'Visitors who added at least one device to a comparison.',
  buy_click: 'Visitors who clicked an outbound buy link for a device.',
}

/** Readiness for one device's consideration story. */
export type ConsiderationIssue =
  | 'high_interest_no_links'
  | 'conversion_leak'
  | 'save_only'
  | 'watch_only'
  | 'compare_orphan'
  | 'lopsided_pair'

export const CONSIDERATION_ISSUE_META: Record<ConsiderationIssue, { label: string; action: string }> = {
  high_interest_no_links: {
    label: 'High interest, no buy path',
    action: 'Add at least one retailer buy link — this device is being shortlisted and cannot convert.',
  },
  conversion_leak: {
    label: 'Intent not converting',
    action: 'Check the buy box: price missing, stale price, or a single retailer is throttling conversion.',
  },
  save_only: {
    label: 'Saved, never compared',
    action: 'Link it from the comparison that fits its tier — saved devices that never enter a compare stall.',
  },
  watch_only: {
    label: 'Watched, never shortlisted',
    action: 'Embed the video review on the device page and surface the buy box under it.',
  },
  compare_orphan: {
    label: 'Compared pair, no traffic data',
    action: 'Check whether the pair is reachable: broken slugs or unpublished rows starve a real comparison.',
  },
  lopsided_pair: {
    label: 'Lopsided comparison',
    action: 'Promote the quieter device inside the pair — one side carries the whole comparison.',
  },
}

export const ISSUE_SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#94A3B8',
}
