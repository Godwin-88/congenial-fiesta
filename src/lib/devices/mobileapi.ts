// Thin client for the MobileAPI.dev device specs API.
// Docs: https://mobileapi.dev/docs/
// Coverage: smartphones, tablets, smartwatches, laptops (GSMArena-derived).
// NOTE: this API does NOT cover televisions or audio (soundbars/speakers/
// headphones), so those tabs cannot be populated from this source.

const BASE_URL = process.env.MOBILEAPI_BASE_URL || 'https://api.mobileapi.dev'

export type Json = Record<string, any>

export interface MobileApiDevice {
  id?: number
  name?: string
  brand_name?: string
  brand?: string
  manufacturer_name?: string
  manufacturer?: { id?: number; name?: string; logo_b64?: string | null; website_url?: string | null }
  type?: string
  device_type?: string
  release_date?: string
  description?: string
  image?: string
  image_url?: string | null
  image_b64?: string | null
  // Structured spec categories (shape may vary between list vs detail calls)
  network?: Json
  body?: Json
  display?: Json
  platform?: Json
  memory?: Json
  main_camera?: Json
  selfie_camera?: Json
  camera?: Json
  battery?: Json
  sound?: Json
  comms?: Json
  communications?: Json
  features?: Json
  misc?: Json
  [key: string]: any
}

export interface MobileApiList {
  total?: number
  page?: number
  page_size?: number
  total_pages?: number
  has_next?: boolean
  has_previous?: boolean
  next?: string | null
  previous?: string | null
  results?: MobileApiDevice[]
  devices?: MobileApiDevice[]
}

function authHeaders(): Record<string, string> {
  const key = process.env.MOBILEAPI_KEY
  if (!key) {
    throw new Error('MOBILEAPI_KEY is not set. Add it to .env.local (or pass via env).')
  }
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  }
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function apiGet(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MobileAPI ${res.status} ${res.statusText} for ${url}\n${text.slice(0, 500)}`)
  }
  return res.json()
}

/** Normalize a paginated list response into a flat device array. */
function normalizeList(data: any): MobileApiDevice[] {
  if (Array.isArray(data)) return data as MobileApiDevice[]
  if (Array.isArray(data?.devices)) return data.devices as MobileApiDevice[]
  if (Array.isArray(data?.results)) return data.results as MobileApiDevice[]
  return []
}

/**
 * Fetch every page of a listing endpoint, following `has_next`/`next` or
 * incrementing `page`. Stops early once `limit` devices have been collected.
 */
export async function fetchAllPages(
  path: string,
  params: Record<string, string | number | undefined> = {},
  limit?: number,
): Promise<MobileApiDevice[]> {
  const out: MobileApiDevice[] = []
  const pageSize = params.limit ?? 30
  let page = Number(params.page ?? 1)
  let totalPages = Number.POSITIVE_INFINITY

  while (page <= totalPages) {
    const url = buildUrl(path, { ...params, page, limit: pageSize })
    let data: any
    try {
      data = await apiGet(url)
    } catch (err) {
      // A request for a non-existent page (or rate-limit) shouldn't discard
      // everything collected so far — just stop paginating.
      console.warn(`  page fetch failed (${url}): ${(err as Error).message}`)
      break
    }
    if (typeof data?.total_pages === 'number') totalPages = data.total_pages
    const items = normalizeList(data)
    for (const item of items) {
      if (!item.id && !item.name) continue
      out.push(item)
      if (limit && out.length >= limit) return out
    }
    if (page >= totalPages) break
    page++
  }
  return out
}

export async function fetchDeviceDetail(id: number | string): Promise<MobileApiDevice> {
  return apiGet(buildUrl(`/devices/${id}/`))
}

/** Debug helper: return the raw response (status, url, body) for a path. */
export async function debugList(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<{ status: number; url: string; body: any }> {
  const url = buildUrl(path, params)
  const res = await fetch(url, { headers: authHeaders() })
  const text = await res.text()
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, url, body }
}

export async function fetchDeviceImages(id: number | string): Promise<Json[]> {
  try {
    const data = await apiGet(buildUrl(`/devices/${id}/images/`))
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.images)) return data.images
  } catch {
    /* images are optional */
  }
  return []
}
