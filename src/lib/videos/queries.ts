import { getPayload } from 'payload'
import config from '@payload-config'
import { redis } from '@/lib/upstash/redis'
import type { Article } from '@/payload-types'

// Re-using Article type for Video since Payload types aren't regenerated yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CmsVideo = any

function safeJsonParse<T>(data: unknown): T | null {
  if (!data || typeof data !== 'string') return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

type GetCmsVideosParams = {
  platform?: string
  page?: number
  limit?: number
}

export async function getCmsVideos(
  params: GetCmsVideosParams = {},
): Promise<{ videos: CmsVideo[]; totalPages: number }> {
  const { platform, page = 1, limit = 12 } = params

  const cacheKey = `cms-videos:list:${platform ?? ''}:${page}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<{ videos: CmsVideo[]; totalPages: number }>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (platform) {
    where.platform = { equals: platform }
  }

  const result = await payload.find({
    collection: 'videos',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    page,
    limit,
    sort: '-publishedAt',
    depth: 2,
  })

  const output = {
    videos: result.docs as unknown as CmsVideo[],
    totalPages: result.totalPages,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(output))
  return output
}

export async function getFeaturedCmsVideos(): Promise<CmsVideo[]> {
  const cacheKey = 'cms-videos:featured'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<CmsVideo[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'videos',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { featured: { equals: true } } as any,
    limit: 10,
    sort: '-publishedAt',
    depth: 2,
  })

  const videos = result.docs as unknown as CmsVideo[]
  await redis.setex(cacheKey, 600, JSON.stringify(videos))
  return videos
}

export async function getActiveComingSoon(): Promise<CmsVideo[]> {
  const cacheKey = 'coming-soon:active'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<CmsVideo[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'coming-soon',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: {
      active: { equals: true },
    } as any,
    limit: 20,
    sort: 'createdAt',
    depth: 1,
  })

  const items = result.docs as unknown as CmsVideo[]
  await redis.setex(cacheKey, 300, JSON.stringify(items))
  return items
}