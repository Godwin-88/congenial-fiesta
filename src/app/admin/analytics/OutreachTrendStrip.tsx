// Outreach pipeline strip — arrivals per day with pinned hover card.
'use client'
import { useState } from 'react'
import type { OutreachInsights } from '@/lib/analytics/queries'
import { formatHoverDate } from './chartFormat'
import ChartHoverCard from './ChartHoverCard'

export default function OutreachTrendStrip({ trend, maxDaily }: { trend: OutreachInsights['pipeline']['trend']; maxDaily: number }) {
  const [pinned, setPinned] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const total = trend.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No inquiries arrived in this period.</p>
  const peak = Math.max(1, maxDaily)
  const activeDate = hovered ?? pinned
  const activeDay = activeDate ? trend.find((d) => d.date === activeDate) ?? null : null
  return (
    <div>
      {activeDay && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={formatHoverDate(activeDay.date)}
            subtitle={`${activeDay.count} inquiries`}
            rows={[{ color: '#3B82F6', label: 'Inquiries', value: String(activeDay.count) }]}
            footer={pinned && !hovered ? 'Pinned — tap the same day again to dismiss.' : undefined}
          />
        </div>
      )}
      <div onMouseLeave={() => setHovered(null)}>
        <div className="flex h-28 items-end gap-[2px]">
          {trend.map((day) => (
            <button
              key={day.date}
              type="button"
              aria-label={`${formatHoverDate(day.date)} — ${day.count} inquiries`}
              onMouseEnter={() => setHovered(day.date)}
              onFocus={() => setHovered(day.date)}
              onBlur={() => setHovered(null)}
              onClick={() => setPinned((p) => (p === day.date ? null : day.date))}
              className="flex h-full flex-1 cursor-pointer flex-col justify-end rounded-sm outline-none transition hover:bg-foreground/5"
            >
              {day.count > 0 ? (
                <div style={{ height: `${Math.max(3, (day.count / peak) * 104)}px` }} className="w-full rounded-t-sm bg-sky-500" />
              ) : (
                <div className="h-[2px] w-full bg-foreground/10" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
