import type { Device } from '@/payload-types'

interface SpecTableProps {
  device: Device
}

interface SpecSection {
  label: string
  specs: { label: string; value: string | number | boolean | null | undefined }[]
}

function SpecRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-4 text-sm text-muted-foreground">{label}</td>
      <td className="py-2 text-sm font-medium text-foreground">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
      </td>
    </tr>
  )
}

function SpecSection({ section }: { section: SpecSection }) {
  const rows = section.specs.filter(
    (s) => s.value !== null && s.value !== undefined && s.value !== '',
  )
  if (rows.length === 0) return null

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-heading text-base font-semibold text-foreground hover:bg-muted/50">
        {section.label}
        <span className="text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-4 pb-3">
        <table className="w-full">
          <tbody>
            {rows.map((spec) => (
              <SpecRow key={spec.label} label={spec.label} value={spec.value} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function SpecTable({ device }: SpecTableProps) {
  const sections: SpecSection[] = [
    {
      label: 'Design',
      specs: [
        { label: 'Dimensions', value: device.specsDesign?.dimensions },
        { label: 'Weight', value: device.specsDesign?.weight },
        { label: 'Build', value: device.specsDesign?.build },
        { label: 'Colours', value: device.specsDesign?.colours },
        { label: 'Water Resistance', value: device.specsDesign?.waterResistance },
      ],
    },
    {
      label: 'Display',
      specs: [
        { label: 'Size', value: device.specsDisplay?.size },
        { label: 'Type', value: device.specsDisplay?.type },
        { label: 'Resolution', value: device.specsDisplay?.resolution },
        { label: 'Refresh Rate', value: device.specsDisplay?.refreshRate },
        { label: 'Brightness', value: device.specsDisplay?.brightness },
        { label: 'Protection', value: device.specsDisplay?.protection },
      ],
    },
    {
      label: 'Processor',
      specs: [
        { label: 'Chipset', value: device.specsProcessor?.chipset },
        { label: 'CPU', value: device.specsProcessor?.cpu },
        { label: 'GPU', value: device.specsProcessor?.gpu },
        { label: 'Process', value: device.specsProcessor?.process },
      ],
    },
    {
      label: 'Memory',
      specs: [
        { label: 'RAM', value: device.specsMemory?.ram },
        { label: 'Storage', value: device.specsMemory?.storage },
        { label: 'Expandable', value: device.specsMemory?.expandable },
      ],
    },
    {
      label: 'Camera',
      specs: [
        { label: 'Main Camera', value: device.specsCamera?.mainCamera },
        { label: 'Ultrawide', value: device.specsCamera?.ultrawide },
        { label: 'Telephoto', value: device.specsCamera?.telephoto },
        { label: 'Video (Main)', value: device.specsCamera?.videoMain },
        { label: 'Front Camera', value: device.specsCamera?.frontCamera },
        { label: 'Video (Front)', value: device.specsCamera?.videoFront },
      ],
    },
    {
      label: 'Battery',
      specs: [
        { label: 'Capacity', value: device.specsBattery?.capacity },
        { label: 'Wired Charging', value: device.specsBattery?.wiredCharging },
        { label: 'Wireless Charging', value: device.specsBattery?.wirelessCharging },
        { label: 'Reverse Charging', value: device.specsBattery?.reverseCharging },
      ],
    },
    {
      label: 'Connectivity',
      specs: [
        { label: 'Network', value: device.specsConnectivity?.network },
        { label: 'Wi-Fi', value: device.specsConnectivity?.wifi },
        { label: 'Bluetooth', value: device.specsConnectivity?.bluetooth },
        { label: 'NFC', value: device.specsConnectivity?.nfc },
        { label: 'USB', value: device.specsConnectivity?.usb },
        { label: 'Satellite', value: device.specsConnectivity?.satellite },
      ],
    },
    {
      label: 'Software',
      specs: [
        { label: 'OS', value: device.specsSoftware?.os },
        { label: 'UI', value: device.specsSoftware?.ui },
        { label: 'Update Policy', value: device.specsSoftware?.updatePolicy },
      ],
    },
  ]

  const visibleSections = sections.filter((s) =>
    s.specs.some((spec) => spec.value !== null && spec.value !== undefined && spec.value !== ''),
  )
  if (visibleSections.length === 0) return null

  return (
    <div className="space-y-3">
      {visibleSections.map((section) => (
        <SpecSection key={section.label} section={section} />
      ))}
    </div>
  )
}