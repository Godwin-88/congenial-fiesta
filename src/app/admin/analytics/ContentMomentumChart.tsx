// Section momentum heatmap (section × time bucket) with a date hover card.
//
// Content Velocity in Content & SEO is the reference: hovering a time bucket
// shows "Wed, Sep 9, 2026" plus that bucket's per-section metrics. The grid
// stays a pure CSS layout; the hover card lives above it and is driven by the
// same hover/tap state on the column headers.

'use client'

import { useState } from 'react'
import { formatHoverDate } from './chartFormat'
import ChartHoverCard from './ChartHoverCard'

type SectionKey = 'devices' | 'articles' | 'videos' | 'compare' | 'search' | 'other'

type Props = {
  data: Array<{
    bucket: string
    devices: number
    articles: number
    videos: number
    compare: number
    search: number
    other: number
  }>
}

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'devices', label: 'Devices' },
  { key: 'articles', label: 'Articles' },
  { key: 'videos', label: 'Videos' },
  { key: 'compare', label: 'Compare' },
  { key: 'search', label: 'Search' },
  { key: 'other', label: 'Other' },
]

const SECTION_BASE: Record<SectionKey, string> = {
  devices: '#3B82F6',
  articles: '#F59E0B',
  videos: '#EF4444',
  compare: '#8B5CF6',
  search: '#10B981',
  other: '#94A3B8',
}

/** Opacity scaled on a log-ish curve so one spike doesn't wash out the lower cells. */
function cellOpacity(value: number, max: number): number {
  if (value <= 0) return 0.08
  if (max <= 0) return 0.25
  return 0.18 + Math.log2(value + 1) / Math.log2(max + 1) * 0.72
}

export default function ContentMomentumChart({ data }: Props) {
  if (!data.length || data.every((d) => SECTIONS.every((s) => d[s.key] === 0))) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No momentum data available</p>
  }

  const buckets = data.slice(-12) // cap wide periods to the latest 12 buckets
  const max = Math.max(...buckets.flatMap((d) => SECTIONS.map((s) => Number(d[s.key]) || 0)), 1)
  const [activeBucket, setActiveBucket] = useState<string | null>(null)
  const activeRow = activeBucket ? buckets.find((b) => b.bucket === activeBucket) ?? null : null
  const activeTotal = activeRow ? SECTIONS.reduce((s, sec) => s + Number(activeRow[sec.key] || 0), 0) : 0

  return (
    <div>
      {/* Pinned card lives OUTSIDE the scroll container — an overflow-x-auto
          parent clips it to the visible viewport (the truncation bug). */}
      {activeRow && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={formatHoverDate(activeRow.bucket)}
            subtitle={`${activeTotal.toLocaleString()} views`}
            rows={SECTIONS.map(({ key, label }) => {
              const value = Number(activeRow[key] || 0)
              return {
                color: SECTION_BASE[key],
                label,
                value: `${value.toLocaleString()} views · ${
                  activeTotal > 0 ? Math.round((value / activeTotal) * 10) / 10 : 0
                }%`,
              }
            })}
          />
        </div>
      )}
      <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `72px repeat(${buckets.length}, minmax(34px, 1fr))` }}
      >
        {/* header row */}
        <div />
        {buckets.map((b) => (
          <button
            key={b.bucket}
            type="button"
            onClick={() => setActiveBucket((prev) => (prev === b.bucket ? null : b.bucket))}
            onMouseEnter={() => setActiveBucket(b.bucket)}
            onMouseLeave={() => setActiveBucket(null)}
            onFocus={() => setActiveBucket(b.bucket)}
            aria-label={`${formatHoverDate(b.bucket)} — show per-section breakdown`}
            className={`cursor-pointer rounded text-center text-[10px] underline decoration-dotted underline-offset-2 ${
              activeBucket === b.bucket ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {b.bucket}
          </button>
        ))}
        {SECTIONS.map(({ key, label }) => (
          <div key={key} className="contents">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SECTION_BASE[key] }} />
              {label}
            </div>
            {buckets.map((b) => {
              const value = Number(b[key])
              return (
                <div
                  key={`${key}-${b.bucket}`}
                  title={`${label} · ${b.bucket}: ${value.toLocaleString()} views`}
                  className="rounded-sm"
                  style={{
                    backgroundColor: SECTION_BASE[key],
                    opacity: cellOpacity(value, max),
                  }}
                >
                  <div className="flex h-6 items-center justify-center text-[10px] text-foreground">
                    {value > 0 ? value.toLocaleString() : ''}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">X:</span> time bucket · <span className="font-medium text-foreground">Y:</span> content section · cell intensity = view volume
      </p>
    </div>
  )
}