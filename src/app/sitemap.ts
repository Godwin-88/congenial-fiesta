import type { MetadataRoute } from 'next'
import { getAllDevicePaths } from '@/lib/devices/queries'
import { getAllArticlePaths } from '@/lib/articles/queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

  const [devicePaths, articlePaths] = await Promise.all([
    getAllDevicePaths().catch(() => []),
    getAllArticlePaths().catch(() => []),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/devices`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/videos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/coming-soon`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ]

  const devicePages: MetadataRoute.Sitemap = devicePaths.map(({ brand, slug }) => ({
    url: `${baseUrl}/devices/${brand}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const articlePages: MetadataRoute.Sitemap = articlePaths.map(({ slug }) => ({
    url: `${baseUrl}/articles/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...devicePages, ...articlePages]
}