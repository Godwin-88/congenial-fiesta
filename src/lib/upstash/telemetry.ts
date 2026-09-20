// Upstash account-level telemetry for the Search index.
//
// WHY THIS EXISTS
// The `@upstash/search` SDK exposes no analytics, and the search REST endpoint
// has NO /analytics/* routes (verified live: POST|GET /analytics/top → 404
// "Endpoint not found"). The only supported source of index-side telemetry is
// the account Developer API, authenticated with Basic <email:api_key>.
//
//   GET https://api.upstash.com/v2/search                 → list indexes
//   GET https://api.upstash.com/v2/search/{id}/stats      → index statistics
//
// WHAT IT GIVES THE BI TAB (things first-party logging cannot see):
//   1. Capture-rate reconciliation — how many queries Upstash actually executed
//      vs how many terms we logged. A wide gap means search traffic our
//      analytics never captured (or index traffic from jobs, not visitors).
//   2. Latency percentiles (mean / p99) straight from Upstash.
//   3. Document count + pending ops — cross-checks our own index enumeration.
//
// Production posture: never throws, 60s in-process cache, honest `{ok, error}`
// result so the tab can state exactly why telemetry is off, and a deterministic
// index resolution (env id → endpoint-prefix match from the REST URL → name).

const ACCOUNT_API_BASE = 'https://api.upstash.com/v2'

/** Dashboard periods map onto Upstash's allowed stats periods (90d clamps to 30d). */
const PERIOD_MAP: Record<string, '1h' | '3h' | '12h' | '1d' | '3d' | '7d' | '30d'> = {
  '1h': '1h',
  '3h': '3h',
  '12h': '12h',
  '1d': '1d',
  '3d': '3d',
  '7d': '7d',
  '30d': '30d',
  '90d': '30d',
}

export type UpstashSeriesPoint = { ts: string; value: number }

export interface UpstashSearchTelemetry {
  ok: boolean
  error?: string
  configured: boolean
  indexId: string | null
  indexName: string | null
  period: string
  /** Documents currently in the index (Upstash's own count). */
  documentCount: number | null
  pendingDocumentCount: number | null
  /** Query operations Upstash executed today / this month (account clock). */
  dailyQueryCount: number | null
  monthlyQueryCount: number | null
  /** Sum of the query-throughput series — the period-window execution count. */
  periodQueryCount: number | null
  /** Mean / p99 query latency in milliseconds, latest datapoint of the period. */
  latencyMeanMs: number | null
  latencyP99Ms: number | null
  queryThroughput: UpstashSeriesPoint[]
  fetchedAt: string
}

interface UpstashIndexListItem {
  id?: string
  name?: string
  type?: string
  region?: string
  endpoint?: string
}

interface UpstashStatsPoint {
  x?: string
  y?: number
}

interface UpstashIndexStats {
  pending_index_count?: number
  current_vector_count?: number
  daily_query_count?: number
  daily_update_count?: number
  monthly_query_count?: number
  monthly_update_count?: number
  monthly_bandwidth_usage?: number
  storage_usage?: number
  monthly_cost?: number
  query_throughput?: UpstashStatsPoint[]
  query_latency_mean?: UpstashStatsPoint[]
  query_latency_99?: UpstashStatsPoint[]
}

export function isAccountTelemetryConfigured(): boolean {
  return Boolean(process.env.UPSTASH_EMAIL && process.env.UPSTASH_API_KEY)
}

function basicAuthHeader(): string | null {
  const email = process.env.UPSTASH_EMAIL
  const key = process.env.UPSTASH_API_KEY
  if (!email || !key) return null
  try {
    return `Basic ${Buffer.from(`${email}:${key}`).toString('base64')}`
  } catch {
    return null
  }
}

async function accountGet(path: string): Promise<{ ok: boolean; status: number; body: unknown; error?: string }> {
  const auth = basicAuthHeader()
  if (!auth) return { ok: false, status: 0, body: null, error: 'UPSTASH_EMAIL / UPSTASH_API_KEY not configured' }

  // One retry with backoff — the account API rate-limits bursts (429) and
  // occasionally answers 5xx; a single retry removes nearly all page-render noise.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400))
    try {
      const res = await fetch(`${ACCOUNT_API_BASE}${path}`, {
        headers: { Authorization: auth },
        // The account API is metadata, not user-facing traffic — never let it
        // hold a page render hostage.
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      const text = await res.text()
      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) continue
        return { ok: false, status: res.status, body: null, error: `HTTP ${res.status} after retry` }
      }
      if (!res.ok) {
        return { ok: false, status: res.status, body: null, error: `HTTP ${res.status}: ${text.slice(0, 160)}` }
      }
      try {
        return { ok: true, status: res.status, body: JSON.parse(text) as unknown }
      } catch {
        return { ok: false, status: res.status, body: null, error: 'Unparseable response body' }
      }
    } catch (e) {
      if (attempt === 0) continue
      return { ok: false, status: 0, body: null, error: e instanceof Error ? e.message : String(e) }
    }
  }
  return { ok: false, status: 0, body: null, error: 'unreachable' }
}


/**
 * Resolve the Search index id that backs `UPSTASH_SEARCH_REST_URL`.
 *
 * Order: explicit `UPSTASH_SEARCH_INDEX_ID` → endpoint-prefix match derived from
 * the REST URL host (e.g. lucky-earwig-82089-gcp-usc1-search.upstash.io matches
 * the account's `endpoint: lucky-earwig-82089-gcp-usc1`) → name match → the sole
 * index on the account.
 */
export async function resolveSearchIndexId(): Promise<{ id: string | null; name: string | null; error?: string }> {
  const explicit = process.env.UPSTASH_SEARCH_INDEX_ID?.trim()
  if (explicit) return { id: explicit, name: process.env.UPSTASH_SEARCH_INDEX_NAME?.trim() ?? null }

  const list = await accountGet('/search')
  if (!list.ok) return { id: null, name: null, error: list.error }
  if (!Array.isArray(list.body)) return { id: null, name: null, error: 'Unexpected index-list shape' }

  const indexes = list.body as UpstashIndexListItem[]
  if (indexes.length === 0) return { id: null, name: null, error: 'No search indexes on this account' }

  // Endpoint prefix from the REST URL host: strip the trailing `-search.upstash.io`.
  const restHost = (() => {
    try {
      return new URL(process.env.UPSTASH_SEARCH_REST_URL ?? '').hostname
    } catch {
      return ''
    }
  })()
  const endpointPrefix = restHost.replace(/-search\.upstash\.io$/, '')

  const byEndpoint = indexes.find((i) => i.endpoint && endpointPrefix && i.endpoint === endpointPrefix)
  const wanted = process.env.UPSTASH_SEARCH_INDEX_NAME?.trim()
  const byName = wanted ? indexes.find((i) => i.name === wanted) : undefined
  const sole = indexes.length === 1 ? indexes[0] : undefined
  const match = byEndpoint ?? byName ?? sole

  if (!match?.id) {
    return {
      id: null,
      name: null,
      error: `Could not identify the search index (${indexes.length} on account; REST host "${restHost}")`,
    }
  }
  return { id: match.id, name: match.name ?? null }
}

function toSeries(points: UpstashStatsPoint[] | undefined): UpstashSeriesPoint[] {
  return (points ?? [])
    .filter((p) => typeof p.y === 'number' && Number.isFinite(p.y as number))
    .map((p) => ({ ts: String(p.x ?? ''), value: p.y as number }))
}

function latest(points: UpstashSeriesPoint[]): number | null {
  return points.length > 0 ? points[points.length - 1].value : null
}

/** Latest datapoint that actually carries traffic — an idle last bucket reads as 0ms. */
function latestActive(points: UpstashSeriesPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value > 0) return points[i].value
  }
  return null
}

/**
 * Total operations over the stats window from a THROUGHPUT series.
 *
 * Upstash's `query_throughput` is a RATE (queries per second) sampled at 60
 * datapoints across the window — summing it directly yields a meaningless
 * fraction. The correct window total is mean(rate) × span of the samples. The
 * span is derived from the series' own timestamps so a 1h window and a 30d
 * window both integrate correctly.
 */
function integrateThroughput(points: UpstashSeriesPoint[]): number | null {
  if (points.length === 0) return null
  const times = points.map((p) => new Date(p.ts.replace(/ \+\d{4} UTC$/, 'Z')).getTime()).filter((t) => Number.isFinite(t))
  if (times.length < 2) return null
  const spanSeconds = (Math.max(...times) - Math.min(...times)) / 1000
  if (spanSeconds <= 0) return null
  const meanRate = points.reduce((s, p) => s + p.value, 0) / points.length
  return Math.max(0, Math.round(meanRate * spanSeconds))
}


// ── in-process cache — the account API is rate-limited metadata, not traffic ──
const CACHE_TTL_MS = 60_000
let cache: { key: string; at: number; value: UpstashSearchTelemetry } | null = null

export async function fetchUpstashSearchTelemetry(period: string): Promise<UpstashSearchTelemetry> {
  const upstashPeriod = PERIOD_MAP[period] ?? '30d'
  const cacheKey = upstashPeriod

  if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value
  }

  const base: UpstashSearchTelemetry = {
    ok: false,
    configured: isAccountTelemetryConfigured(),
    indexId: null,
    indexName: null,
    period: upstashPeriod,
    documentCount: null,
    pendingDocumentCount: null,
    dailyQueryCount: null,
    monthlyQueryCount: null,
    periodQueryCount: null,
    latencyMeanMs: null,
    latencyP99Ms: null,
    queryThroughput: [],
    fetchedAt: new Date().toISOString(),
  }

  if (!base.configured) {
    const value = { ...base, error: 'UPSTASH_EMAIL / UPSTASH_API_KEY not configured' }
    cache = { key: cacheKey, at: Date.now(), value }
    return value
  }

  const resolved = await resolveSearchIndexId()
  if (!resolved.id) {
    const value = { ...base, error: resolved.error ?? 'Index id could not be resolved' }
    cache = { key: cacheKey, at: Date.now(), value }
    return value
  }

  // Some index tiers reject the widest windows outright ("You cannot get metrics
  // for period: 30d"), so the request walks down the allowed list and the tab
  // reports the window that actually served the data via `upstashPeriod`.
  const FALLBACKS = [upstashPeriod, '7d', '3d', '1d'].filter(
    (p, i, all) => all.indexOf(p) === i,
  ) as Array<'1h' | '3h' | '12h' | '1d' | '3d' | '7d' | '30d'>

  let stats: { ok: boolean; status: number; body: unknown; error?: string } | null = null
  let servedPeriod = upstashPeriod
  for (const candidate of FALLBACKS) {
    const attempt = await accountGet(`/search/${resolved.id}/stats?period=${candidate}`)
    servedPeriod = candidate
    if (attempt.ok) {
      stats = attempt
      break
    }
    stats = attempt
  }

  if (!stats || !stats.ok) {
    const value = {
      ...base,
      indexId: resolved.id,
      indexName: resolved.name,
      period: servedPeriod,
      error: stats?.error ?? 'Stats unavailable',
    }
    cache = { key: cacheKey, at: Date.now(), value }
    return value
  }

  const raw = stats.body as UpstashIndexStats
  const throughput = toSeries(raw.query_throughput)
  const latencyMean = toSeries(raw.query_latency_mean)
  const latencyP99 = toSeries(raw.query_latency_99)

  const value: UpstashSearchTelemetry = {
    ok: true,
    configured: true,
    indexId: resolved.id,
    indexName: resolved.name,
    period: servedPeriod,
    documentCount: typeof raw.current_vector_count === 'number' ? raw.current_vector_count : null,
    pendingDocumentCount: typeof raw.pending_index_count === 'number' ? raw.pending_index_count : null,
    dailyQueryCount: typeof raw.daily_query_count === 'number' ? raw.daily_query_count : null,
    monthlyQueryCount: typeof raw.monthly_query_count === 'number' ? raw.monthly_query_count : null,
    periodQueryCount: integrateThroughput(throughput),
    latencyMeanMs: latestActive(latencyMean),
    latencyP99Ms: latestActive(latencyP99),
    queryThroughput: throughput,
    fetchedAt: new Date().toISOString(),
  }
  cache = { key: cacheKey, at: Date.now(), value }
  return value
}

