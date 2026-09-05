const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const FWEEZYTECH_YOUTUBE_CHANNEL_ID = 'UCUnPfJ4qwOkqr01hHO2Mjzg'

// YouTube's internal Innertube browse endpoint (the same one the web player
// uses). No API key required — it acts as a resilient fallback when the
// legacy feeds.videos.xml endpoint 404s.
const INNERTUBE_API = 'https://www.youtube.com/youtubei/v1/browse'
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const INNERTUBE_CLIENT_NAME = 'WEB'
const INNERTUBE_CLIENT_VERSION = '2.20260902.01.00'
const INNERTUBE_VIDEOS_PARAMS = 'EgZ2aWRlb3PyBgQKAjoA'

export type YouTubeVideo = {
  id: string
  title: string
  thumbnailUrl: string
  viewCount: number
  duration: string
  publishedAt: string
  description: string
}

function safeJsonParse<T>(data: unknown): T | null {
  if (!data) return null
  if (typeof data !== 'string') return data as T | null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export async function fetchYouTubeVideos(maxResults: number = 20): Promise<YouTubeVideo[]> {
  const { redis } = await import('@/lib/upstash/redis')
  const cacheKey = `youtube:channel:latest:${maxResults}`

  // Cache lookup — never throw
  let cachedVideos: YouTubeVideo[] | null = null
  try {
    const cached = await redis.get(cacheKey)
    const parsed = safeJsonParse<YouTubeVideo[]>(cached)
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedVideos = parsed
    }
  } catch {
    // Redis not available or error — proceed to fetch
  }

  if (cachedVideos) return cachedVideos

  // Sources in order of preference. Each is isolated so a single failing
  // source (e.g. YouTube returning 404 on the legacy RSS feed) can never
  // take down the whole videos feature.
  const sources: Array<() => Promise<YouTubeVideo[]>> = [
    // 1. YouTube Data API v3 (best: exact dates, real views, durations) — only if key is set
    () =>
      process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID
        ? fetchFromYouTubeApi(maxResults)
        : Promise.resolve([]),
    // 2. Legacy channel RSS feed (no key required)
    () => fetchYouTubeVideosViaRss(maxResults),
    // 3. Innertube browse (no key required; resilient when feeds.videos.xml is blocked/404s)
    () => fetchYouTubeVideosViaInnertube(maxResults),
  ]

  let videos: YouTubeVideo[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    if (videos.length >= maxResults) break
    try {
      const results = await source()
      for (const video of results) {
        if (seen.has(video.id)) continue
        seen.add(video.id)
        videos.push(video)
        if (videos.length >= maxResults) break
      }
    } catch (e) {
      console.warn('YouTube source failed, trying next fallback:', e)
      continue
    }
  }

  // Cache — non-blocking. Non-empty results live for 6h; empty results for
  // 60s so a transient outage doesn't poison the cache, but frequent page
  // loads during an outage don't hammer YouTube either.
  try {
    const ttl = videos.length > 0 ? 21600 : 60
    await redis.setex(cacheKey, ttl, JSON.stringify(videos))
  } catch {
    // Ignore cache errors
  }

  return videos
}

async function fetchFromYouTubeApi(maxResults: number): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY')
  if (!process.env.YOUTUBE_CHANNEL_ID) throw new Error('Missing YOUTUBE_CHANNEL_ID')

  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=id&channelId=${process.env.YOUTUBE_CHANNEL_ID}` +
    `&maxResults=${maxResults}&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!searchRes.ok) throw new Error(`YouTube search API error: ${searchRes.status}`)
  const searchData = await searchRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoIds: string[] = (searchData.items ?? []).map((i: any) => i.id.videoId)

  if (videoIds.length === 0) return []

  const detailRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails` +
    `&id=${videoIds.join(',')}&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!detailRes.ok) throw new Error(`YouTube videos API error: ${detailRes.status}`)
  const detailData = await detailRes.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return detailData.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.maxres?.url ??
                  item.snippet.thumbnails.high?.url ??
                  item.snippet.thumbnails.default.url,
    viewCount: parseInt(item.statistics.viewCount ?? '0', 10),
    duration: formatIsoDuration(item.contentDetails.duration),
    publishedAt: item.snippet.publishedAt,
    description: item.snippet.description,
  }))
}

async function fetchYouTubeVideosViaRss(maxResults: number = 20): Promise<YouTubeVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID ?? FWEEZYTECH_YOUTUBE_CHANNEL_ID
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const res = await fetch(rssUrl)
  if (!res.ok) throw new Error(`YouTube RSS feed error: ${res.status}`)
  const xml = await res.text()

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  const results: YouTubeVideo[] = []
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null && results.length < maxResults) {
    const entry = match[1]

    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    const titleMatch = entry.match(/<media:title>([\s\S]*?)<\/media:title>/)
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)
    const thumbnailMatch = entry.match(/<media:thumbnail url="([^"]+)"/)
    const statsMatch = entry.match(/<media:statistics views="([^"]+)"/)
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)

    const videoId = idMatch?.[1] ?? ''
    const title = unescapeXml(titleMatch?.[1] ?? 'Untitled')
    const publishedAt = publishedMatch?.[1] ?? new Date().toISOString()
    const hqThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const thumbnailUrl = thumbnailMatch?.[1] || hqThumbnail
    const viewCount = statsMatch?.[1] ? parseInt(statsMatch[1], 10) : 0
    const description = unescapeXml(descMatch?.[1] ?? '')

    results.push({
      id: videoId,
      title,
      thumbnailUrl,
      viewCount,
      duration: '',
      publishedAt,
      description,
    })
  }

  return results
}
// --- Innertube browse fallback (no API key) ---

// Loose structural type for YouTube's Innertube `lockupViewModel`.
interface LockupLike {
  contentId?: unknown
  contentType?: unknown
  contentImage?: {
    thumbnailViewModel?: {
      image?: { sources?: Array<{ url?: unknown }> }
      overlays?: Array<{
        thumbnailBottomOverlayViewModel?: {
          badges?: Array<{ thumbnailBadgeViewModel?: { text?: unknown } }>
        }
      }>
    }
  }
  metadata?: {
    lockupMetadataViewModel?: {
      title?: { content?: unknown }
      metadata?: {
        contentMetadataViewModel?: {
          metadataRows?: Array<{
            metadataParts?: Array<{
              text?: { content?: unknown; runs?: Array<{ text?: unknown }> }
            }>
          }>
        }
      }
    }
  }
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * Fallback source that requires no API key: YouTube's internal Innertube
 * browse endpoint (the same one the web player uses). The legacy
 * `feeds.videos.xml` endpoint has been intermittently 404ing, so this keeps
 * the videos pipeline alive without a Data-API key.
 *
 * Caveat: YouTube returns *relative* dates ("3 weeks ago") here rather than
 * exact timestamps, so `publishedAt` is approximated for sort order.
 */
async function fetchYouTubeVideosViaInnertube(maxResults: number = 20): Promise<YouTubeVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID ?? FWEEZYTECH_YOUTUBE_CHANNEL_ID
  const videos: YouTubeVideo[] = []
  const seen = new Set<string>()
  let continuation: string | undefined
  let pages = 0

  while (videos.length < maxResults && pages < 10) {
    const body: Record<string, unknown> = {
      context: {
        client: { clientName: INNERTUBE_CLIENT_NAME, clientVersion: INNERTUBE_CLIENT_VERSION },
      },
      browseId: channelId,
      params: INNERTUBE_VIDEOS_PARAMS,
    }
    if (continuation) {
      delete body.browseId
      delete body.params
      body.continuation = continuation
    }

    const res = await fetch(`${INNERTUBE_API}?key=${INNERTUBE_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`YouTube Innertube browse error: ${res.status}`)
    const data: unknown = await res.json()

    const lockups = collectLockups(data)
    for (const lockup of lockups) {
      if (videos.length >= maxResults) break
      const parsed = parseLockup(lockup)
      if (parsed && !seen.has(parsed.id)) {
        seen.add(parsed.id)
        videos.push(parsed)
      }
    }

    continuation = findContinuationToken(data)
    if (!continuation) break
    pages++
  }

  return videos
}
function collectLockups(node: unknown, out: LockupLike[] = []): LockupLike[] {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) collectLockups(item, out)
    return out
  }
  const obj = node as Record<string, unknown>
  const lockup = obj.lockupViewModel
  if (lockup && typeof lockup === 'object') out.push(lockup as LockupLike)
  for (const key of Object.keys(obj)) collectLockups(obj[key], out)
  return out
}

function parseLockup(lockup: LockupLike): YouTubeVideo | null {
  const videoId = String(lockup.contentId ?? '')
  const contentType = String(lockup.contentType ?? '')
  if (contentType && contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null

  const meta = lockup.metadata?.lockupMetadataViewModel
  const title = String(meta?.title?.content ?? '').trim()
  if (!title) return null

  const sources = lockup.contentImage?.thumbnailViewModel?.image?.sources ?? []
  const thumbnailUrl =
    String(sources[0]?.url ?? '') || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  let duration = ''
  for (const overlay of lockup.contentImage?.thumbnailViewModel?.overlays ?? []) {
    const badgeText =
      overlay.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text
    if (typeof badgeText === 'string' && /^\d+:\d+/.test(badgeText)) {
      duration = badgeText
      break
    }
  }

  let viewCount = 0
  let publishedAt = ''
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? []
  for (const row of rows) {
    const text = (row?.metadataParts ?? []).map(lockupPartToText).join(' ')
    const views = text.match(/([\d.,]+)\s*([KM])?\s*views?/i)
    if (views) {
      const num = parseFloat(views[1].replace(/,/g, ''))
      const suffix = (views[2] ?? '').toUpperCase()
      viewCount = Math.round(
        suffix === 'M' ? num * 1_000_000 : suffix === 'K' ? num * 1_000 : num,
      )
    }
    const age = matchRelativeAge(text)
    if (age) publishedAt = relativeAgeToIso(age.amount, age.unit)
  }
  if (!publishedAt) publishedAt = new Date().toISOString()

  return { id: videoId, title, thumbnailUrl, viewCount, duration, publishedAt, description: '' }
}

function formatIsoDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:00'
  const h = parseInt(match[1] ?? '0')
  const m = parseInt(match[2] ?? '0')
  const s = parseInt(match[3] ?? '0')
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}
function lockupPartToText(part: {
  text?: { content?: unknown; runs?: Array<{ text?: unknown }> }
}): string {
  const runs = part?.text?.runs
  if (runs) return runs.map((r) => String(r.text ?? '')).join('')
  return String(part?.text?.content ?? '')
}

function matchRelativeAge(text: string): { amount: number; unit: string } | null {
  const m = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i)
  if (!m) return null
  return { amount: parseInt(m[1], 10), unit: m[2].toLowerCase() }
}

function relativeAgeToIso(amount: number, unit: string): string {
  const date = new Date()
  switch (unit) {
    case 'second': date.setSeconds(date.getSeconds() - amount); break
    case 'minute': date.setMinutes(date.getMinutes() - amount); break
    case 'hour': date.setHours(date.getHours() - amount); break
    case 'day': date.setDate(date.getDate() - amount); break
    case 'week': date.setDate(date.getDate() - amount * 7); break
    case 'month': date.setMonth(date.getMonth() - amount); break
    case 'year': date.setFullYear(date.getFullYear() - amount); break
  }
  return date.toISOString()
}

function findContinuationToken(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const item of node) {
      const token = findContinuationToken(item)
      if (token) return token
    }
    return undefined
  }
  const obj = node as Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (obj as any)?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
  if (typeof token === 'string' && token.length > 0) return token
  for (const key of Object.keys(obj)) {
    const nested = findContinuationToken(obj[key])
    if (nested) return nested
  }
  return undefined
}

export async function fetchTopYouTubeVideos(limit: number = 5): Promise<YouTubeVideo[]> {
  const all = await fetchYouTubeVideos(50)
  return [...all].sort((a, b) => b.viewCount - a.viewCount).slice(0, limit)
}

export async function fetchAllYouTubeVideos(): Promise<YouTubeVideo[]> {
  const hasApiKey = process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim()
  if (hasApiKey && process.env.YOUTUBE_CHANNEL_ID) {
    const videos: YouTubeVideo[] = []
    let pageToken: string | undefined
    do {
      const page = await fetchFromYouTubeApiPaginated(50, pageToken)
      videos.push(...page.items)
      pageToken = page.nextPageToken
    } while (pageToken && videos.length < 900)
    return videos.slice(0, 900)
  }
  const rssVideos = await fetchNoKeyYouTubeVideos(50)
  if (rssVideos.length < 20 && !hasApiKey) {
    console.warn(
      '⚠ Only fetched %d YouTube videos via RSS/Innertube (YouTube caps RSS at 15 entries). ' +
      'To index more, set YOUTUBE_API_KEY in .env.local (free via Google Cloud Console → YouTube Data API v3).',
      rssVideos.length,
    )
  }
  return rssVideos
}

/**
 * Shared no-API-key fetcher: tries RSS *and* Innertube and merges the results.
 * - RSS gives exact timestamps but YouTube caps it at ~15 entries.
 * - Innertube gives more (30+) with durations/views but approximate dates.
 * Merging keeps both the best dates and the best coverage.
 */
async function fetchNoKeyYouTubeVideos(maxResults: number): Promise<YouTubeVideo[]> {
  const merged: YouTubeVideo[] = []
  const seen = new Set<string>()
  for (const source of [
    () => fetchYouTubeVideosViaRss(maxResults),
    () => fetchYouTubeVideosViaInnertube(maxResults),
  ]) {
    try {
      const videos = await source()
      for (const video of videos) {
        if (seen.has(video.id)) continue
        seen.add(video.id)
        merged.push(video)
        if (merged.length >= maxResults) break
      }
    } catch (e) {
      console.warn('YouTube no-key source failed, trying next fallback:', e)
    }
  }
  return merged
}

async function fetchFromYouTubeApiPaginated(
  maxResults: number,
  pageToken?: string,
): Promise<{ items: YouTubeVideo[]; nextPageToken?: string }> {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY')
  if (!process.env.YOUTUBE_CHANNEL_ID) throw new Error('Missing YOUTUBE_CHANNEL_ID')

  const searchUrl =
    `${YOUTUBE_API_BASE}/search?part=id` +
    `&channelId=${process.env.YOUTUBE_CHANNEL_ID}` +
    `&maxResults=${maxResults}` +
    `&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}` +
    (pageToken ? `&pageToken=${pageToken}` : '')

  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) throw new Error(`YouTube search API error: ${searchRes.status}`)
  const searchData = await searchRes.json()
  const videoIds: string[] = (searchData.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId)
  if (videoIds.length === 0) return { items: [], nextPageToken: searchData.nextPageToken }

  const detailRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails` +
    `&id=${videoIds.join(',')}&key=${process.env.YOUTUBE_API_KEY}`,
  )
  if (!detailRes.ok) throw new Error(`YouTube videos API error: ${detailRes.status}`)
  const detailData = await detailRes.json()

  return {
    items: (detailData.items ?? []).map((item: {
      id: string
      snippet: { title: string; description: string; publishedAt?: string; thumbnails: Record<string, { url: string }> }
      statistics?: { viewCount?: string }
      contentDetails?: { duration?: string }
    }) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.maxres?.url ??
                    item.snippet.thumbnails.high?.url ??
                    item.snippet.thumbnails.default.url,
      viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
      duration: formatIsoDuration(item.contentDetails?.duration ?? ''),
      publishedAt: item.snippet.publishedAt ?? new Date().toISOString(),
      description: item.snippet.description,
    })),
    nextPageToken: searchData.nextPageToken,
  }
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`
  return `${count} views`
}
