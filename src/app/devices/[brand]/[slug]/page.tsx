import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAllDevicePaths, getDevice } from '@/lib/devices/queries'
import DeviceDetail from '@/components/devices/DeviceDetail'

interface DeviceDetailPageProps {
  params: Promise<{ brand: string; slug: string }>
}

export async function generateStaticParams() {
  return getAllDevicePaths()
}

export async function generateMetadata({
  params,
}: DeviceDetailPageProps): Promise<Metadata> {
  const { brand, slug } = await params
  const device = await getDevice(brand, slug)
  if (!device) return { title: 'Device Not Found | FweezyTech' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = device as any
  const brandData = d.brand as Record<string, unknown>
  const dName = String(d.name ?? '')
  const dScore = Number(d.scores_overall ?? 0)
  const metaTitle = d.seo_title ? String(d.seo_title) : `${dName} Review & Full Specs | FweezyTech`
  const metaDescription =
    d.seo_description
      ? String(d.seo_description)
      : `In-depth ${dName} review by Millan Wafulla. Score: ${dScore}/100. Full specs, benchmarks, pros & cons, and best prices in Kenya.`

  const ogImages: Array<{ url: string }> = []
  if (d.seo_og_image) {
    ogImages.push({ url: String(d.seo_og_image) })
  } else if (d.images?.[0]) {
    ogImages.push({ url: String(d.images[0].url) })
  }

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
    },
  }
}

export default async function DeviceDetailPage({
  params,
}: DeviceDetailPageProps) {
  const { brand: brandSlug, slug } = await params
  const device = await getDevice(brandSlug, slug)
  if (!device) notFound()

  return <DeviceDetail device={device} />
}
