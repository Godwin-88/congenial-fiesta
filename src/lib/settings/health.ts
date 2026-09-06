import { createClient } from '@supabase/supabase-js'
import { redis, isRedisConfigured } from '@/lib/upstash/redis'

/**
 * Pillar 2 — Integration health & connection testing.
 *
 * Probes each wired external service and reports:
 *   configured  → the env vars / overrides are present
 *   connected   → a live, non-destructive request succeeds
 *   latencyMs   → how long the probe took
 *
 * Results are cached in Redis for 60s (so the console doesn't hammer
 * providers); ?refresh=1 on the API bypasses the cache.
 */

export type ServiceHealth =
  | 'ok'
  | 'degraded'
  | 'error'
  | 'not-configured'

export interface HealthProbe {
  service: string
  slug: string
  category: string
  configured: boolean
  connected: boolean | null
  status: ServiceHealth
  message: string
  latencyMs: number | null
  checkedAt: string
  counts?: { label: string; value: number | string }[]
}

const CACHE_KEY = 'health:overview:v1'
const CACHE_TTL = 60

async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fn()
  } finally {
    clearTimeout(timer)
  }
}

function configured(...vals: Array<string | undefined>): boolean {
  return vals.every((v) => !!v && v.length > 0 && !v.startsWith('your_') && v !== 'YOUR_KEY_HERE')
}

function mk(partial: Omit<HealthProbe, 'checkedAt'>): HealthProbe {
  return { ...partial, checkedAt: new Date().toISOString() }
}

// ── Probes ────────────────────────────────────────────────────────────────

async function probeSupabase(): Promise<HealthProbe> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!configured(url, key)) return mk({ service: 'Supabase', slug: 'supabase', category: 'database', configured: false, connected: null, status: 'not-configured', message: 'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', latencyMs: null })
  const start = Date.now()
  try {
    const client = createClient(url!, key!, { auth: { persistSession: false } })
    const { error } = await withTimeout(
      async () => {
        const r = await client.from('site_settings').select('id').limit(1)
        return r
      },
      4000
    )
    const latencyMs = Date.now() - start
    if (error) return mk({ service: 'Supabase', slug: 'supabase', category: 'database', configured: true, connected: false, status: 'error', message: error.message, latencyMs })
    return mk({ service: 'Supabase', slug: 'supabase', category: 'database', configured: true, connected: true, status: 'ok', message: 'Connected to Postgres', latencyMs })
  } catch (e) {
    return mk({ service: 'Supabase', slug: 'supabase', category: 'database', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout / network', latencyMs: Date.now() - start })
  }
}

async function probeRedis(): Promise<HealthProbe> {
  if (!isRedisConfigured) return mk({ service: 'Upstash Redis', slug: 'upstash-redis', category: 'cache', configured: false, connected: null, status: 'not-configured', message: 'UPSTASH_REDIS_REST_URL / TOKEN not set', latencyMs: null })
  const start = Date.now()
  try {
    const pong = await withTimeout(() => redis.ping(), 4000)
    return mk({ service: 'Upstash Redis', slug: 'upstash-redis', category: 'cache', configured: true, connected: true, status: 'ok', message: `pong ${pong ?? ''}`.trim(), latencyMs: Date.now() - start })
  } catch (e) {
    return mk({ service: 'Upstash Redis', slug: 'upstash-redis', category: 'cache', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeQStash(): Promise<HealthProbe> {
  const token = process.env.QSTASH_TOKEN
  if (!configured(token)) return mk({ service: 'QStash', slug: 'qstash', category: 'queue', configured: false, connected: null, status: 'not-configured', message: 'QSTASH_TOKEN not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(
      () => fetch('https://qstash.upstash.io/v2/schedules', { headers: { Authorization: `Bearer ${token}` } }),
      4000
    )
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'QStash', slug: 'qstash', category: 'queue', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    const data = await res.json().catch(() => null)
    const count = Array.isArray(data) ? data.length : 0
    return mk({ service: 'QStash', slug: 'qstash', category: 'queue', configured: true, connected: true, status: 'ok', message: `Connected · ${count} schedules`, latencyMs, counts: [{ label: 'schedules', value: count }] })
  } catch (e) {
    return mk({ service: 'QStash', slug: 'qstash', category: 'queue', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeUpstashSearch(): Promise<HealthProbe> {
  const url = process.env.UPSTASH_SEARCH_REST_URL
  const token = process.env.UPSTASH_SEARCH_REST_TOKEN
  if (!configured(url, token)) return mk({ service: 'Upstash Search', slug: 'upstash-search', category: 'search', configured: false, connected: null, status: 'not-configured', message: 'UPSTASH_SEARCH_REST_URL / TOKEN not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch(`${url}/info`, { headers: { Authorization: `Bearer ${token}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'Upstash Search', slug: 'upstash-search', category: 'search', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    const data = await res.json().catch(() => null) as { count?: number } | null
    return mk({ service: 'Upstash Search', slug: 'upstash-search', category: 'search', configured: true, connected: true, status: 'ok', message: `Connected · ${data?.count ?? '?'} docs`, latencyMs, counts: [{ label: 'docs', value: data?.count ?? '?' }] })
  } catch (e) {
    return mk({ service: 'Upstash Search', slug: 'upstash-search', category: 'search', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeUpstashVector(): Promise<HealthProbe> {
  const url = process.env.UPSTASH_VECTOR_REST_URL
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN
  if (!configured(url, token)) return mk({ service: 'Upstash Vector', slug: 'upstash-vector', category: 'search', configured: false, connected: null, status: 'not-configured', message: 'UPSTASH_VECTOR_REST_URL / TOKEN not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch(`${url}/info`, { headers: { Authorization: `Bearer ${token}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'Upstash Vector', slug: 'upstash-vector', category: 'search', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    const data = await res.json().catch(() => null) as { vectorCount?: number } | null
    return mk({ service: 'Upstash Vector', slug: 'upstash-vector', category: 'search', configured: true, connected: true, status: 'ok', message: `Connected · ${data?.vectorCount ?? '?'} vectors`, latencyMs, counts: [{ label: 'vectors', value: data?.vectorCount ?? '?' }] })
  } catch (e) {
    return mk({ service: 'Upstash Vector', slug: 'upstash-vector', category: 'search', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeGroq(): Promise<HealthProbe> {
  const key = process.env.GROQ_API_KEY
  if (!configured(key)) return mk({ service: 'Groq', slug: 'groq', category: 'ai', configured: false, connected: null, status: 'not-configured', message: 'GROQ_API_KEY not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'Groq', slug: 'groq', category: 'ai', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    return mk({ service: 'Groq', slug: 'groq', category: 'ai', configured: true, connected: true, status: 'ok', message: 'API reachable', latencyMs })
  } catch (e) {
    return mk({ service: 'Groq', slug: 'groq', category: 'ai', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeResend(): Promise<HealthProbe> {
  const key = process.env.RESEND_API_KEY
  if (!configured(key)) return mk({ service: 'Resend', slug: 'resend', category: 'email', configured: false, connected: null, status: 'not-configured', message: 'RESEND_API_KEY not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'Resend', slug: 'resend', category: 'email', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    return mk({ service: 'Resend', slug: 'resend', category: 'email', configured: true, connected: true, status: 'ok', message: 'Email API reachable', latencyMs })
  } catch (e) {
    return mk({ service: 'Resend', slug: 'resend', category: 'email', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}
async function probeCloudflareImages(): Promise<HealthProbe> {
  const account = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_IMAGES_API_TOKEN
  if (!configured(account, token)) return mk({ service: 'Cloudflare Images', slug: 'cloudflare-images', category: 'cdn', configured: false, connected: null, status: 'not-configured', message: 'CLOUDFLARE_IMAGES_ACCOUNT_ID / API_TOKEN not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/images/v1?per_page=1`, { headers: { Authorization: `Bearer ${token}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'Cloudflare Images', slug: 'cloudflare-images', category: 'cdn', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    const data = await res.json().catch(() => null) as { success?: boolean } | null
    if (data?.success === false) return mk({ service: 'Cloudflare Images', slug: 'cloudflare-images', category: 'cdn', configured: true, connected: false, status: 'error', message: 'API error', latencyMs })
    return mk({ service: 'Cloudflare Images', slug: 'cloudflare-images', category: 'cdn', configured: true, connected: true, status: 'ok', message: 'CDN reachable', latencyMs })
  } catch (e) {
    return mk({ service: 'Cloudflare Images', slug: 'cloudflare-images', category: 'cdn', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeMobileAPI(): Promise<HealthProbe> {
  const key = process.env.MOBILEAPI_KEY
  const base = process.env.MOBILEAPI_BASE_URL ?? 'https://api.mobileapi.dev'
  if (!configured(key)) return mk({ service: 'MobileAPI', slug: 'mobileapi', category: 'data', configured: false, connected: null, status: 'not-configured', message: 'MOBILEAPI_KEY not set', latencyMs: null })
  const start = Date.now()
  try {
    const res = await withTimeout(() => fetch(`${base}/v1.1/phones?page=1&limit=1`, { headers: { Authorization: `Bearer ${key}` } }), 4000)
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'MobileAPI', slug: 'mobileapi', category: 'data', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    return mk({ service: 'MobileAPI', slug: 'mobileapi', category: 'data', configured: true, connected: true, status: 'ok', message: 'Spec API reachable', latencyMs })
  } catch (e) {
    return mk({ service: 'MobileAPI', slug: 'mobileapi', category: 'data', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

async function probeYouTube(): Promise<HealthProbe> {
  const key = process.env.YOUTUBE_API_KEY
  if (!configured(key)) return mk({ service: 'YouTube', slug: 'youtube', category: 'video', configured: false, connected: null, status: 'not-configured', message: 'YOUTUBE_API_KEY not set (RSS fallback active)', latencyMs: null })
  const channel = process.env.YOUTUBE_CHANNEL_ID
  const start = Date.now()
  try {
    const res = await withTimeout(
      () => fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channel ?? '')}&key=${encodeURIComponent(key!)}`),
      4000
    )
    const latencyMs = Date.now() - start
    if (!res.ok) return mk({ service: 'YouTube', slug: 'youtube', category: 'video', configured: true, connected: false, status: 'error', message: `HTTP ${res.status}`, latencyMs })
    const data = await res.json().catch(() => null) as { items?: unknown[] } | null
    const count = data?.items?.length ?? 0
    return mk({ service: 'YouTube', slug: 'youtube', category: 'video', configured: true, connected: true, status: count > 0 ? 'ok' : 'degraded', message: count > 0 ? 'Data API reachable' : 'Channel not found', latencyMs })
  } catch (e) {
    return mk({ service: 'YouTube', slug: 'youtube', category: 'video', configured: true, connected: false, status: 'error', message: e instanceof Error ? e.message : 'timeout', latencyMs: Date.now() - start })
  }
}

/** Run all probes in parallel. Always resolves — never throws. */
export async function runHealthChecks(): Promise<HealthProbe[]> {
  const results = await Promise.allSettled([
    probeSupabase(),
    probeRedis(),
    probeQStash(),
    probeUpstashSearch(),
    probeUpstashVector(),
    probeGroq(),
    probeResend(),
    probeCloudflareImages(),
    probeMobileAPI(),
    probeYouTube(),
  ])
  return results.map((r) =>
    r.status === 'fulfilled' ? r.value
      : mk({ service: 'Unknown', slug: 'unknown', category: 'unknown', configured: true, connected: false, status: 'error', message: r.reason instanceof Error ? r.reason.message : 'probe crashed', latencyMs: null })
  )
}

export function summarizeHealth(probes: HealthProbe[]): { ok: number; unhealthy: number; notConfigured: number; score: string } {
  const ok = probes.filter((p) => p.status === 'ok').length
  const notConfigured = probes.filter((p) => p.status === 'not-configured').length
  const unhealthy = probes.length - ok - notConfigured
  return { ok, unhealthy, notConfigured, score: `${ok}/${probes.length}` }
}

export async function getHealthCached(refresh = false): Promise<HealthProbe[]> {
  if (!refresh && isRedisConfigured) {
    try {
      const raw = await redis.get(CACHE_KEY)
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed)) return parsed as HealthProbe[]
      }
    } catch { /* fall through to live */ }
  }
  const probes = await runHealthChecks()
  if (isRedisConfigured) {
    try { await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(probes)) } catch { /* best effort */ }
  }
  return probes
}