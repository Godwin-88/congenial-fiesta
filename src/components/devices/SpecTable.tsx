// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Device = any

interface SpecTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  device: any
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="w-1/3 py-2 pr-4 text-sm font-medium text-muted-foreground">
        {label}
      </td>
      <td className="py-2 text-sm text-foreground">{value}</td>
    </tr>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <tr className="bg-muted/40">
      <td colSpan={2} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <tr className="bg-muted/20">
      <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

// Which spec sections are relevant per major category.
const SECTION_MAJOR: Record<string, string[]> = {
  design: ['phones', 'televisions', 'sound', 'macs'],
  display: ['phones', 'televisions', 'macs'],
  processor: ['phones', 'televisions', 'macs'],
  memory: ['phones', 'televisions', 'macs'],
  camera: ['phones'],
  battery: ['phones', 'sound', 'macs'],
  connectivity: ['phones', 'televisions', 'sound', 'macs'],
  network: ['phones'],
  software: ['phones', 'televisions', 'sound', 'macs'],
}

export function SpecTable({ device }: SpecTableProps) {
  const major: string | undefined = device.major_category
  const visible = (key: string) => !major || (SECTION_MAJOR[key] ?? []).includes(major)

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th
              colSpan={2}
              className="px-4 py-3 text-left font-heading text-sm font-semibold text-foreground"
            >
              {device.name} — Specifications
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visible('design') && (
            <>
              <Header>Design &amp; Build</Header>
              <Row label="Dimensions" value={device.specsDesign?.['Dimensions']} />
              <Row label="Weight" value={device.specsDesign?.['Weight']} />
              <Row label="Front" value={device.specsDesign?.['Front']} />
              <Row label="Back" value={device.specsDesign?.['Back']} />
              <Row label="Side" value={device.specsDesign?.['Side']} />
              <Row label="Ports" value={device.specsDesign?.['Ports']} />
              <Row label="Speakers" value={device.specsDesign?.['Speakers']} />
              <Row label="Colours" value={device.specsDesign?.['Colours']} />
              <Row label="IP Rating" value={device.specsDesign?.['IP Rating']} />
            </>
          )}

          {visible('display') && (
            <>
              <Header>Display</Header>
              <Row label="Size" value={device.specsDisplay?.['Size']} />
              <Row label="Type" value={device.specsDisplay?.['Type']} />
              <Row label="Resolution" value={device.specsDisplay?.['Resolution']} />
              <Row label="Refresh Rate" value={device.specsDisplay?.['Refresh Rate']} />
              <Row label="Pixel Density" value={device.specsDisplay?.['Pixel Density']} />
              <Row label="Screen-to-body ratio" value={device.specsDisplay?.['Screen-to-body ratio']} />
              <Row label="Peak Brightness" value={device.specsDisplay?.['Peak Brightness']} />
              <Row label="HDR" value={device.specsDisplay?.['HDR']} />
              <Row label="Color depth" value={device.specsDisplay?.['Color depth']} />
              <Row label="Protection" value={device.specsDisplay?.['Protection']} />
            </>
          )}

          {visible('processor') && (
            <>
              <Header>Performance</Header>
              <Row label="Chipset" value={device.specsProcessor?.['Chipset']} />
              <Row label="CPU" value={device.specsProcessor?.['CPU']} />
              <Row label="GPU" value={device.specsProcessor?.['GPU']} />
              <Row label="Node size" value={device.specsProcessor?.['Node size']} />
              <Row label="NPU" value={device.specsProcessor?.['NPU']} />
            </>
          )}

          {visible('memory') && (
            <>
              <Header>Memory</Header>
              <Row label="RAM" value={device.specsMemory?.['RAM']} />
              <Row label="RAM type" value={device.specsMemory?.['RAM type']} />
              <Row label="Storage" value={device.specsMemory?.['Storage']} />
              <Row label="Storage type" value={device.specsMemory?.['Storage type']} />
              <Row label="Expandable" value={device.specsMemory?.['Expandable']} />
            </>
          )}

          {visible('camera') && (
            <>
              <Header>Camera</Header>
              <SubHeading>Rear Cameras</SubHeading>
              {(device.specsCamera?.rear ?? []).map((cam: any, i: number, arr: any[]) => {
                const ofType = arr.filter((c) => c.type === cam.type).length
                const order = arr.filter((c, j) => c.type === cam.type && j <= i).length
                const label = ofType > 1 ? `${cam.type} ${order}` : cam.type
                return <Row key={i} label={label} value={cam.sensorType} />
              })}
              <SubHeading>Selfie Camera</SubHeading>
              <Row label="Sensor Type" value={device.specsCamera?.selfie?.sensorType} />
              <SubHeading>Video Recording</SubHeading>
              <Row label="Rear Video" value={device.specsCamera?.video?.rear} />
              <Row label="Front Video" value={device.specsCamera?.video?.front} />
              <Row label="Features" value={device.specsCamera?.video?.features} />
              <SubHeading>Extras</SubHeading>
              <Row label="Extras" value={device.specsCamera?.extras} />
            </>
          )}

          {visible('battery') && (
            <>
              <Header>Battery</Header>
              <Row label="Capacity" value={device.specsBattery?.['Capacity']} />
              <Row label="Battery type" value={device.specsBattery?.['Battery type']} />
              <Row label="Wired Charging" value={device.specsBattery?.['Wired charging']} />
              <Row label="Wireless Charging" value={device.specsBattery?.['Wireless charging']} />
              <Row label="Reverse Charging" value={device.specsBattery?.['Reverse charging']} />
              <Row label="Charging Protocols" value={device.specsBattery?.['Charging protocols']} />
            </>
          )}

          {visible('connectivity') && (
            <>
              <Header>Connectivity</Header>
              <Row label="WiFi" value={device.specsConnectivity?.['WiFi']} />
              <Row label="Bluetooth" value={device.specsConnectivity?.['Bluetooth']} />
              <Row label="NFC" value={device.specsConnectivity?.['NFC']} />
              <Row label="USB" value={device.specsConnectivity?.['USB']} />
              <Row label="Positioning" value={device.specsConnectivity?.['Positioning']} />
              <Row label="IR Blaster" value={device.specsConnectivity?.['IR blaster']} />
            </>
          )}

          {visible('network') && (
            <>
              <Header>Network</Header>
              <Row label="SIM" value={device.specsNetwork?.['SIM']} />
              <Row label="Technology" value={device.specsNetwork?.['Technology']} />
              <Row label="2G bands" value={device.specsNetwork?.['2G bands']} />
              <Row label="3G bands" value={device.specsNetwork?.['3G bands']} />
              <Row label="4G bands" value={device.specsNetwork?.['4G bands']} />
              <Row label="5G bands" value={device.specsNetwork?.['5G bands']} />
            </>
          )}

          {visible('software') && (
            <>
              <Header>Software</Header>
              <Row label="OS" value={device.specsSoftware?.['OS']} />
              <Row label="UI Layer" value={device.specsSoftware?.['UI layer']} />
              <Row label="Major OS Upgrades" value={device.specsSoftware?.['Major OS upgrades']} />
              <Row label="Security Patches" value={device.specsSoftware?.['Security patches']} />
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
