export type TikTokVideo = {
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

export async function fetchTikTokVideos(maxResults: number = 20): Promise<TikTokVideo[]> {
  const { redis } = await import('@/lib/upstash/redis')
  const cacheKey = `tiktok:channel:latest:${maxResults}`

  try {
    const cached = await redis.get(cacheKey)
    const parsed = safeJsonParse<TikTokVideo[]>(cached)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // Redis unavailable
  }

  let videos: TikTokVideo[] = []

  const RSS_PROXIES = [
    'https://tiktok-rss.gamj.dev/@fweezytech',
    'https://tiktok-rss.gamj.dev/fweezytech',
  ]

  for (const rssUrl of RSS_PROXIES) {
    try {
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FweezyTech/1.0)' },
      })
      if (!res.ok) continue
      const xml = await res.text()

      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
      const results: TikTokVideo[] = []
      let match: RegExpExecArray | null

      while ((match = entryRegex.exec(xml)) !== null && results.length < maxResults) {
        const entry = match[1]
        const idMatch = entry.match(/<id>([^<]+)<\/id>/)
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
        const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)
        const thumbnailMatch = entry.match(/<media:thumbnail url="([^"]+)"/)
        const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)

        const videoId = idMatch?.[1]?.split('/').pop() ?? ''

        results.push({
          id: videoId,
          title: unescapeXml(titleMatch?.[1] ?? 'TikTok Video'),
          thumbnailUrl: thumbnailMatch?.[1] ?? '',
          viewCount: 0,
          duration: '',
          publishedAt: publishedMatch?.[1] ?? new Date().toISOString(),
          description: unescapeXml(descMatch?.[1] ?? ''),
        })
      }

      if (results.length > 0) {
        videos = results
        break
      }
    } catch {
      // Try next proxy
    }
  }

  try {
    await redis.setex(cacheKey, 7200, JSON.stringify(videos))
  } catch {
    // Ignore cache errors
  }

  if (videos.length === 0) {
    console.warn('No TikTok RSS source available. Using CMS-only TikTok videos.')
  }

  return videos
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`
  return `${count} views`
}
