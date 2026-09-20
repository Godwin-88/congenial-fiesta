// Pure presentation vocabulary for the Community & Engagement tab.
//
// Dependency-free, same contract as deviceOutcome.ts / consideration.ts: the
// server aggregator (`getCommunityInsights` in queries.ts) and the client
// charts import from here so health states, grades and the palette can never
// drift between KPI cards, charts and the moderation queue.

/** Health of a single device's social-proof surface. */
export type TrustHealth = 'healthy' | 'thin' | 'stale' | 'silent'

export const TRUST_HEALTH_ORDER: TrustHealth[] = ['healthy', 'thin', 'stale', 'silent']

export const TRUST_HEALTH_LABELS: Record<TrustHealth, string> = {
  healthy: 'Healthy',
  thin: 'Thin',
  stale: 'Stale',
  silent: 'Silent',
}

export const TRUST_HEALTH_COLORS: Record<TrustHealth, string> = {
  healthy: '#10B981',
  thin: '#F59E0B',
  stale: '#8B5CF6',
  silent: '#EF4444',
}

export const TRUST_HEALTH_DESCRIPTIONS: Record<TrustHealth, string> = {
  healthy: 'Multiple recent signals (ratings or comments) within the period — social proof is compounding.',
  thin: 'One signal only: the device has proof, but a single voice can be dismissed as an outlier.',
  stale: 'Proof exists but nothing new this period — it still shows, yet it is ageing out of relevance.',
  silent: 'No rating and no comment ever: the page ships with zero social proof and reads as unsold inventory.',
}

/** Community contribution grades — who the top contributors are. */
export type ContributorGrade = 'advocate' | 'regular' | 'newcomer'

export const CONTRIBUTOR_GRADE_LABELS: Record<ContributorGrade, string> = {
  advocate: 'Advocate',
  regular: 'Regular',
  newcomer: 'Newcomer',
}

export const CONTRIBUTOR_GRADE_COLORS: Record<ContributorGrade, string> = {
  advocate: '#8B5CF6',
  regular: '#3B82F6',
  newcomer: '#10B981',
}

export const CONTRIBUTOR_GRADE_DESCRIPTIONS: Record<ContributorGrade, string> = {
  advocate: '5+ contributions: the voice the catalog leans on — feature them, thank them, keep them.',
  regular: '2–4 contributions: dependable signal — nudge with review prompts at the right moments.',
  newcomer: 'First contribution this period: onboard, respond, and give them a reason to return.',
}

/** Moderation states — the queue the editor works. */
export type ModerationIssue =
  | 'unanswered_question'
  | 'negative_drift'
  | 'orphan_proof'
  | 'single_voice'
  | 'reported_unreviewed'
  | 'high_demand_no_proof'

export const MODERATION_ISSUE_META: Record<ModerationIssue, { label: string; action: string }> = {
  unanswered_question: {
    label: 'Unanswered question',
    action: 'Answer it (or seed a reply) — an unanswered question on a high-traffic device is a conversion leak.',
  },
  negative_drift: {
    label: 'Negative drift',
    action: 'Read the recent comments before promoting this device — sentiment is sliding while traffic stays.',
  },
  orphan_proof: {
    label: 'Proof on a dead slug',
    action: 'Ratings/comments exist but the device is unpublished or missing — migrate the proof before it is lost.',
  },
  single_voice: {
    label: 'Single voice',
    action: 'Solicit a second rating — one reviewer is an outlier, two start a distribution.',
  },
  reported_unreviewed: {
    label: 'Reported, unreviewed',
    action: 'Review the flagged comment — unmoderated reports erode trust in the whole comment surface.',
  },
  high_demand_no_proof: {
    label: 'Traffic without proof',
    action: 'Add a rating prompt to this device — it earns views and clicks but ships with zero social proof.',
  },
}

/** Comment engagement state for a content surface. */
export type EngagementSurface = 'device' | 'article' | 'video'

export const ENGAGEMENT_SURFACE_LABELS: Record<EngagementSurface, string> = {
  device: 'Devices',
  article: 'Articles',
  video: 'Videos',
}

/** Rating distribution buckets (1–5 stars) in read order. */
export const RATING_BUCKETS = [5, 4, 3, 2, 1] as const

export const RATING_BUCKET_LABELS: Record<number, string> = {
  5: '5★',
  4: '4★',
  3: '3★',
  2: '2★',
  1: '1★',
}

export const RATING_BUCKET_COLORS: Record<number, string> = {
  5: '#10B981',
  4: '#84CC16',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
}

/** Bounded 0–10 average rating → a 0–100 trust grade for the strip gauge. */
export function trustGrade(avgRating: number | null, coveragePct: number, volume: number): number {
  const ratingPart = avgRating === null ? 0 : (avgRating / 5) * 60
  const coveragePart = (Math.min(100, coveragePct) / 100) * 25
  const volumePart = Math.min(15, Math.log2(volume + 1) * 3)
  return Math.round(ratingPart + coveragePart + volumePart)
}
