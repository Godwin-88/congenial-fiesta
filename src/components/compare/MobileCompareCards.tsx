import { readRearCameras, readSelfieCameras } from '@/lib/devices/camera-types'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import { BuyBox } from '@/components/devices/BuyBox'
import { VerdictBlock } from '@/components/devices/VerdictBlock'

// The compare page works off the legacy flat device shape (`specs_display`,
// `scores_overall`, …) so the device type here mirrors that convention.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompareDevice = any

interface MobileCompareCardsProps {
  devices: CompareDevice[]
}

/** A labelled spec row that hides itself when the device has no value. */
function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

function SpecGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border px-4 py-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  )
}

/**
 * Mobile comparison: one self-contained card per device, stacked vertically.
 *
 * Side-by-side spec columns need horizontal panning on a portrait phone, so
 * below `md` we render each device as its own scroll-free card instead. The
 * desktop grid layout in the compare page is untouched.
 */
export default function MobileCompareCards({ devices }: MobileCompareCardsProps) {
  return (
    <div className="space-y-6 md:hidden">
      {devices.map((device: CompareDevice) => {
        const images = device.images as Array<Record<string, unknown>> | undefined
        const primaryImage = images?.find((img: CompareDevice) => img.isPrimary) ?? images?.[0]
        const brandData = device.brand as Record<string, unknown> | undefined
        const rear = readRearCameras(device.specs_camera)
        const selfie = readSelfieCameras(device.specs_camera)
        const mainCamera = rear[0]?.value

        return (
          <article
            key={device.slug}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Identity + score */}
            <div className="flex items-center gap-4 p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {primaryImage ? (
                  <img
                    src={String(primaryImage.url)}
                    alt={String(primaryImage.alt ?? device.name)}
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{(brandData?.name as string) ?? ''}</p>
                <p className="truncate font-heading text-base font-bold text-foreground">
                  {device.name}
                </p>
                <div className="mt-2">
                  <ScoreBadge score={device.scores_overall ?? 0} size="sm" />
                </div>
              </div>
            </div>

            {/* At a glance */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border bg-muted/30 px-4 py-3">
              {[
                { label: 'Display', value: device.specs_display?.['Size'] },
                { label: 'Chipset', value: device.specs_processor?.['Chipset'] },
                { label: 'Main camera', value: mainCamera },
                { label: 'Battery', value: device.specs_battery?.['Capacity'] },
                { label: 'RAM', value: device.specs_memory?.['RAM'] },
                { label: 'IP Rating', value: device.specs_design?.['IP Rating'] },
              ]
                .filter((s) => s.value)
                .map((s) => (
                  <div key={s.label} className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="truncate text-xs font-semibold text-foreground">{String(s.value)}</p>
                  </div>
                ))}
            </div>

            {/* Specs */}
            <SpecGroup title="Display">
              <SpecRow label="Size" value={device.specs_display?.['Size']} />
              <SpecRow label="Type" value={device.specs_display?.['Type']} />
              <SpecRow label="Resolution" value={device.specs_display?.['Resolution']} />
              <SpecRow label="Refresh rate" value={device.specs_display?.['Refresh Rate']} />
              <SpecRow label="Peak brightness" value={device.specs_display?.['Peak Brightness']} />
              <SpecRow label="HDR" value={device.specs_display?.['HDR']} />
              <SpecRow label="Cover display" value={device.specs_display?.['Cover Display']} />
              <SpecRow
                label="Cover display size"
                value={device.specs_display?.['Cover Display Size']}
              />
              <SpecRow
                label="Cover display refresh"
                value={device.specs_display?.['Cover Display Refresh Rate']}
              />
              <SpecRow
                label="Cover display protection"
                value={device.specs_display?.['Cover Display Protection']}
              />
            </SpecGroup>

            <SpecGroup title="Performance">
              <SpecRow label="Chipset" value={device.specs_processor?.['Chipset']} />
              <SpecRow label="CPU" value={device.specs_processor?.['CPU']} />
              <SpecRow label="GPU" value={device.specs_processor?.['GPU']} />
              <SpecRow label="RAM" value={device.specs_memory?.['RAM']} />
              <SpecRow label="Storage" value={device.specs_memory?.['Storage']} />
            </SpecGroup>

            <SpecGroup title="Cameras">
              {rear.map((cam, i) => (
                <SpecRow key={`${cam.slot}-${i}`} label={cam.label} value={cam.value} />
              ))}
              {selfie.map((cam, i) => (
                <SpecRow key={`${cam.slot}-selfie-${i}`} label={cam.label} value={cam.value} />
              ))}
              <SpecRow label="Rear video" value={device.specs_camera?.video?.rear} />
              <SpecRow label="Front video" value={device.specs_camera?.video?.front} />
            </SpecGroup>

            <SpecGroup title="Battery">
              <SpecRow label="Capacity" value={device.specs_battery?.['Capacity']} />
              <SpecRow label="Wired charging" value={device.specs_battery?.['Wired charging']} />
              <SpecRow
                label="Wireless charging"
                value={device.specs_battery?.['Wireless charging']}
              />
            </SpecGroup>

            <SpecGroup title="Connectivity & software">
              <SpecRow label="WiFi" value={device.specs_connectivity?.['WiFi']} />
              <SpecRow label="Bluetooth" value={device.specs_connectivity?.['Bluetooth']} />
              <SpecRow label="NFC" value={device.specs_connectivity?.['NFC']} />
              <SpecRow label="OS" value={device.specs_software?.['OS']} />
            </SpecGroup>

            {/* Verdict */}
            {(device.verdict_pros?.length ||
              device.verdict_cons?.length ||
              device.verdict_bottom_line) && (
              <div className="border-t border-border p-4">
                <VerdictBlock
                  verdict={{
                    pros: (device.verdict_pros ?? []).map((p: string) => ({ point: p })),
                    cons: (device.verdict_cons ?? []).map((c: string) => ({ point: c })),
                    bottomLine: device.verdict_bottom_line ?? null,
                    fullVerdict: device.verdict_full ?? null,
                  }}
                />
              </div>
            )}

            {/* Buy */}
            {device.buy_links?.length > 0 && (
              <div className="border-t border-border p-4">
                <BuyBox
                  buyLinks={device.buy_links}
                  deviceName={device.name}
                  deviceSlug={device.slug}
                />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
