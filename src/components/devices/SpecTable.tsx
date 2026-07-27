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

export function SpecTable({ device }: SpecTableProps) {
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
          {/* Design */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Design & Build
            </td>
          </tr>
          <Row label="Dimensions" value={device.specsDesign?.dimensions} />
          <Row label="Weight" value={device.specsDesign?.weight} />
          <Row label="Build" value={device.specsDesign?.build} />
          <Row label="Colours" value={device.specsDesign?.colours} />
          <Row label="Water Resistance" value={device.specsDesign?.waterResistance} />

          {/* Display */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Display
            </td>
          </tr>
          <Row label="Size" value={device.specsDisplay?.size} />
          <Row label="Type" value={device.specsDisplay?.type} />
          <Row label="Resolution" value={device.specsDisplay?.resolution} />
          <Row label="Refresh Rate" value={device.specsDisplay?.refreshRate} />
          <Row label="Brightness" value={device.specsDisplay?.brightness} />
          <Row label="Protection" value={device.specsDisplay?.protection} />

          {/* Performance */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Performance
            </td>
          </tr>
          <Row label="Chipset" value={device.specsProcessor?.chipset} />
          <Row label="CPU" value={device.specsProcessor?.cpu} />
          <Row label="GPU" value={device.specsProcessor?.gpu} />
          <Row label="Process" value={device.specsProcessor?.process} />
          <Row label="RAM" value={device.specsMemory?.ram} />
          <Row label="Storage" value={device.specsMemory?.storage} />
          <Row label="Expandable" value={device.specsMemory?.expandable ? 'Yes' : 'No'} />

          {/* Camera */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Camera
            </td>
          </tr>
          <Row label="Main Camera" value={device.specsCamera?.mainCamera} />
          <Row label="Ultrawide" value={device.specsCamera?.ultrawide} />
          <Row label="Telephoto" value={device.specsCamera?.telephoto} />
          <Row label="Video Recording" value={device.specsCamera?.videoMain} />
          <Row label="Front Camera" value={device.specsCamera?.frontCamera} />
          <Row label="Front Video" value={device.specsCamera?.videoFront} />

          {/* Battery */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Battery
            </td>
          </tr>
          <Row label="Capacity" value={device.specsBattery?.capacity} />
          <Row label="Wired Charging" value={device.specsBattery?.wiredCharging} />
          <Row label="Wireless Charging" value={device.specsBattery?.wirelessCharging} />
          <Row label="Reverse Charging" value={device.specsBattery?.reverseCharging} />

          {/* Connectivity */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Connectivity
            </td>
          </tr>
          <Row label="Network" value={device.specsConnectivity?.network} />
          <Row label="WiFi" value={device.specsConnectivity?.wifi} />
          <Row label="Bluetooth" value={device.specsConnectivity?.bluetooth} />
          <Row label="NFC" value={device.specsConnectivity?.nfc ? 'Yes' : 'No'} />
          <Row label="USB" value={device.specsConnectivity?.usb} />
          <Row label="Satellite" value={device.specsConnectivity?.satellite} />

          {/* Software */}
          <tr className="bg-muted/20">
            <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Software
            </td>
          </tr>
          <Row label="OS" value={device.specsSoftware?.os} />
          <Row label="UI" value={device.specsSoftware?.ui} />
          <Row label="Update Policy" value={device.specsSoftware?.updatePolicy} />
        </tbody>
      </table>
    </div>
  )
}