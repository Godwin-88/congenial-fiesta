import { getPayload } from 'payload'
import config from '@payload-config'
import { redis } from '@/lib/upstash/redis'
import type { Article } from '@/payload-types'

function safeJsonParse<T>(data: unknown): T | null {
  if (!data || typeof data !== 'string') return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
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

  const cacheKey = `articles:list:${category ?? ''}:${page}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<{ articles: Article[]; totalPages: number }>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    status: { equals: 'published' },
  }
  if (category) {
    where.category = { equals: category }
  }

  const result = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    page,
    limit,
    sort: '-publishedAt',
    depth: 2,
  })

  const output = {
    articles: result.docs as unknown as Article[],
    totalPages: result.totalPages,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(output))
  return output
}

export async function getArticle(slug: string): Promise<Article | null> {
  const cacheKey = `articles:detail:${slug}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Article>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    } as any,
    limit: 1,
    depth: 2,
  })

  const article = (result.docs[0] ?? null) as unknown as Article | null
  if (article) {
    await redis.setex(cacheKey, 600, JSON.stringify(article))
  }
  return article
}

export async function getAllArticlePaths(): Promise<Array<{ slug: string }>> {
  const cacheKey = 'articles:static-params'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Array<{ slug: string }>>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    limit: 500,
    depth: 0,
  })

  const paths = (result.docs as unknown as Article[]).map((a) => ({
    slug: (a as unknown as { slug: string }).slug,
  }))

  await redis.setex(cacheKey, 3600, JSON.stringify(paths))
  return paths
}

export async function getRecentArticles(limit: number = 4): Promise<Article[]> {
  const cacheKey = `articles:recent:${limit}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Article[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    sort: '-publishedAt',
    limit,
    depth: 2,
  })

  const articles = result.docs as unknown as Article[]
  await redis.setex(cacheKey, 300, JSON.stringify(articles))
  return articles
}

export async function getArticlesForDevice(deviceSlug: string): Promise<Article[]> {
  const cacheKey = `articles:device:${deviceSlug}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Article[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  // First find the device
  const deviceResult = await payload.find({
    collection: 'devices',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { slug: { equals: deviceSlug } } as any,
    limit: 1,
    depth: 0,
  })

  if (deviceResult.docs.length === 0) return []

  const deviceId = deviceResult.docs[0].id

  const result = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: {
      status: { equals: 'published' },
      associatedDevice: { equals: deviceId },
    } as any,
    sort: '-publishedAt',
    limit: 10,
    depth: 2,
  })

  const articles = result.docs as unknown as Article[]
  await redis.setex(cacheKey, 600, JSON.stringify(articles))
  return articles
}