export type InstagramVideo = {
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

export async function fetchInstagramVideos(maxResults: number = 20): Promise<InstagramVideo[]> {
  const { redis } = await import('@/lib/upstash/redis')
  const cacheKey = `instagram:channel:latest:${maxResults}`

  try {
    const cached = await redis.get(cacheKey)
    const parsed = safeJsonParse<InstagramVideo[]>(cached)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // Redis unavailable
  }

  let videos: InstagramVideo[] = []

  try {
    const oembedUrl = 'https://api.instagram.com/oembed?url=https://www.instagram.com/fweezytech'
    const res = await fetch(oembedUrl)
    if (res.ok) {
      const data = await res.json()
      if (data && data.thumbnail_url) {
        videos.push({
          id: 'fweezytech',
          title: data.title || 'FweezyTech Instagram',
          thumbnailUrl: data.thumbnail_url,
          viewCount: 0,
          duration: '',
          publishedAt: new Date().toISOString(),
          description: data.description || '',
        })
      }
    }
  } catch (e) {
    console.warn('Instagram video fetch failed:', e)
  }

  try {
    await redis.setex(cacheKey, 7200, JSON.stringify(videos))
  } catch {
    // Ignore cache errors
  }

  if (videos.length === 0) {
    console.warn('No Instagram RSS source available. Using CMS-only Instagram videos.')
  }

  return videos
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`
  return `${count} views`
}
