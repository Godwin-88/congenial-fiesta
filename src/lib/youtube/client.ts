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

  if (!process.env.YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY')
  if (!process.env.YOUTUBE_CHANNEL_ID) throw new Error('Missing YOUTUBE_CHANNEL_ID')

  // Step 1: get latest video IDs from channel
  const searchRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=id&channelId=${process.env.YOUTUBE_CHANNEL_ID}` +
    `&maxResults=${maxResults}&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!searchRes.ok) throw new Error(`YouTube search API error: ${searchRes.status}`)
  const searchData = await searchRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoIds: string[] = searchData.items.map((i: any) => i.id.videoId)

  if (videoIds.length === 0) return []

  // Step 2: get full details (statistics + contentDetails) for those IDs
  const detailRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails` +
    `&id=${videoIds.join(',')}&key=${process.env.YOUTUBE_API_KEY}`
  )
  if (!detailRes.ok) throw new Error(`YouTube videos API error: ${detailRes.status}`)
  const detailData = await detailRes.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos: YouTubeVideo[] = detailData.items.map((item: any) => ({
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

  await redis.setex(cacheKey, 21600, JSON.stringify(videos)) // 6 hours
  return videos
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