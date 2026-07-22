import type { MetadataRoute } from 'next'
import { getAllDevicePaths } from '@/lib/devices/queries'
import { getAllArticlePaths } from '@/lib/articles/queries'
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

  const [devicePaths, articlePaths, milestones] = await Promise.all([
    getAllDevicePaths().catch(() => []),
    getAllArticlePaths().catch(() => []),
    getPayload({ config })
      .then((payload) => payload.find({ collection: 'milestones', limit: 1 }))
      .catch(() => ({ docs: [] })),
  ])

  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/devices`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/videos`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/articles`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/coming-soon`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  const devicePages: MetadataRoute.Sitemap = devicePaths.map(({ brand, slug }) => ({
    url: `${baseUrl}/devices/${brand}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const articlePages: MetadataRoute.Sitemap = articlePaths.map(({ slug }) => ({
    url: `${baseUrl}/articles/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...devicePages, ...articlePages]
}