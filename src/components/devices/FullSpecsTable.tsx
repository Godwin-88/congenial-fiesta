interface SpecRow {
  label: string
  value?: string | number | null
}

function Row({ label, value }: SpecRow) {
  if (value === undefined || value === null || value === '') return null
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="w-1/3 py-2 pr-4 align-top text-sm font-medium text-muted-foreground">{label}</td>
      <td className="py-2 text-sm text-foreground">{value}</td>
    </tr>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-muted/40">
        <td colSpan={2} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </td>
      </tr>
      {children}
    </>
  )
}

const v = (rec: Record<string, unknown> | undefined, key: string) =>
  rec?.[key] ? String(rec[key]) : undefined

export default function FullSpecsTable({
  specs,
}: {
  specs: {
    design?: Record<string, unknown>
    display?: Record<string, unknown>
    processor?: Record<string, unknown>
    memory?: Record<string, unknown>
    camera?: Record<string, unknown>
    battery?: Record<string, unknown>
    connectivity?: Record<string, unknown>
    network?: Record<string, unknown>
    software?: Record<string, unknown>
  }
}) {
  const hasAny = Object.values(specs).some((g) => g && Object.keys(g).length > 0)
  if (!hasAny) return null

  return (
    <div className="mt-12">
      <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Full Specifications</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full table-auto">
          <tbody className="divide-y divide-border">
            {specs.design && Object.keys(specs.design).length > 0 && (
              <Group title="Design & Build">
                <Row label="Dimensions" value={v(specs.design, 'Dimensions')} />
                <Row label="Weight" value={v(specs.design, 'Weight')} />
                <Row label="Front" value={v(specs.design, 'Front')} />
                <Row label="Back" value={v(specs.design, 'Back')} />
                <Row label="Colours" value={v(specs.design, 'Colours')} />
                <Row label="IP Rating" value={v(specs.design, 'IP Rating')} />
              </Group>
            )}

            {specs.display && Object.keys(specs.display).length > 0 && (
              <Group title="Display">
                <Row label="Size" value={v(specs.display, 'Size')} />
                <Row label="Type" value={v(specs.display, 'Type')} />
                <Row label="Resolution" value={v(specs.display, 'Resolution')} />
                <Row label="Refresh Rate" value={v(specs.display, 'Refresh Rate')} />
                <Row label="Pixel Density" value={v(specs.display, 'Pixel Density')} />
                <Row label="Peak Brightness" value={v(specs.display, 'Peak Brightness')} />
                <Row label="HDR" value={v(specs.display, 'HDR')} />
                <Row label="Protection" value={v(specs.display, 'Protection')} />
              </Group>
            )}

            {specs.processor && Object.keys(specs.processor).length > 0 && (
              <Group title="Processor">
                <Row label="Chipset" value={v(specs.processor, 'Chipset')} />
                <Row label="CPU" value={v(specs.processor, 'CPU')} />
                <Row label="GPU" value={v(specs.processor, 'GPU')} />
                <Row label="Node size" value={v(specs.processor, 'Node size')} />
                <Row label="NPU" value={v(specs.processor, 'NPU')} />
              </Group>
            )}

            {specs.memory && Object.keys(specs.memory).length > 0 && (
              <Group title="Memory">
                <Row label="RAM" value={v(specs.memory, 'RAM')} />
                <Row label="RAM type" value={v(specs.memory, 'RAM type')} />
                <Row label="Storage" value={v(specs.memory, 'Storage')} />
                <Row label="Expandable" value={v(specs.memory, 'Expandable')} />
              </Group>
            )}

            {specs.camera && Object.keys(specs.camera).length > 0 && (
              <Group title="Camera">
                {Array.isArray((specs.camera as any).rear) && (specs.camera as any).rear.length > 0 && (
                  (specs.camera as any).rear.map((cam: any, i: number) => (
                    <Row key={i} label={`Rear camera ${i + 1}`} value={cam?.sensorType ?? undefined} />
                  ))
                )}
                <Row label="Selfie camera" value={(specs.camera as any)?.selfie?.sensorType} />
                <Row label="Video (rear)" value={(specs.camera as any)?.video?.rear} />
                <Row label="Video (front)" value={(specs.camera as any)?.video?.front} />
                <Row label="Extras" value={(specs.camera as any)?.extras} />
              </Group>
            )}

            {specs.battery && Object.keys(specs.battery).length > 0 && (
              <Group title="Battery">
                <Row label="Capacity" value={v(specs.battery, 'Capacity')} />
                <Row label="Battery type" value={v(specs.battery, 'Battery type')} />
                <Row label="Wired charging" value={v(specs.battery, 'Wired charging')} />
                <Row label="Wireless charging" value={v(specs.battery, 'Wireless charging')} />
                <Row label="Reverse charging" value={v(specs.battery, 'Reverse charging')} />
              </Group>
            )}

            {specs.connectivity && Object.keys(specs.connectivity).length > 0 && (
              <Group title="Connectivity">
                <Row label="WiFi" value={v(specs.connectivity, 'WiFi')} />
                <Row label="Bluetooth" value={v(specs.connectivity, 'Bluetooth')} />
                <Row label="NFC" value={v(specs.connectivity, 'NFC')} />
                <Row label="USB" value={v(specs.connectivity, 'USB')} />
                <Row label="Positioning" value={v(specs.connectivity, 'Positioning')} />
                <Row label="IR Blaster" value={v(specs.connectivity, 'IR blaster')} />
              </Group>
            )}

            {specs.network && Object.keys(specs.network).length > 0 && (
              <Group title="Network">
                <Row label="SIM" value={v(specs.network, 'SIM')} />
                <Row label="Technology" value={v(specs.network, 'Technology')} />
                <Row label="2G bands" value={v(specs.network, '2G bands')} />
                <Row label="3G bands" value={v(specs.network, '3G bands')} />
                <Row label="4G bands" value={v(specs.network, '4G bands')} />
                <Row label="5G bands" value={v(specs.network, '5G bands')} />
              </Group>
            )}

            {specs.software && Object.keys(specs.software).length > 0 && (
              <Group title="Software">
                <Row label="OS" value={v(specs.software, 'OS')} />
                <Row label="UI Layer" value={v(specs.software, 'UI layer')} />
                <Row label="Major OS Upgrades" value={v(specs.software, 'Major OS upgrades')} />
                <Row label="Security Patches" value={v(specs.software, 'Security patches')} />
              </Group>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
