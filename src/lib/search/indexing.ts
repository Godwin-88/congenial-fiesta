import { indexDocument, removeDocument, type SearchDocument } from '@/lib/upstash/search'
import { upsertVector } from '@/lib/upstash/vector'
import type { Device, Article } from '@/payload-types'

export async function indexDevice(device: Device): Promise<void> {
  if (device.status !== 'published') return
  const brand = typeof device.brand === 'object' && device.brand !== null ? (device.brand as { name: string; slug: string }).name : ''
  const brandSlug = typeof device.brand === 'object' && device.brand !== null ? (device.brand as { slug: string }).slug : ''
  const doc: SearchDocument = {
    id: `device:${device.slug}`,
    type: 'device',
    title: device.name,
    description: device.tagline ?? '',
    url: `/devices/${brandSlug}/${device.slug}`,
    imageUrl: device.images?.[0]?.url ?? '',
    brand,
    category: device.category,
    score: device.scores?.overall ?? undefined,
    publishedAt: device.createdAt,
  }
  await indexDocument(doc)
  await upsertVector({
    id: `device:${device.slug}`,
    text: `${device.name} ${brand} ${device.tagline ?? ''} ${(device as any).specsProcessor?.chipset ?? ''} ${device.category}`,
    metadata: { url: doc.url, type: 'device', title: doc.title, imageUrl: doc.imageUrl },
  })
}

export async function indexArticle(article: Article): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((article as any).status !== 'published') return
  const doc: SearchDocument = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: `article:${(article as any).slug}`,
    type: 'article',
    title: article.title,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    description: (article as any).excerpt ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    url: `/articles/${(article as any).slug}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    imageUrl: (article as any).featuredImage ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category: (article as any).category ?? undefined,
    publishedAt: article.createdAt,
  }
  await indexDocument(doc)
  await upsertVector({
    id: `article:${(article as any).slug}`,
    text: `${article.title} ${(article as any).excerpt ?? ''} ${(article as any).category ?? ''}`,
    metadata: { url: doc.url, type: 'article', title: doc.title, imageUrl: doc.imageUrl },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function indexVideo(video: any): Promise<void> {
  const doc: SearchDocument = {
    id: `video:${video.id}`,
    type: 'video',
    title: video.title,
    description: video.title,
    url: `/videos#${video.id}`,
    imageUrl: video.thumbnailUrl ?? '',
    publishedAt: video.publishedAt ?? video.createdAt,
  }
  await indexDocument(doc)
}

export async function removeFromIndex(id: string): Promise<void> {
  await removeDocument(id)
}