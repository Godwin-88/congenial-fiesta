'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useComparisonTray, type SavedComparison } from '@/context/ComparisonTrayContext'
import { useAuth } from '@/context/AuthContext'

export default function SavedComparisonsList() {
  const { user } = useAuth()
  const { savedComparisons, fetchSavedComparisons, deleteSavedComparison, addDevice, clearTray } = useComparisonTray()

  useEffect(() => {
    if (user) {
      fetchSavedComparisons()
    }
  }, [user, fetchSavedComparisons])

  if (!user) return null

  if (savedComparisons.length === 0) {
    return (
      <div className="mt-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto text-muted-foreground/40"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        </svg>
        <p className="mt-4 text-foreground/40">No saved comparisons yet.</p>
        <p className="mt-1 text-sm text-foreground/30">
          Compare devices and save them to access later.
        </p>
        <Link
          href="/devices"
          className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 transition-colors"
        >
          Browse Devices
        </Link>
      </div>
    )
  }

  const handleRestore = (comparison: SavedComparison) => {
    clearTray()
    comparison.devices.forEach((d) => {
      addDevice({
        slug: d.slug,
        brandSlug: '',
        name: d.name,
        imageUrl: d.imageUrl ?? '',
        score: d.score ?? 0,
      })
    })
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {savedComparisons.map((comparison) => (
        <div
          key={comparison.id}
          className="group relative rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-heading font-semibold text-foreground truncate pr-8">
            {comparison.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {comparison.devices.length} devices &middot;{' '}
            {new Date(comparison.updated_at).toLocaleDateString()}
          </p>

          {/* Device thumbnails */}
          <div className="mt-4 flex items-center gap-2">
            {comparison.devices.map((device, idx) => (
              <div key={device.slug} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">vs</span>
                )}
                <div className="flex flex-col items-center">
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-muted">
                    {device.imageUrl ? (
                      <img
                        src={device.imageUrl}
                        alt={device.name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        ?
                      </div>
                    )}
                  </div>
                  <span className="mt-1 max-w-[80px] truncate text-[10px] text-muted-foreground">
                    {device.name}
                  </span>
                  {device.score !== null && (
                    <span className="text-[10px] font-bold text-brand-primary">
                      {device.score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/compare?devices=${comparison.device_slugs.sort().join(',')}`}
              className="flex-1 rounded-lg bg-brand-primary px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-brand-primary/80 transition-colors"
            >
              Compare Now
            </Link>
            <button
              onClick={() => handleRestore(comparison)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Load into comparison tray"
            >
              Load
            </button>
            <button
              onClick={() => deleteSavedComparison(comparison.id)}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Delete comparison"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}