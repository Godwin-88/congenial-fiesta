import { redirect } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { getDeviceBySlug } from '@/lib/devices/queries'
import type { Device } from '@/types/cms'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import { BenchmarkChart } from '@/components/devices/BenchmarkChart'
import { BuyBox } from '@/components/devices/BuyBox'
import { VerdictBlock } from '@/components/devices/VerdictBlock'
import CompareRadarChart from '@/components/compare/CompareRadarChart'
import CompareSpecTable from '@/components/compare/CompareSpecTable'
import CompareDevicePicker from '@/components/compare/CompareDevicePicker'
import ShareComparisonButton from '@/components/compare/ShareComparisonButton'
import SaveComparisonButton from '@/components/compare/SaveComparisonButton'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOld(d: Device): any {
  return d as unknown as any
}

interface PageProps {
  searchParams: Promise<{ devices: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const slugs = (params.devices ?? '').split(',').filter(Boolean).slice(0, 3)
  const devices = await Promise.all(slugs.map((s) => getDeviceBySlug(s)))
  const validDevices = devices.filter((d): d is Device => d !== null)

  if (validDevices.length < 2) {
    return { title: 'Compare Devices | FweezyTech' }
  }

  const deviceNames = validDevices.map((d) => d.name).join(' and ')
  const sortedSlugs = slugs.sort().join(',')

  return {
    title: `${deviceNames} | FweezyTech`,
    description: `Compare ${deviceNames} — specs, Fweezy Score, benchmarks, and verdict.`,
    openGraph: {
      title: `${deviceNames} | FweezyTech`,
      description: `Compare ${deviceNames} — specs, Fweezy Score, benchmarks, and verdict.`,
      images: [`/api/og/compare?devices=${sortedSlugs}`],
    },
  }
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawSlugs = (params.devices ?? '').split(',').filter(Boolean)
  const slugs = rawSlugs.slice(0, 3)

  if (slugs.length < 2) {
    redirect('/devices?toast=compare-error')
  }

  const sorted = [...slugs].sort()
  const isCanonical = slugs.join(',') === sorted.join(',')

  if (!isCanonical) {
    redirect(`/compare?devices=${sorted.join(',')}`)
  }

  const deviceResults = await Promise.all(
    slugs.map((slug) => getDeviceBySlug(slug)),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devices = deviceResults.filter((d): d is any => d !== null).map(toOld)

  if (devices.length < 2) {
    redirect('/devices?toast=compare-not-found')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden="true">›</li>
          <li><span className="text-foreground">Compare</span></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">{devices.map((d: any) => d.name).join(' vs ')}</li>
        </ol>
      </nav>

      <h1 className="mb-6 font-heading text-3xl font-bold text-foreground">
        {devices.map((d: any) => d.name).join(' vs ')}
      </h1>

      {/* Device images side-by-side */}
      <div className={`grid gap-4 mb-8 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {devices.map((device: any) => {
          const images = device.images as Array<Record<string, unknown>> | undefined
          const primaryImage = images?.find((img: any) => img.isPrimary) ?? images?.[0]
          const brandData = device.brand as Record<string, unknown> | undefined
          return (
            <div key={device.slug} className="flex flex-col items-center">
              <div className="relative aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-xl bg-muted">
                {primaryImage ? (
                  <img
                    src={String(primaryImage.url)}
                    alt={String(primaryImage.alt ?? device.name)}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">{brandData?.name as string ?? ''}</p>
                <p className="font-heading font-bold text-foreground">{device.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      <CompareDevicePicker
        selectedSlugs={slugs}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deviceNames={(devices as any[]).map((d: any) => d.name)}
        onAdd={(slug: string) => {
          const updated = [...slugs, slug].sort()
          redirect(`/compare?devices=${updated.join(',')}`)
        }}
        onRemove={(slug: string) => {
          const updated = slugs.filter((s) => s !== slug)
          if (updated.length < 2) {
            redirect('/devices?toast=compare-error')
          } else {
            redirect(`/compare?devices=${updated.join(',')}`)
          }
        }}
      />

      <div className="mt-8 flex flex-col items-center">
        <CompareRadarChart
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          devices={(devices as any[]).map((d: any) => ({
            name: d.name,
            scores: {
              display: d.scores?.display ?? 0,
              performance: d.scores?.performance ?? 0,
              camera: d.scores?.camera ?? 0,
              battery: d.scores?.battery ?? 0,
              value: d.scores?.value ?? 0,
            },
          }))}
        />
      </div>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Fweezy Score</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <div key={device.slug} className="text-center">
              <p className="font-heading text-lg font-bold text-foreground mb-2">{device.name}</p>
              <ScoreBadge score={device.scores?.overall ?? 0} size="lg" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Specifications</h2>
        <CompareSpecTable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          devices={(devices as any[]).map((d: any) => {
            return {
              [d.name]: {
                Dimensions: { label: 'Dimensions', value: d.specsDesign?.dimensions },
                Weight: { label: 'Weight', value: d.specsDesign?.weight },
                Build: { label: 'Build', value: d.specsDesign?.build },
                'Water Resistance': { label: 'Water Resistance', value: d.specsDesign?.waterResistance },
                'Display Size': { label: 'Display Size', value: d.specsDisplay?.size },
                'Display Type': { label: 'Display Type', value: d.specsDisplay?.type },
                'Display Resolution': { label: 'Display Resolution', value: d.specsDisplay?.resolution },
                'Refresh Rate': { label: 'Refresh Rate', value: d.specsDisplay?.refreshRate },
                'Display Brightness': { label: 'Display Brightness', value: d.specsDisplay?.brightness },
                Chipset: { label: 'Chipset', value: d.specsProcessor?.chipset },
                CPU: { label: 'CPU', value: d.specsProcessor?.cpu },
                GPU: { label: 'GPU', value: d.specsProcessor?.gpu },
                'RAM': { label: 'RAM', value: d.specsMemory?.ram },
                Storage: { label: 'Storage', value: d.specsMemory?.storage },
                'Main Camera': { label: 'Main Camera', value: d.specsCamera?.mainCamera },
                Ultrawide: { label: 'Ultrawide', value: d.specsCamera?.ultrawide },
                Telephoto: { label: 'Telephoto', value: d.specsCamera?.telephoto },
                'Battery Capacity': { label: 'Battery Capacity', value: d.specsBattery?.capacity },
                'Wired Charging': { label: 'Wired Charging', value: d.specsBattery?.wiredCharging },
                'Wireless Charging': { label: 'Wireless Charging', value: d.specsBattery?.wirelessCharging },
                OS: { label: 'OS', value: d.specsSoftware?.os },
              },
            }
          })}
          deviceNames={devices.map((d: any) => d.name)}
        />
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Performance Benchmarks</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <div key={device.slug} className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-heading text-lg font-bold text-foreground">{device.name}</h3>
              <BenchmarkChart benchmarks={device.benchmarks ?? null} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Fweezy's Take</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <VerdictBlock key={device.slug} verdict={device.verdict} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Where to Buy</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <BuyBox
              key={device.slug}
              buyLinks={device.buyLinks}
              deviceName={device.name}
              deviceSlug={device.slug}
            />
          ))}
        </div>
      </section>

      <div className="mt-8 flex justify-end gap-3">
        <SaveComparisonButton deviceSlugs={slugs} />
        <ShareComparisonButton />
      </div>

      {/* Schema.org JSON-LD */}
      {devices.map((device: any) => (
        <Script
          key={device.slug}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: device.name,
              brand: { '@type': 'Brand', name: typeof device.brand === 'object' && device.brand !== null ? device.brand.name : '' },
              description: device.seo?.metaDescription ?? device.tagline ?? '',
            }),
          }}
        />
      ))}
    </div>
  )
}