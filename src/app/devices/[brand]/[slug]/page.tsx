import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { getAllDevicePaths, getDevice } from '@/lib/devices/queries'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import { RadarChart } from '@/components/devices/RadarChart'
import { SpecTable } from '@/components/devices/SpecTable'
import { BenchmarkChart } from '@/components/devices/BenchmarkChart'
import { BuyBox } from '@/components/devices/BuyBox'
import { VerdictBlock } from '@/components/devices/VerdictBlock'
import RatingsSection from '@/components/community/RatingsSection'
import CommentsSection from '@/components/community/CommentsSection'
import { Suspense } from 'react'
import RatingsSkeleton from '@/components/community/RatingsSkeleton'
import CommentsSkeleton from '@/components/community/CommentsSkeleton'

interface DeviceDetailPageProps {
  params: Promise<{ brand: string; slug: string }>
}

export async function generateStaticParams() {
  return getAllDevicePaths()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOld(d: any): any {
  return d
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
  const dScore = Number(d.score_overall ?? 0)
  const metaTitle = d.seo_title ? String(d.seo_title) : `${dName} Review & Full Specs | FweezyTech`
  const metaDescription =
    d.seo_description
      ? String(d.seo_description)
      : `In-depth ${dName} review by Fweezy. Score: ${dScore}/100. Full specs, benchmarks, pros & cons, and best prices in Kenya.`

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = device as any
  const brandData = d.brand as Record<string, unknown>
  const overallScore = Number(d.score_overall ?? 0)
  const images = d.images as Array<Record<string, unknown>> | undefined
  const primaryImage = images?.find((img: any) => img.isPrimary) ?? images?.[0]
  const dName = String(d.name ?? '')
  const dSlug = String(d.slug ?? '')
  const dCategory = String(d.category ?? '')
  const dPriceKES = Number(d.price_kes ?? 0)
  const dPriceUSD = Number(d.price_usd ?? 0)
  const dReleaseYear = String(d.release_year ?? '')
  const dScoreDisplay = Number(d.score_display ?? 0)
  const dScorePerformance = Number(d.score_performance ?? 0)
  const dScoreCamera = Number(d.score_camera ?? 0)
  const dScoreBattery = Number(d.score_battery ?? 0)
  const dScoreValue = Number(d.score_value ?? 0)
  const dBuyLinks = d.buy_links as Array<Record<string, unknown>> | undefined
  const dSpecsDesign = d.specs_design as Record<string, unknown> | undefined
  const dSpecsDisplay = d.specs_display as Record<string, unknown> | undefined
  const dSpecsProcessor = d.specs_processor as Record<string, unknown> | undefined
  const dSpecsMemory = d.specs_memory as Record<string, unknown> | undefined
  const dSpecsCamera = d.specs_camera as Record<string, unknown> | undefined
  const dSpecsBattery = d.specs_battery as Record<string, unknown> | undefined
  const dRelatedVideoId = String(d.related_video_id ?? '')
  const dRelatedTiktokUrl = String(d.related_tiktok_url ?? '')

  const hasBenchmarks =
    d.benchmark_geekbench_single || d.benchmark_geekbench_multi || d.benchmark_antutu || d.benchmark_pcmark

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: dName,
    description: d.seo_description ? String(d.seo_description) : (d.tagline ? String(d.tagline) : ''),
    brand: { '@type': 'Brand', name: brandData.name ?? '' },
    image: primaryImage?.url ? String(primaryImage.url) : '',
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
          <li>{String(brandData.name ?? '')}</li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">{dName}</li>
        </ol>
      </nav>

      {/* Hero section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted">
            {primaryImage ? (
              <Image
                src={String(primaryImage.url)}
                alt={String(primaryImage.alt)}
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
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {images.map((img: any, i: number) => (
                <div
                  key={i}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    img.isPrimary ? 'border-brand-primary' : 'border-border'
                  }`}
                >
                  <Image
                    src={String(img.url)}
                    alt={String(img.alt)}
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
              {dName}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {String(brandData.name ?? '')} &middot; Released {dReleaseYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize text-muted-foreground">
              {dCategory}
            </span>
            {dPriceKES > 0 && (
              <span className="text-xl font-bold text-foreground">
                KES {dPriceKES.toLocaleString()}
              </span>
            )}
            {dPriceUSD > 0 && (
              <span className="text-sm text-muted-foreground">
                (~${dPriceUSD.toLocaleString()})
              </span>
            )}
          </div>

          <BuyBox
            buyLinks={dBuyLinks}
            deviceName={dName}
            deviceSlug={dSlug}
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
              display: dScoreDisplay,
              performance: dScorePerformance,
              camera: dScoreCamera,
              battery: dScoreBattery,
              value: dScoreValue,
            }}
          />

          <VerdictBlock
            verdict={{
              pros: d.verdict_pros ?? [],
              cons: d.verdict_cons ?? [],
              bottomLine: d.verdict_bottom_line ?? null,
              fullVerdict: d.verdict_full ?? null,
            }}
          />
        </div>
      </div>

      {/* Quick specs strip */}
      <div className="mt-12 flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
        {[
          { icon: '📱', label: 'Display', value: dSpecsDisplay?.size },
          { icon: '⚡', label: 'Chipset', value: dSpecsProcessor?.chipset },
          { icon: '📷', label: 'Camera', value: dSpecsCamera?.mainCamera?.toString().split(' ')[0] },
          { icon: '🔋', label: 'Battery', value: dSpecsBattery?.capacity },
          { icon: '💾', label: 'RAM', value: dSpecsMemory?.ram?.toString().split(' ')[0] },
          { icon: '🛡️', label: 'Protection', value: dSpecsDesign?.waterResistance },
        ]
          .filter((s) => s.value)
          .map((spec) => (
            <div
              key={spec.label}
              className="flex min-w-[100px] flex-col items-center rounded-lg bg-muted/50 p-3 text-center"
            >
              <span className="text-lg">{spec.icon}</span>
              <span className="mt-1 text-xs text-muted-foreground">{spec.label}</span>
              <span className="text-sm font-semibold text-foreground">{String(spec.value)}</span>
            </div>
          ))}
      </div>

      {/* Full Verdict */}
      {d.verdict_full && (
        <section className="mt-12">
          <div className="rounded-xl border-l-4 border-brand-primary bg-card p-6">
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
              Fweezy's Full Verdict
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
              {d.verdict_full}
            </div>
          </div>
        </section>
      )}

      {/* Spec Table */}
      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
          Full Specifications
        </h2>
        <SpecTable device={d} />
      </section>

      {/* Benchmarks */}
      {hasBenchmarks && (
        <section className="mt-12">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
            Performance Benchmarks
          </h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <BenchmarkChart
              benchmarks={{
                geekbenchSingle: d.benchmark_geekbench_single ?? null,
                geekbenchMulti: d.benchmark_geekbench_multi ?? null,
                antutu: d.benchmark_antutu ?? null,
                pcmark: d.benchmark_pcmark ?? null,
              }}
            />
          </div>
        </section>
      )}

      {/* Video Review */}
      {(dRelatedVideoId || dRelatedTiktokUrl) && (
        <section className="mt-12">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
            Fweezy's Video Review
          </h2>
          <div className="space-y-6">
            {dRelatedVideoId && (
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={`https://www.youtube.com/embed/${dRelatedVideoId}`}
                  title={`${dName} Review by Fweezy`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            )}
            {dRelatedTiktokUrl && (
              <div>
                <blockquote className="tiktok-embed" cite={dRelatedTiktokUrl}>
                  <section>
                    <a target="_blank" rel="noopener" href={dRelatedTiktokUrl}>
                      View on TikTok
                    </a>
                  </section>
                </blockquote>
              </div>
            )}
          </div>
        </section>
      )}

      <Suspense fallback={<RatingsSkeleton />}>
        <RatingsSection deviceSlug={dSlug} deviceName={dName} />
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection contentType="device" contentSlug={dSlug} />
      </Suspense>

      {/* Schema.org JSON-LD */}
      <Script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
    </div>
  )
}