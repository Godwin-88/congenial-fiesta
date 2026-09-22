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
import PageProgress from '@/components/devices/PageProgress'
import SectionHeader from '@/components/ui/SectionHeader'
import VideoReview from '@/components/devices/VideoReview'
import { getRelatedDevices } from '@/lib/devices/queries'
import { buildFullSpecGroups, quickSpecValues } from '@/lib/devices/spec-display'
import type { Device } from '@/types/cms'

interface DeviceDetailProps {
  device: Device
  isPreview?: boolean
  /** Absolute site origin (https://host) computed server-side for hydration-safe share links. */
  origin?: string
}

export default async function DeviceDetail({ device, isPreview = false, origin = '' }: DeviceDetailProps) {
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
  // A radar of all zeros is meaningless — only render it when the admin has
  // actually filled in at least one sub-score dimension.
  const hasAnySubScore =
    dScoreDisplay > 0 || dScorePerformance > 0 || dScoreCamera > 0 ||
    dScoreBattery > 0 || dScoreValue > 0
  const dBuyLinks = d.buy_links as Array<Record<string, unknown>> | undefined
  const hasBuyLinks = Array.isArray(dBuyLinks) && (dBuyLinks.length ?? 0) > 0
  const dRelatedVideoId = String(d.related_video_id ?? '')
  const dRelatedTiktokUrl = String(d.related_tiktok_url ?? '')

  // Full Specs groups + Quick Specs values come from the canonical-first display
  // layer (spec-display.ts) — it reads the canonical snake_case keys written by
  // the §24b write gate AND the legacy label keys of pre-gate rows.
  const fullSpecGroups = buildFullSpecGroups(d as Record<string, unknown>)
  const quickSpecs = quickSpecValues(d as Record<string, unknown>)

  const [relatedDevices] = await Promise.all([
    getRelatedDevices({
      id: device.id,
      major_category: device.major_category,
      brand_id: device.brand_id,
    }).catch(() => []),
  ])

  // Section anchors for the sticky jump nav (ids must be unique & stable).
  // A section that will not render must not appear in the TOC — a jump target
  // that lands on nothing is worse than no entry (the "TOC ignores specs" bug).
  const hasFullSpecs = fullSpecGroups.some((g) => g.rows.some((r) => r.value))
  const hasQuickSpecs = Object.values(quickSpecs).some((v) => !!v)
  const specSections = [
    { id: 'overview', label: 'Overview' },
    ...(dRelatedVideoId || dRelatedTiktokUrl ? [{ id: 'video-review', label: 'Video' }] : []),
    ...(hasQuickSpecs ? [{ id: 'quick-specs', label: 'Quick Specs' }] : []),
    ...(hasFullSpecs ? [{ id: 'full-specs', label: 'Full Specs' }] : []),
    { id: 'related-devices', label: 'Related' },
    { id: 'reviews', label: 'Reviews' },
  ]

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

        {/* Two-column layout (desktop): vertical table of contents + content.
            Mobile keeps the horizontal pill-row jump nav above the content. */}
        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* Desktop vertical table of contents (sticky) */}
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <SectionJumpNav items={specSections} variant="vertical" />
          </div>

          <div className="min-w-0">
            {/* Mobile horizontal jump navigation */}
            <div className="lg:hidden">
              <SectionJumpNav items={specSections} variant="horizontal" />
            </div>

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
                <p className="text-sm text-muted-foreground">
                  {overallScore > 0 ? 'Overall rating' : 'Not rated yet — review coming soon'}
                </p>
              </div>
            </div>

            {hasAnySubScore && (
              <RadarChart
                scores={{
                  display: dScoreDisplay,
                  performance: dScorePerformance,
                  camera: dScoreCamera,
                  battery: dScoreBattery,
                  value: dScoreValue,
                }}
              />
            )}

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
              <ShareRow
                title={`${dName} review by Millan Wafulla`}
                absoluteUrl={`${origin}/devices/${String(brandData.slug ?? '')}/${dSlug}`}
              />
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
              deviceSlug={dSlug}
              videoId={dRelatedVideoId}
              tiktokUrl={dRelatedTiktokUrl}
            />
          </section>
        )}

        {/* Quick specs — dense stat grid (was a tall vertical list) */}
        <section id="quick-specs" className="mt-12 scroll-mt-28">
          <SectionHeader
            eyebrow="AT A GLANCE"
            title="Quick Specs"
            description="The essentials you care about most, at a glance."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { Icon: Smartphone, label: 'Display', value: quickSpecs.Display },
              { Icon: Cpu, label: 'Chipset', value: quickSpecs.Chipset },
              { Icon: Camera, label: 'Camera', value: quickSpecs.Camera },
              { Icon: BatteryFull, label: 'Battery', value: quickSpecs.Battery },
              { Icon: MemoryStick, label: 'RAM', value: quickSpecs.RAM },
              { Icon: ShieldCheck, label: 'IP Rating', value: quickSpecs['IP Rating'] },
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
          </div>
        </div>

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
