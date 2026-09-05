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
import DeviceImageGallery, { type GalleryImage } from '@/components/devices/DeviceImageGallery'
import RatingsSection from '@/components/community/RatingsSection'
import CommentsSection from '@/components/community/CommentsSection'
import RatingsSkeleton from '@/components/community/RatingsSkeleton'
import CommentsSkeleton from '@/components/community/CommentsSkeleton'
import AddToCompareButton from '@/components/devices/AddToCompareButton'
import SectionJumpNav from '@/components/devices/SectionJumpNav'
import BackToTop from '@/components/devices/BackToTop'
import PageProgress from '@/components/devices/PageProgress'
import VideoReview from '@/components/devices/VideoReview'
import { getRelatedDevices } from '@/lib/devices/queries'
import type { Device } from '@/types/cms'

interface DeviceDetailProps {
  device: Device
  isPreview?: boolean
}

/** Flatten the nested camera JSONB into display-ready rows for the specs accordion. */
function cameraToRows(cam?: Record<string, unknown>): { label: string; value?: string }[] {
  if (!cam) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cam as any
  const rows: { label: string; value?: string }[] = []
  const rear = Array.isArray(c.rear) ? c.rear : []
  if (rear.length > 0) {
    rear.forEach((r: any, i: number) => {
      if (r?.sensorType) rows.push({ label: `Rear camera ${i + 1}`, value: String(r.sensorType) })
    })
  } else if (c.main) {
    rows.push({ label: 'Rear camera', value: String(c.main) })
  }
  if (c.selfie?.sensorType) rows.push({ label: 'Selfie camera', value: String(c.selfie.sensorType) })
  if (c.video?.rear) rows.push({ label: 'Video (rear)', value: String(c.video.rear) })
  if (c.video?.front) rows.push({ label: 'Video (front)', value: String(c.video.front) })
  if (c.extras) rows.push({ label: 'Camera extras', value: String(c.extras) })
  return rows
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

  // Section anchors for the sticky jump nav (ids must be unique & stable).
  // Phase 2: video is prominent — place it right after Overview.
  const specSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'video-review', label: 'Video' },
    { id: 'quick-specs', label: 'Quick Specs' },
    { id: 'full-specs', label: 'Full Specs' },
    { id: 'related-devices', label: 'Related' },
    { id: 'reviews', label: 'Reviews' },
  ]

  // Convert the unstructured JSONB spec objects into stable {title, rows} groups.
  const specGroups = [
    { title: 'Design & Build', data: dSpecsDesign, keys: ['Dimensions', 'Weight', 'Front', 'Back', 'Colours', 'IP Rating'] },
    { title: 'Display', data: dSpecsDisplay, keys: ['Size', 'Type', 'Resolution', 'Refresh Rate', 'Pixel Density', 'Peak Brightness', 'HDR', 'Protection'] },
    { title: 'Processor', data: dSpecsProcessor, keys: ['Chipset', 'CPU', 'GPU'] },
    { title: 'Memory', data: dSpecsMemory, keys: ['RAM', 'RAM type', 'Storage', 'Expandable'] },
    { title: 'Battery', data: dSpecsBattery, keys: ['Capacity', 'Battery type', 'Wired charging', 'Wireless charging', 'Reverse charging'] },
    { title: 'Camera', data: dSpecsCamera, keys: [] },
    { title: 'Connectivity', data: d.specs_connectivity as Record<string, unknown> | undefined, keys: ['WiFi', 'Bluetooth', 'NFC', 'USB', 'Positioning', 'IR blaster'] },
    { title: 'Network', data: d.specs_network as Record<string, unknown> | undefined, keys: ['SIM', 'Technology', '2G bands', '3G bands', '4G bands', '5G bands'] },
    { title: 'Software', data: d.specs_software as Record<string, unknown> | undefined, keys: ['OS', 'UI layer', 'Major OS upgrades', 'Security patches'] },
  ]
  const fullSpecGroups = specGroups.map((g) => ({
    title: g.title,
    rows: [
      ...g.keys.map((k) => {
        const val = (g.data as Record<string, unknown> | undefined)?.[k]
        return { label: k, value: val ? String(val) : undefined }
      }),
      // Camera gets a custom flatten for rear/selfie/video arrays.
      ...(g.title === 'Camera' ? cameraToRows(dSpecsCamera) : []),
    ],
  }))

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: dName,
    description: d.seo_description ? String(d.seo_description) : (d.tagline ? String(d.tagline) : ''),
    brand: { '@type': 'Brand', name: brandData.name ?? '' },
    image: primaryImage?.url ? String(primaryImage.url) : '',
    review: {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Millan Wafulla' },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: overallScore,
        bestRating: 100,
      },
    },
  }

  return (
    <div>
      <PageProgress />
      {isPreview && (
        <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <Link href="/admin/devices" className="underline underline-offset-2">Exit preview</Link>
          {' '}- Draft preview - this device is not yet published.
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ol className="flex w-max items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/devices" className="hover:text-foreground">Devices</Link></li>
            <li aria-hidden="true">›</li>
            <li>{String(brandData.name ?? '')}</li>
            <li aria-hidden="true">›</li>
            <li className="text-foreground">{dName}</li>
          </ol>
        </nav>

        {/* Sticky section jump navigation (mobile-first) */}
        <SectionJumpNav items={specSections} />

        {/* Hero section */}
        <section id="overview" className="grid scroll-mt-28 gap-8 lg:grid-cols-2">
          {/* Image gallery */}
          <div>
            <Link
              href="/devices"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              ← All Devices
            </Link>
            <DeviceImageGallery images={images as unknown as GalleryImage[]} deviceName={dName} />
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
              <ShareRow title={`${dName} review by Millan Wafulla`} path={`/devices/${String(brandData.slug ?? '')}/${dSlug}`} />
            </div>

            <VerdictBlock
              verdict={{
                pros: d.verdict_pros ?? [],
                cons: d.verdict_cons ?? [],
                bottomLine: d.verdict_bottom_line ?? null,
                fullVerdict: d.verdict_full ?? null,
              }}
            />
          </div>
        </section>

        {/* Video Review — prominent, right after overview, poster-play lazy load */}
        {(dRelatedVideoId || dRelatedTiktokUrl) && (
          <section id="video-review" className="mt-12 scroll-mt-28">
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
            <VideoReview
              deviceName={dName}
              videoId={dRelatedVideoId}
              tiktokUrl={dRelatedTiktokUrl}
            />
          </section>
        )}

        {/* Quick specs — dense stat grid (was a tall vertical list) */}
        <section id="quick-specs" className="mt-12 scroll-mt-28">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
                    <spec.Icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-muted-foreground">{spec.label}</span>
                  <span className="text-sm font-semibold leading-tight text-foreground">
                    {String(spec.value)}
                  </span>
                </div>
              ))}
          </div>
        </section>

        {/* Full Specifications — collapsible accordion */}
        <section id="full-specs" className="scroll-mt-28">
          <FullSpecsTable groups={fullSpecGroups} />
        </section>

        {/* Full Verdict */}
        {d.verdict_full && (
          <section id="full-verdict" className="mt-12 scroll-mt-28">
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

        <section id="related-devices" className="scroll-mt-28">
          <RelatedDevices devices={relatedDevices} currentSlug={dSlug} />
        </section>

        <section id="reviews" className="scroll-mt-28">
          <Suspense fallback={<RatingsSkeleton />}>
            <RatingsSection deviceSlug={dSlug} deviceName={dName} />
          </Suspense>

          <Suspense fallback={<CommentsSkeleton />}>
            <CommentsSection contentType="device" contentSlug={dSlug} />
          </Suspense>
        </section>

        {/* Schema.org JSON-LD */}
        {!isPreview && (
          <Script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
          />
        )}
      </div>

      <BackToTop />
    </div>
  )
}
