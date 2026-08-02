const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export type YouTubeVideo = {
  id: string
  title: string
  thumbnailUrl: string
  viewCount: number
  duration: string          // formatted e.g. "12:34"
  publishedAt: string       // ISO string
  description: string
}

// Fetch latest videos from FweezyTech's YouTube channel
// Cache in Upstash Redis for 6 hours
export async function fetchYouTubeVideos(maxResults: number = 20): Promise<YouTubeVideo[]> {
  const { redis } = await import('@/lib/upstash/redis')
  const cacheKey = `youtube:channel:latest:${maxResults}`
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) return JSON.parse(cached as string)

  let videos: YouTubeVideo[]

  // Try Data API v3 first (supports duration + viewCount)
  if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID) {
    try {
      videos = await fetchFromYouTubeApi(maxResults)
    } catch (e) {
      console.warn('YouTube Data API failed, falling back to RSS feed:', e)
      videos = await fetchYouTubeVideosViaRss(maxResults)
    }
  } else {
    // No API key — use RSS feed fallback (no API key required)
    videos = await fetchYouTubeVideosViaRss(maxResults)
  }

  await redis.setex(cacheKey, 21600, JSON.stringify(videos))
  return videos
}

// Fetch via YouTube Data API v3
async function fetchFromYouTubeApi(maxResults: number): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY')
  if (!process.env.YOUTUBE_CHANNEL_ID) throw new Error('Missing YOUTUBE_CHANNEL_ID')

  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=id&channelId=${process.env.YOUTUBE_CHANNEL_ID}` +
    `&maxResults=${maxResults}&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!searchRes.ok) throw new Error(`YouTube search API error: ${searchRes.status}`)
  const searchData = await searchRes.json()
  const videoIds: string[] = searchData.items.map((i: any) => i.id.videoId)

  if (videoIds.length === 0) return []

  const detailRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails` +
    `&id=${videoIds.join(',')}&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!detailRes.ok) throw new Error(`YouTube videos API error: ${detailRes.status}`)
  const detailData = await detailRes.json()

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

// Fetch via YouTube RSS feed (no API key required)
// Fallback when YOUTUBE_API_KEY is not configured
async function fetchYouTubeVideosViaRss(maxResults: number = 20): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_CHANNEL_ID) throw new Error('Missing YOUTUBE_CHANNEL_ID')

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${process.env.YOUTUBE_CHANNEL_ID}`
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

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

// Convert ISO 8601 duration (PT12M34S) to human-readable (12:34)
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

// Fetch top N videos by view count for hero carousel
export async function fetchTopYouTubeVideos(limit: number = 5): Promise<YouTubeVideo[]> {
  const all = await fetchYouTubeVideos(50)
  return [...all].sort((a, b) => b.viewCount - a.viewCount).slice(0, limit)
}

// Format view count: 1234567 → "1.2M views"
export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`
  return `${count} views`
}