'use client'

import { Scale } from 'lucide-react'
import SaveComparisonButton from '@/components/compare/SaveComparisonButton'
import ShareComparisonButton from '@/components/compare/ShareComparisonButton'

interface MobileCompareBarProps {
  /** Slugs in comparison order, for the save action. */
  deviceSlugs: string[]
  /** Display names, joined for the summary label. */
  deviceNames: string[]
}

/**
 * Mobile-only sticky action bar for the compare page.
 *
 * The public layout renders `MobileBottomNav` fixed at `bottom-0` (z-40), so
 * this bar sits directly above it — including the iOS safe-area inset — which
 * keeps Compare actions thumb-reachable without scrolling or rotating.
 */
export default function MobileCompareBar({ deviceSlugs, deviceNames }: MobileCompareBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Scale className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
          <span className="truncate text-xs font-medium text-foreground">
            {deviceNames.join(' vs ')}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveComparisonButton deviceSlugs={deviceSlugs} />
          <ShareComparisonButton />
        </div>
      </div>
    </div>
  )
}