import { indexDocument, removeDocument, type SearchDocument } from '@/lib/upstash/search'
import { upsertVector } from '@/lib/upstash/vector'
import type { Device, Article } from '@/types/cms'

export async function indexDevice(device: Device): Promise<void> {
  if (device.status !== 'published') return
  const brand = device.brand?.name ?? ''
  const brandSlug = device.brand?.slug ?? ''
  const doc: SearchDocument = {
    id: `device:${device.slug}`,
    type: 'device',
    title: device.name,
    description: device.tagline ?? '',
    url: `/devices/${brandSlug}/${device.slug}`,
    imageUrl: (device.images?.[0] as { url?: string })?.url ?? '',
    brand,
    category: device.price_tier ?? undefined,
    score: device.scores_overall ?? undefined,
    publishedAt: device.created_at,
  }
  await indexDocument(doc)
  await upsertVector({
    id: `device:${device.slug}`,
    text: `${device.name} ${brand} ${device.tagline ?? ''} ${(device.specs_processor as Record<string, unknown>)?.chipset ?? ''} ${device.price_tier ?? ''}`,
    metadata: { url: doc.url, type: 'device', title: doc.title, imageUrl: doc.imageUrl },
  })
}

export async function indexArticle(article: Article): Promise<void> {
  if (article.status !== 'published') return
  const doc: SearchDocument = {
    id: `article:${article.slug}`,
    type: 'article',
    title: article.title,
    description: article.excerpt ?? '',
    url: `/articles/${article.slug}`,
    imageUrl: article.featured_image ?? '',
    category: article.category ?? undefined,
    publishedAt: article.published_at ?? article.created_at,
  }
  await indexDocument(doc)
  await upsertVector({
    id: `article:${article.slug}`,
    text: `${article.title} ${article.excerpt ?? ''} ${article.category ?? ''}`,
    metadata: { url: doc.url, type: 'article', title: doc.title, imageUrl: doc.imageUrl },
  })
}

export async function indexVideo(video: {
  id: number
  title: string
  thumbnail_url: string | null
  published_at: string | null
  created_at: string
}): Promise<void> {
  const doc: SearchDocument = {
    id: `video:${video.id}`,
    type: 'video',
    title: video.title,
    description: video.title,
    url: `/videos#${video.id}`,
    imageUrl: video.thumbnail_url ?? '',
    publishedAt: video.published_at ?? video.created_at,
  }
  await indexDocument(doc)
}

export async function indexYouTubeVideo(video: {
  id: string
  title: string
  thumbnailUrl: string
  viewCount: number
  duration: string
  publishedAt: string
  description: string
}): Promise<void> {
  const doc: SearchDocument = {
    id: `youtube:${video.id}`,
    type: 'video',
    title: video.title,
    description: video.description,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    imageUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
  }
  await indexDocument(doc)
  await upsertVector({
    id: doc.id,
    text: `${video.title} ${video.description}`,
    metadata: {
      url: doc.url,
      type: 'video',
      title: doc.title,
      imageUrl: doc.imageUrl,
      viewCount: video.viewCount,
      publishedAt: doc.publishedAt,
    },
  })
}

export async function removeFromIndex(id: string): Promise<void> {
  await removeDocument(id)
}