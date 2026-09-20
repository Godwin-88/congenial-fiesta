// Pure presentation vocabulary for the Search & Discovery tab.
//
// Dependency-free, same contract as deviceOutcome.ts / consideration.ts /
// community.ts / revenue.ts: the server aggregator (`getSearchInsights` in
// queries.ts) and the client visuals import from here so answer states, query
// shapes and the palette can never drift between KPI cards, charts and the
// backlog queue.
//
// The tab's story is DEMAND → SUPPLY → HABIT → ACTION:
//   1. what the audience types (demand surface),
//   2. whether the catalog answers it (answer coverage),
//   3. whether search is a habit or a fallback (repeat frequency),
//   4. and the ranked backlog with the fix attached.

/** How well the catalog answered a query. */
export type QueryAnswerState = 'answered' | 'thin' | 'zero' | 'unknown'

export const ANSWER_STATE_ORDER: QueryAnswerState[] = ['answered', 'thin', 'zero', 'unknown']

export const ANSWER_STATE_LABELS: Record<QueryAnswerState, string> = {
  answered: 'Answered',
  thin: 'Thin',
  zero: 'Zero',
  unknown: 'Not recorded',
}

export const ANSWER_STATE_COLORS: Record<QueryAnswerState, string> = {
  answered: '#10B981',
  thin: '#F59E0B',
  zero: '#EF4444',
  unknown: '#64748B',
}

export const ANSWER_STATE_DESCRIPTIONS: Record<QueryAnswerState, string> = {
  answered:
    'Four or more results on average: the catalog has depth on this query — the job is ranking, not supply.',
  thin: 'One to three results on average: a single match is a coin flip for the visitor — one competitor model and the query is lost.',
  zero: 'Nothing matched: the visitor asked a direct question and the site answered with silence — the sharpest content backlog there is.',
  unknown:
    'Logged before result instrumentation landed, so the result count was never captured. Real demand, unmeasured quality — it is excluded from every rate below rather than counted as a miss.',
}

/** Answer state from the average result count a query returned. */
export function answerStateFor(avgResults: number): QueryAnswerState {
  if (avgResults < 1) return 'zero'
  if (avgResults < 4) return 'thin'
  return 'answered'
}

/** The intent shape of a query — what the visitor is actually asking for. */
export type QueryShape =
  | 'brand_only'
  | 'brand_model'
  | 'comparison'
  | 'spec_intent'
  | 'price_intent'
  | 'generic'

export const QUERY_SHAPE_ORDER: QueryShape[] = [
  'brand_model',
  'brand_only',
  'comparison',
  'spec_intent',
  'price_intent',
  'generic',
]

export const QUERY_SHAPE_LABELS: Record<QueryShape, string> = {
  brand_model: 'Brand + model',
  brand_only: 'Brand only',
  comparison: 'Head-to-head',
  spec_intent: 'Spec intent',
  price_intent: 'Price intent',
  generic: 'Generic',
}

export const QUERY_SHAPE_COLORS: Record<QueryShape, string> = {
  brand_model: '#3B82F6',
  brand_only: '#8B5CF6',
  comparison: '#EF4444',
  spec_intent: '#10B981',
  price_intent: '#F59E0B',
  generic: '#94A3B8',
}

export const QUERY_SHAPE_DESCRIPTIONS: Record<QueryShape, string> = {
  brand_model: 'Somebody naming an exact product: the highest purchase intent there is — it must land straight on that page.',
  brand_only: 'A brand with no model: the visitor wants a range view — brand hubs and "best <brand>" guides answer it.',
  comparison: 'Two products in one query: the visitor is deciding — a head-to-head page is the only honest answer.',
  spec_intent: 'Feature-led demand (camera, battery, gaming): wants a ranked buying guide, not one product page.',
  price_intent: 'Budget-led demand: wants a filtered price range — catalog price data has to be complete.',
  generic: 'Short or vague terms: usually navigational or a typo — answer with hubs, not articles.',
}

const COMPARISON_MARKERS = [' vs ', ' versus ', 'compare', 'comparison', 'head to head', 'h2h']
const SPEC_MARKERS = [
  'best', 'camera', 'battery', 'performance', 'gaming', 'display', 'screen', 'chipset',
  'processor', 'snapdragon', 'mediatek', 'helio', 'dimensity', 'exynos', 'ram', 'storage',
  '5g', '4g', 'waterproof', 'water resistant', 'ip68', 'refresh rate', 'amoled', 'oled', 'nfc',
  'charg', 'review', 'specs', 'specification', 'durable', 'selfie',
]
const PRICE_MARKERS = [
  'under', 'below', 'cheap', 'cheapest', 'budget', 'affordable', 'price', 'kes', 'ksh',
  'less than', 'value for money',
]

/**
 * Classify a query's intent shape. `knownBrands` is injected (lowercased brand
 * names + slugs) so this file stays dependency-free and unit-testable.
 *
 * Order matters: comparison and price/spec intent are checked BEFORE the brand
 * rules — "samsung vs iphone camera" is a comparison, not a brand query.
 */
export function classifyQueryShape(rawQuery: string, knownBrands: string[]): QueryShape {
  const q = ` ${rawQuery.toLowerCase().trim().replace(/\s+/g, ' ')} `
  if (q.trim().length === 0) return 'generic'

  if (COMPARISON_MARKERS.some((m) => q.includes(m)) || /\bvs\b/.test(q)) return 'comparison'
  if (PRICE_MARKERS.some((m) => q.includes(m))) return 'price_intent'
  if (SPEC_MARKERS.some((m) => q.includes(m))) return 'spec_intent'

  const tokens = q.trim().split(' ').filter(Boolean)
  const brandSet = new Set(knownBrands.map((b) => b.toLowerCase()))
  if (tokens.some((t) => brandSet.has(t))) {
    return tokens.length === 1 ? 'brand_only' : 'brand_model'
  }
  return 'generic'
}

// ── Backlog vocabulary ──────────────────────────────────────────────────────

/** Why a search row is in the backlog queue. */
export type SearchIssue =
  | 'near_miss'
  | 'zero_result'
  | 'thin_result'
  | 'vague_query'
  | 'unindexed_content'
  | 'unrecorded_result'

export const SEARCH_ISSUE_META: Record<SearchIssue, { label: string; action: string }> = {
  near_miss: {
    label: 'Near miss',
    action: 'The catalog almost certainly has this product — add the query as a synonym or fix the device slug so the match is exact.',
  },
  zero_result: {
    label: 'No results',
    action: 'Nothing matched at all: commission the page this query is asking for (device, guide or comparison).',
  },
  thin_result: {
    label: 'Thin result',
    action: 'One match only: add the alternatives and the buying guide so the visitor compares instead of bouncing.',
  },
  vague_query: {
    label: 'Vague / typo',
    action: 'A single unresolvable token: usually a typo or an out-of-scope term — add a suggestion or an alias, or ignore it if it never repeats.',
  },
  unindexed_content: {
    label: 'Unindexed page',
    action: 'Published but absent from the search index — run the reindex job; the page exists yet search cannot find it.',
  },
  unrecorded_result: {
    label: 'Result not recorded',
    action: 'Logged before result instrumentation, so the miss is unconfirmed. Re-run the term on /search and fix whatever it reveals — do not treat it as a quota of missing content.',
  },
}

export function searchSeverity(stake: number): 'high' | 'medium' | 'low' {
  if (stake >= 12) return 'high'
  if (stake >= 4) return 'medium'
  return 'low'
}

// ── Text helpers (pure) ─────────────────────────────────────────────────────

const STOPWORDS = new Set(['the', 'a', 'an', 'for', 'of', 'in', 'to', 'and', 'with'])

export function tokenizeQuery(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Sørensen–Dice similarity on token sets, 0–1 (1 = same tokens). */
export function diceSimilarity(a: string, b: string): number {
  const setA = new Set(tokenizeQuery(a))
  const setB = new Set(tokenizeQuery(b))
  if (setA.size === 0 || setB.size === 0) return 0
  let shared = 0
  for (const t of setA) if (setB.has(t)) shared++
  return (2 * shared) / (setA.size + setB.size)
}

/** Normalise a query for grouping: lowercase, collapsed whitespace, capped. */
export function normalizeQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 200)
}


