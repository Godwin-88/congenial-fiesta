'use client'

import { useComparisonTray } from '@/context/ComparisonTrayContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'

export default function ComparisonTray() {
  const { devices, removeDevice, clearTray } = useComparisonTray()
  const pathname = usePathname()

  if (pathname === '/compare' || devices.length === 0) {
    return null
  }

  const compareUrl = `/compare?devices=${devices.map((d) => d.slug).sort().join(',')}`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-primary/30 bg-[#1a1a1a]/95 backdrop-blur-sm transition-transform duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {devices.map((device) => (
            <div
              key={device.slug}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1"
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
              <span className="max-w-[80px] truncate text-sm font-medium text-foreground">
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

         <div className="flex items-center gap-3">
           <button
             onClick={clearTray}
             className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
           >
             <Trash2 className="h-4 w-4" />
             Clear All
           </button>
           <Link
             href={compareUrl}
             className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50"
           >
             Compare Now
           </Link>
         </div>
       </div>
     </div>
   )
 }
