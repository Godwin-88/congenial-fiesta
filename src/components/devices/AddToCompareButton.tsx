'use client'

import { useComparisonTray, type TrayDevice } from '@/context/ComparisonTrayContext'

interface AddToCompareButtonProps {
  device: {
    slug: string
    brandSlug: string
    name: string
    imageUrl?: string
    score: number
  }
}

export default function AddToCompareButton({ device }: AddToCompareButtonProps) {
  const { addDevice, removeDevice, isInTray, devices } = useComparisonTray()
  const inTray = isInTray(device.slug)
  const atCapacity = !inTray && devices.length >= 3

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (inTray) {
      removeDevice(device.slug)
      return
    }

    const trayDevice: TrayDevice = {
      slug: device.slug,
      brandSlug: device.brandSlug,
      name: device.name,
      imageUrl: device.imageUrl ?? '',
      score: device.score,
    }
    addDevice(trayDevice)
  }

  if (inTray) {
    return (
      <button
        onClick={handleClick}
        className="mt-2 w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20"
      >
        ✓ Added
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={atCapacity}
      title={atCapacity ? 'Max 3 devices' : undefined}
      className="mt-2 w-full rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {atCapacity ? 'Max 3 devices' : 'Add to Compare'}
    </button>
  )
}
