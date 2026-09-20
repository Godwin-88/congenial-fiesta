'use client'

// Intent momentum — action × time, in the devices-tab heatmap idiom.
//
// Same read as the Devices tab's demand-rhythm heatmap (a lit row-top means a
// warming action), but keyed by intent rather than price tier: it shows which
// behaviour is accelerating and which is flat-lining.
//
// Hover/tap a bucket header to pin that date's full breakdown: the same figures
// the charts on the other tabs show on date hover.

'use client'

import { useState } from 'react'
import { tint, formatHoverDate } from './chartFormat'
import ChartHoverCard from './ChartHoverCard'
import { INTENT_ACTION_COLORS, type IntentAction } from '@/lib/analytics/consideration'

type Props = {
  momentum: Array<{ bucket: string; save: number; add_to_compare: number; watch: number; related_click: number; total: number }>
  maxCell: number
}

const ACTIONS: Array<{ key: IntentAction; label: string }> = [
  { key: 'add_to_compare', label: 'Compare' },
  { key: 'save', label: 'Save' },
  { key: 'watch', label: 'Watch' },
  { key: 'related_click', label: 'Related' },
]

const BASE = '#8B5CF6'

function cellColor(value: number, maxCell: number): string {
  if (value <= 0) return 'transparent'
  const ratio = Math.min(1, value / Math.max(1, maxCell))
  return tint(BASE, '#FFFFFF', 0.78 - 0.68 * ratio)
}

export default function IntentMomentumChart({ momentum, maxCell }: Props) {
  const total = momentum.reduce((s, m) => s + m.total, 0)
  const [activeBucket, setActiveBucket] = useState<string | null>(null)
  const activeRow = activeBucket ? momentum.find((m) => m.bucket === activeBucket) ?? null : null

  if (momentum.length === 0 || total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No intent events in this period — momentum starts with the first save, compare or watch.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      {activeRow && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={formatHoverDate(activeRow.bucket)}
            subtitle={`${activeRow.total.toLocaleString()} intent events`}
            rows={ACTIONS.map(({ key, label }) => ({
              color: INTENT_ACTION_COLORS[key],
              label,
              value: `${(activeRow[key] ?? 0).toLocaleString()} events`,
            }))}
            footer="Pinned — tap the same header again to dismiss."
          />
        </div>
      )}
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card px-1 text-left font-medium text-muted-foreground">Action</th>
            {momentum.map((m) => (
              <th key={m.bucket} className="px-1 text-center font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setActiveBucket((prev) => (prev === m.bucket ? null : m.bucket))}
                  onMouseEnter={() => setActiveBucket(m.bucket)}
                  onMouseLeave={() => setActiveBucket(null)}
                  onFocus={() => setActiveBucket(m.bucket)}
                  aria-label={`${formatHoverDate(m.bucket)} — show per-action breakdown`}
                  className={`cursor-pointer rounded underline decoration-dotted underline-offset-2 ${
                    activeBucket === m.bucket ? 'text-foreground' : 'hover:text-foreground'
                  }`}
                >
                  {m.bucket}
                </button>
              </th>
            ))}
            <th className="px-1 text-right font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map(({ key, label }) => {
            const rowTotal = momentum.reduce((s, m) => s + (m[key] ?? 0), 0)
            return (
              <tr key={key}>
                <td className="sticky left-0 whitespace-nowrap bg-card px-1">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: INTENT_ACTION_COLORS[key] }} />
                  <span className="text-muted-foreground">{label}</span>
                </td>
                {momentum.map((m) => {
                  const value = m[key] ?? 0
                  return (
                    <td key={`${key}-${m.bucket}`} className="p-0">
                      <div
                        title={`${label} · ${m.bucket}: ${value.toLocaleString()} events`}
                        className="flex h-7 min-w-9 items-center justify-center rounded-sm tabular-nums"
                        style={{
                          backgroundColor: cellColor(value, maxCell),
                          color: value > maxCell * 0.5 ? '#FFFFFF' : 'var(--foreground)',
                          border: value > 0 ? '1px solid transparent' : '1px dashed var(--border)',
                        }}
                      >
                        {value > 0 ? value : ''}
                      </div>
                    </td>
                  )
                })}
                <td className="px-1 text-right font-semibold text-foreground tabular-nums">{rowTotal.toLocaleString()}</td>
              </tr>
            )
          })}
          <tr>
            <td className="sticky left-0 bg-card px-1 font-medium text-muted-foreground">Total</td>
            {momentum.map((m) => (
              <td key={`total-${m.bucket}`} className="px-1 text-center font-semibold text-foreground tabular-nums">
                {m.total.toLocaleString()}
              </td>
            ))}
            <td className="px-1 text-right font-semibold text-foreground tabular-nums">{total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Darker</span> = more events · read a row left-to-right for an
        action&apos;s trend. A compare row that only lights up on one date is a single viral page, not a habit.
      </p>
    </div>
  )
}
