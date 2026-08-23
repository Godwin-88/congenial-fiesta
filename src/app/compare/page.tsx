import { redirect } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { getDeviceBySlug } from '@/lib/devices/queries'
import type { Device } from '@/types/cms'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
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
    description: `Compare ${deviceNames} — specs, Fweezy Score, and verdict.`,
    openGraph: {
      title: `${deviceNames} | FweezyTech`,
      description: `Compare ${deviceNames} — specs, Fweezy Score, and verdict.`,
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
      />

      <div className="mt-8 flex flex-col items-center">
        <CompareRadarChart
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          devices={(devices as any[]).map((d: any) => ({
            name: d.name,
            scores: {
              display: d.score_display ?? 0,
              performance: d.score_performance ?? 0,
              camera: d.score_camera ?? 0,
              battery: d.score_battery ?? 0,
              value: d.score_value ?? 0,
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
              <ScoreBadge score={device.scores_overall ?? 0} size="lg" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Specifications</h2>
        <CompareSpecTable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          devices={(devices as any[]).map((d: any) => ({
            Design: {
              Dimensions: { label: 'Dimensions', value: d.specs_design?.['Dimensions'] },
              Weight: { label: 'Weight', value: d.specs_design?.['Weight'] },
              Front: { label: 'Front', value: d.specs_design?.['Front'] },
              Back: { label: 'Back', value: d.specs_design?.['Back'] },
              Side: { label: 'Side', value: d.specs_design?.['Side'] },
              Ports: { label: 'Ports', value: d.specs_design?.['Ports'] },
              Speakers: { label: 'Speakers', value: d.specs_design?.['Speakers'] },
              'IP Rating': { label: 'IP Rating', value: d.specs_design?.['IP Rating'] },
            },
            Display: {
              'Display Size': { label: 'Display Size', value: d.specs_display?.['Size'] },
              'Display Type': { label: 'Display Type', value: d.specs_display?.['Type'] },
              'Display Resolution': { label: 'Display Resolution', value: d.specs_display?.['Resolution'] },
              'Refresh Rate': { label: 'Refresh Rate', value: d.specs_display?.['Refresh Rate'] },
              'Pixel Density': { label: 'Pixel Density', value: d.specs_display?.['Pixel Density'] },
              'Screen-to-body': { label: 'Screen-to-body', value: d.specs_display?.['Screen-to-body ratio'] },
              'Peak Brightness': { label: 'Peak Brightness', value: d.specs_display?.['Peak Brightness'] },
              'HDR': { label: 'HDR', value: d.specs_display?.['HDR'] },
              'Color depth': { label: 'Color depth', value: d.specs_display?.['Color depth'] },
            },
            Processor: {
              Chipset: { label: 'Chipset', value: d.specs_processor?.['Chipset'] },
              CPU: { label: 'CPU', value: d.specs_processor?.['CPU'] },
              GPU: { label: 'GPU', value: d.specs_processor?.['GPU'] },
              'Node size': { label: 'Node size', value: d.specs_processor?.['Node size'] },
              'NPU': { label: 'NPU', value: d.specs_processor?.['NPU'] },
            },
            Memory: {
              RAM: { label: 'RAM', value: d.specs_memory?.['RAM'] },
              'RAM type': { label: 'RAM type', value: d.specs_memory?.['RAM type'] },
              Storage: { label: 'Storage', value: d.specs_memory?.['Storage'] },
              'Storage type': { label: 'Storage type', value: d.specs_memory?.['Storage type'] },
              Expandable: { label: 'Expandable', value: d.specs_memory?.['Expandable'] },
            },
            Camera: {
              'Rear Cameras': {
                label: 'Rear Cameras',
                value:
                  ((d.specs_camera?.rear ?? []).map((c: any) => `${c.type}: ${c.sensorType}`).join(' · ') as string) ||
                  undefined,
              },
              Selfie: { label: 'Selfie', value: d.specs_camera?.selfie?.sensorType },
              'Rear Video': { label: 'Rear Video', value: d.specs_camera?.video?.rear },
              'Front Video': { label: 'Front Video', value: d.specs_camera?.video?.front },
              'Video Features': { label: 'Video Features', value: d.specs_camera?.video?.features },
              Extras: { label: 'Extras', value: d.specs_camera?.extras },
            },
            Battery: {
              Capacity: { label: 'Capacity', value: d.specs_battery?.['Capacity'] },
              'Battery type': { label: 'Battery type', value: d.specs_battery?.['Battery type'] },
              'Wired Charging': { label: 'Wired Charging', value: d.specs_battery?.['Wired charging'] },
              'Wireless Charging': { label: 'Wireless Charging', value: d.specs_battery?.['Wireless charging'] },
              'Reverse Charging': { label: 'Reverse Charging', value: d.specs_battery?.['Reverse charging'] },
              'Charging Protocols': { label: 'Charging Protocols', value: d.specs_battery?.['Charging protocols'] },
            },
            Connectivity: {
              WiFi: { label: 'WiFi', value: d.specs_connectivity?.['WiFi'] },
              Bluetooth: { label: 'Bluetooth', value: d.specs_connectivity?.['Bluetooth'] },
              NFC: { label: 'NFC', value: d.specs_connectivity?.['NFC'] },
              USB: { label: 'USB', value: d.specs_connectivity?.['USB'] },
              Positioning: { label: 'Positioning', value: d.specs_connectivity?.['Positioning'] },
              'IR Blaster': { label: 'IR Blaster', value: d.specs_connectivity?.['IR blaster'] },
            },
            Network: {
              SIM: { label: 'SIM', value: d.specs_network?.['SIM'] },
              Technology: { label: 'Technology', value: d.specs_network?.['Technology'] },
              '2G bands': { label: '2G bands', value: d.specs_network?.['2G bands'] },
              '3G bands': { label: '3G bands', value: d.specs_network?.['3G bands'] },
              '4G bands': { label: '4G bands', value: d.specs_network?.['4G bands'] },
              '5G bands': { label: '5G bands', value: d.specs_network?.['5G bands'] },
            },
            Software: {
              OS: { label: 'OS', value: d.specs_software?.['OS'] },
              'UI layer': { label: 'UI layer', value: d.specs_software?.['UI layer'] },
              'Major OS upgrades': { label: 'Major OS upgrades', value: d.specs_software?.['Major OS upgrades'] },
              'Security patches': { label: 'Security patches', value: d.specs_software?.['Security patches'] },
            },
          }))}
          deviceNames={devices.map((d: any) => d.name)}
        />
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Fweezytech's Take</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <VerdictBlock
              key={device.slug}
              verdict={{
                pros: (device.verdict_pros ?? []).map((p: string) => ({ point: p })),
                cons: (device.verdict_cons ?? []).map((c: string) => ({ point: c })),
                bottomLine: device.verdict_bottom_line ?? null,
                fullVerdict: device.verdict_full ?? null,
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Where to Buy</h2>
        <div className={`grid gap-6 ${devices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {devices.map((device: any) => (
            <BuyBox
              key={device.slug}
              buyLinks={device.buy_links}
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
              description: device.seo_description ?? device.tagline ?? '',
            }),
          }}
        />
      ))}
    </div>
  )
}