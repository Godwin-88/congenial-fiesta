import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { Suspense } from 'react'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import { RadarChart } from '@/components/devices/RadarChart'
import { Smartphone, Cpu, Camera, BatteryFull, MemoryStick, ShieldCheck, GitCompareArrows, Play } from 'lucide-react'
import { BuyBox } from '@/components/devices/BuyBox'
import { VerdictBlock } from '@/components/devices/VerdictBlock'
import AvailabilityBadge from '@/components/devices/AvailabilityBadge'
import NotifyMePanel from '@/components/devices/NotifyMePanel'
import ShareRow from '@/components/devices/ShareRow'
import FullSpecsTable from '@/components/devices/FullSpecsTable'
import RelatedDevices from '@/components/devices/RelatedDevices'
import RatingsSection from '@/components/community/RatingsSection'
import CommentsSection from '@/components/community/CommentsSection'
import RatingsSkeleton from '@/components/community/RatingsSkeleton'
import CommentsSkeleton from '@/components/community/CommentsSkeleton'
import AddToCompareButton from '@/components/devices/AddToCompareButton'
import { getRelatedDevices } from '@/lib/devices/queries'
import type { Device } from '@/types/cms'

interface DeviceDetailProps {
  device: Device
  isPreview?: boolean
}

export default async function DeviceDetail({ device, isPreview = false }: DeviceDetailProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = device as any
  const brandData = (d.brand as Record<string, unknown> | null) ?? {}
  const overallScore = Number(d.scores_overall ?? 0)
  const images = d.images as Array<Record<string, unknown>> | undefined
  const primaryImage = images?.find((img: any) => img.isPrimary) ?? images?.[0]
  const dName = String(d.name ?? '')
  const dSlug = String(d.slug ?? '')
  const dCategory = String(d.device_type?.label ?? d.major_category ?? '')
  const dPriceKES = Number(d.price_kes ?? 0)
  const dPriceUSD = Number(d.price_usd ?? 0)
  const dReleaseYear = String(d.release_year ?? '')
  const dAvailability = (d.availability as Device['availability']) ?? null
  const dScoreDisplay = Number(d.score_display ?? 0)
  const dScorePerformance = Number(d.score_performance ?? 0)
  const dScoreCamera = Number(d.score_camera ?? 0)
  const dScoreBattery = Number(d.score_battery ?? 0)
  const dScoreValue = Number(d.score_value ?? 0)
  const dBuyLinks = d.buy_links as Array<Record<string, unknown>> | undefined
  const hasBuyLinks = Array.isArray(dBuyLinks) && (dBuyLinks.length ?? 0) > 0
  const dSpecsDesign = d.specs_design as Record<string, unknown> | undefined
  const dSpecsDisplay = d.specs_display as Record<string, unknown> | undefined
  const dSpecsProcessor = d.specs_processor as Record<string, unknown> | undefined
  const dSpecsMemory = d.specs_memory as Record<string, unknown> | undefined
  const dSpecsCamera = d.specs_camera as Record<string, unknown> | undefined
  const dCamMain = (() => {
    const rear = (dSpecsCamera as any)?.rear
    if (Array.isArray(rear) && rear[0]?.sensorType) return String(rear[0].sensorType).split(' ')[0]
    const selfie = (dSpecsCamera as any)?.selfie?.sensorType
    if (selfie) return String(selfie).split(' ')[0]
    return undefined
  })()
  const dSpecsBattery = d.specs_battery as Record<string, unknown> | undefined
  const dRelatedVideoId = String(d.related_video_id ?? '')
  const dRelatedTiktokUrl = String(d.related_tiktok_url ?? '')

  const [relatedDevices] = await Promise.all([
    getRelatedDevices({
      id: device.id,
      major_category: device.major_category,
      brand_id: device.brand_id,
    }).catch(() => []),
  ])

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
    <div>
      {isPreview && (
        <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <Link href="/admin/devices" className="underline underline-offset-2">Exit preview</Link>
          {' '}- Draft preview - this device is not yet published.
        </div>
      )}
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
              <AvailabilityBadge availability={dAvailability} />
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

            {(!hasBuyLinks || dAvailability === 'coming-soon' || dAvailability === 'out-of-stock') && (
              <NotifyMePanel
                deviceSlug={dSlug}
                deviceName={dName}
                label="Where to buy — get notified when this device is available"
              />
            )}

            <div className="flex items-center gap-4">
              <ScoreBadge score={overallScore} size="lg" />
              <div>
                <p className="font-heading text-lg font-bold text-foreground">Fweezy Score</p>
                <p className="text-sm text-muted-foreground">Overall rating</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <AddToCompareButton
                device={{
                  slug: dSlug,
                  brandSlug: String(brandData.slug ?? ''),
                  name: dName,
                  imageUrl: primaryImage ? String(primaryImage.url) : '',
                  score: overallScore,
                }}
              />
              <ShareRow title={`${dName} review by Fweezy`} path={`/devices/${String(brandData.slug ?? '')}/${dSlug}`} />
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

        {/* Quick specs */}
        <div className="mt-12 rounded-xl border border-border bg-card p-4">
          {[
            { Icon: Smartphone, label: 'Display', value: dSpecsDisplay?.['Size'] },
            { Icon: Cpu, label: 'Chipset', value: dSpecsProcessor?.['Chipset'] },
            { Icon: Camera, label: 'Camera', value: dCamMain },
            { Icon: BatteryFull, label: 'Battery', value: dSpecsBattery?.['Capacity'] },
            { Icon: MemoryStick, label: 'RAM', value: dSpecsMemory?.['RAM']?.toString().split(' ')[0] },
            { Icon: ShieldCheck, label: 'IP Rating', value: dSpecsDesign?.['IP Rating'] },
          ]
            .filter((s) => s.value)
            .map((spec) => (
              <div
                key={spec.label}
                className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
              >
                <spec.Icon className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">{spec.label}</span>
                <span className="ml-auto text-sm font-semibold text-foreground">
                  {String(spec.value)}
                </span>
              </div>
            ))}
        </div>

        {/* Full Specifications */}
        <FullSpecsTable
          specs={{
            design: dSpecsDesign,
            display: dSpecsDisplay,
            processor: dSpecsProcessor,
            memory: dSpecsMemory,
            camera: dSpecsCamera,
            battery: dSpecsBattery,
            connectivity: d.specs_connectivity as Record<string, unknown> | undefined,
            network: d.specs_network as Record<string, unknown> | undefined,
            software: d.specs_software as Record<string, unknown> | undefined,
          }}
        />

        {/* Full Verdict */}
        {d.verdict_full && (
          <section className="mt-12">
            <div className="rounded-xl border-l-4 border-brand-primary bg-card p-6">
              <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
                Fweezytech's Full Verdict
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
                {d.verdict_full}
              </div>
            </div>
          </section>
        )}

        {/* Video Review */}
        {(dRelatedVideoId || dRelatedTiktokUrl) && (
          <section className="mt-12">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Fweezytech's Video Review
              </h2>
              {dRelatedVideoId && (
                <a
                  href={`https://www.youtube.com/watch?v=${dRelatedVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Play size={16} className="text-red-500" />
                  Watch on YouTube
                </a>
              )}
            </div>
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

        <RelatedDevices devices={relatedDevices} currentSlug={dSlug} />

        <Suspense fallback={<RatingsSkeleton />}>
          <RatingsSection deviceSlug={dSlug} deviceName={dName} />
        </Suspense>

        <Suspense fallback={<CommentsSkeleton />}>
          <CommentsSection contentType="device" contentSlug={dSlug} />
        </Suspense>

        {/* Schema.org JSON-LD */}
        {!isPreview && (
          <Script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
          />
        )}
      </div>
    </div>
  )
}
