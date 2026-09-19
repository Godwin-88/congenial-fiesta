'use client'

import { useComparisonTray } from '@/context/ComparisonTrayContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Trash2, Scale } from 'lucide-react'

interface ComparisonTrayProps {
  /** When rendered inside the signed-in app shell, the left 256px sidebar rail
   *  must not be covered — shift the tray right past it on lg+. */
  sidebarOffset?: boolean
}

export default function ComparisonTray({ sidebarOffset = false }: ComparisonTrayProps) {
  const { devices, removeDevice, clearTray } = useComparisonTray()
  const pathname = usePathname()

  // The compare page renders its own sticky mobile action bar, so the tray
  // would be a duplicate control there.
  if (pathname === '/compare' || devices.length === 0) {
    return null
  }

  const compareUrl = `/compare?devices=${devices.map((d) => d.slug).sort().join(',')}`

  return (
    <div
      className={[
        // Sits directly above the fixed MobileBottomNav (z-40, bottom-0) on
        // phones, and at the bottom of the viewport on desktop.
        'fixed bottom-14 left-0 right-0 z-50 border-t border-brand-primary/30 bg-[#1a1a1a]/95 backdrop-blur-sm transition-transform duration-300 lg:bottom-0',
        sidebarOffset ? 'lg:left-64' : 'lg:left-0',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        {/* Device chips scroll horizontally rather than squeezing the action out. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {devices.map((device) => (
            <div
              key={device.slug}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1 sm:px-2.5"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                {device.imageUrl && (
                  <img
                    src={device.imageUrl}
                    alt={device.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span className="max-w-[96px] truncate text-sm font-medium text-foreground sm:max-w-[140px]">
                {device.name}
              </span>
              <button
                onClick={() => removeDevice(device.slug)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${device.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions never shrink or wrap — Compare stays reachable on phones. */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={clearTray}
            className="flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground"
            aria-label="Clear all devices"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
          <Link
            href={compareUrl}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            Compare
            <span className="hidden sm:inline"> Now</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
