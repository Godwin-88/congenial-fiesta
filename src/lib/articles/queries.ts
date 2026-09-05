import { createClient } from '@supabase/supabase-js'
import { redis, deserializeCache } from '@/lib/upstash/redis'
import type { Article } from '@/types/cms'
import { mapArticle } from '@/types/cms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type GetArticlesParams = {
  category?: string
  page?: number
  limit?: number
}

export async function getArticles(
  params: GetArticlesParams = {},
): Promise<{ articles: Article[]; totalPages: number }> {
  const { category, page = 1, limit = 12 } = params

  const cacheKey = `articles:list:${category ?? 'all'}:${page}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedResult = deserializeCache<{ articles: Article[]; totalPages: number }>(cached)
  if (cachedResult) return cachedResult

  const supabase = getSupabase()
  const offset = (page - 1) * limit

  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)

  const { data, error, count } = await query
  if (error) {
    console.error('getArticles error:', error)
    return { articles: [], totalPages: 0 }
  }

  const result = {
    articles: data?.map(mapArticle) ?? [],
    totalPages: Math.ceil((count ?? 0) / limit),
  }

  await redis.setex(cacheKey, 300, JSON.stringify(result))
  return result
}

export async function getArticle(slug: string): Promise<Article | null> {
  const cacheKey = `articles:detail:${slug}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedArticle = deserializeCache<Article>(cached)
  if (cachedArticle) return cachedArticle

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) {
    if (error) console.error('getArticle error:', error)
    return null
  }

  const article = mapArticle(data)
  await redis.setex(cacheKey, 600, JSON.stringify(article))
  return article
}

export async function getAllArticlePaths(): Promise<Array<{ slug: string }>> {
  const cacheKey = 'articles:static-params'
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedPaths = deserializeCache<Array<{ slug: string }>>(cached)
  if (cachedPaths) return cachedPaths

  const supabase = getSupabase()
  const { data } = await supabase
    .from('articles')
    .select('slug')
    .eq('status', 'published')

  const result = data?.map(r => ({ slug: r.slug })) ?? []
  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  return result
}

export async function getRecentArticles(limit: number = 4): Promise<Article[]> {
  const cacheKey = `articles:recent:${limit}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedArticles = deserializeCache<Article[]>(cached)
  if (cachedArticles) return cachedArticles

  const supabase = getSupabase()
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  const result = data?.map(mapArticle) ?? []
  await redis.setex(cacheKey, 300, JSON.stringify(result))
  return result
}

export async function getArticlesForDevice(deviceSlug: string): Promise<Article[]> {
  const cacheKey = `articles:device:${deviceSlug}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedArticles = deserializeCache<Article[]>(cached)
  if (cachedArticles) return cachedArticles

  const supabase = getSupabase()

  // First find the device
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('slug', deviceSlug)
    .single()

  if (!device) return []

  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .eq('associated_device_id', device.id)
    .order('published_at', { ascending: false })
    .limit(10)

  const articles = data?.map(mapArticle) ?? []
  await redis.setex(cacheKey, 600, JSON.stringify(articles))
  return articles
}