import { createClient } from '@supabase/supabase-js'
import { redis } from '@/lib/upstash/redis'

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

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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

  const supabase = getAdminSupabase()

  let query = supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })

  if (platform) {
    query = query.eq('platform', platform)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('getCmsVideos error:', error)
    return { videos: [], totalPages: 0 }
  }

  const totalPages = count ? Math.ceil(count / limit) : 1

  const output = {
    videos: (data ?? []) as unknown as CmsVideo[],
    totalPages,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(output))
  return output
}

export async function getFeaturedCmsVideos(): Promise<CmsVideo[]> {
  const cacheKey = 'cms-videos:featured'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<CmsVideo[]>(cached)
  if (parsed) return parsed

  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('getFeaturedCmsVideos error:', error)
    return []
  }

  const videos = (data ?? []) as unknown as CmsVideo[]
  await redis.setex(cacheKey, 600, JSON.stringify(videos))
  return videos
}

export async function getActiveComingSoon(): Promise<CmsVideo[]> {
  const cacheKey = 'coming-soon:active'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<CmsVideo[]>(cached)
  if (parsed) return parsed

  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('coming_soon')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('getActiveComingSoon error:', error)
    return []
  }

  const items = (data ?? []) as unknown as CmsVideo[]
  await redis.setex(cacheKey, 300, JSON.stringify(items))
  return items
}