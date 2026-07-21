import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getAllDevicePaths, getDevice } from '@/lib/devices/queries'
import type { Brand } from '@/payload-types'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import { RadarChart } from '@/components/devices/RadarChart'
import { SpecTable } from '@/components/devices/SpecTable'
import { BenchmarkChart } from '@/components/devices/BenchmarkChart'
import { BuyBox } from '@/components/devices/BuyBox'
import { VerdictBlock } from '@/components/devices/VerdictBlock'

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

  const brandData = device.brand as Brand
  const metaTitle = device.seo?.metaTitle ?? `${device.name} Review & Full Specs | FweezyTech`
  const metaDescription =
    device.seo?.metaDescription ??
    `In-depth ${device.name} review by Fweezy. Score: ${device.scores?.overall ?? 'N/A'}/100. Full specs, benchmarks, pros & cons, and best prices in Kenya.`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      images: device.seo?.ogImageUrl
        ? [{ url: device.seo.ogImageUrl }]
        : device.images?.[0]
          ? [{ url: device.images[0].url }]
          : [],
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

  const brandData = device.brand as Brand
  const overallScore = device.scores?.overall ?? 0
  const primaryImage = device.images?.find((img) => img.isPrimary) ?? device.images?.[0]
  const hasBenchmarks =
    device.benchmarks &&
    Object.values(device.benchmarks).some((v) => v !== null && v !== undefined && v > 0)

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: device.name,
    description: device.seo?.metaDescription ?? device.tagline ?? '',
    brand: { '@type': 'Brand', name: brandData.name },
    image: primaryImage?.url ?? '',
    review: {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Fweezy' },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: overallScore,
        bestRating: 100,
      },
    },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden="true">›</li>
          <li><Link href="/devices" className="hover:text-foreground">Devices</Link></li>
          <li aria-hidden="true">›</li>
          <li>{brandData.name}</li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">{device.name}</li>
        </ol>
      </nav>

      {/* Hero section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {device.images && device.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {device.images.map((img, i) => (
                <div
                  key={i}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    img.isPrimary ? 'border-brand-primary' : 'border-border'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device info */}
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground lg:text-4xl">
              {device.name}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {brandData.name} &middot; Released {device.releaseYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize text-muted-foreground">
              {device.category}
            </span>
            {device.priceKES && (
              <span className="text-xl font-bold text-foreground">
                KES {device.priceKES.toLocaleString()}
              </span>
            )}
            {device.priceUSD && (
              <span className="text-sm text-muted-foreground">
                (~${device.priceUSD.toLocaleString()})
              </span>
            )}
          </div>

          <BuyBox
            buyLinks={device.buyLinks}
            deviceName={device.name}
            deviceSlug={device.slug}
          />

          <div className="flex items-center gap-4">
            <ScoreBadge score={overallScore} size="lg" />
            <div>
              <p className="font-heading text-lg font-bold text-foreground">Fweezy Score</p>
              <p className="text-sm text-muted-foreground">Overall rating</p>
            </div>
          </div>

          <RadarChart
            scores={{
              display: device.scores?.display ?? 0,
              performance: device.scores?.performance ?? 0,
              camera: device.scores?.camera ?? 0,
              battery: device.scores?.battery ?? 0,
              value: device.scores?.value ?? 0,
            }}
          />

          <VerdictBlock verdict={device.verdict} />
        </div>
      </div>

      {/* Quick specs strip */}
      <div className="mt-12 flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
        {[
          { icon: '📱', label: 'Display', value: device.specsDisplay?.size },
          { icon: '⚡', label: 'Chipset', value: device.specsProcessor?.chipset },
          { icon: '📷', label: 'Camera', value: device.specsCamera?.mainCamera?.split(' ')[0] },
          { icon: '🔋', label: 'Battery', value: device.specsBattery?.capacity },
          { icon: '💾', label: 'RAM', value: device.specsMemory?.ram?.split(' ')[0] },
          { icon: '🛡️', label: 'Protection', value: device.specsDesign?.waterResistance },
        ]
          .filter((s) => s.value)
          .map((spec) => (
            <div
              key={spec.label}
              className="flex min-w-[100px] flex-col items-center rounded-lg bg-muted/50 p-3 text-center"
            >
              <span className="text-lg">{spec.icon}</span>
              <span className="mt-1 text-xs text-muted-foreground">{spec.label}</span>
              <span className="text-sm font-semibold text-foreground">{spec.value}</span>
            </div>
          ))}
      </div>

      {/* Full Verdict */}
      {device.verdict?.fullVerdict && (
        <section className="mt-12">
          <div className="rounded-xl border-l-4 border-brand-primary bg-card p-6">
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
              Fweezy's Full Verdict
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
              {JSON.stringify(device.verdict.fullVerdict)}
            </div>
          </div>
        </section>
      )}

      {/* Spec Table */}
      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
          Full Specifications
        </h2>
        <SpecTable device={device} />
      </section>

      {/* Benchmarks */}
      {hasBenchmarks && (
        <section className="mt-12">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
            Performance Benchmarks
          </h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <BenchmarkChart benchmarks={device.benchmarks ?? null} />
          </div>
        </section>
      )}

      {/* Video Review */}
      {(device.relatedVideo || device.relatedTiktok) && (
        <section className="mt-12">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
            Fweezy's Video Review
          </h2>
          <div className="space-y-6">
            {device.relatedVideo && (
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={`https://www.youtube.com/embed/${device.relatedVideo}`}
                  title={`${device.name} Review by Fweezy`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            )}
            {device.relatedTiktok && (
              <div>
                <blockquote className="tiktok-embed" cite={device.relatedTiktok}>
                  <section>
                    <a target="_blank" rel="noopener" href={device.relatedTiktok}>
                      View on TikTok
                    </a>
                  </section>
                </blockquote>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
    </div>
  )
}