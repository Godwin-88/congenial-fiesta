// Campaign reach strip — did the tagged work actually deliver anyone?
//
// Every other traffic visual on the dashboard splits views by SOURCE (direct /
// search / social / referral). This one splits them by ATTRIBUTION STATE, which
// is the question a campaign owner actually has: of everything that arrived,
// how much can be tied to a campaign we ran?
//
// Three bands per day: campaign-tagged, referrer-without-a-tag, and direct. The
// middle band is the leak — traffic that came from somewhere identifiable and
// still cannot be named, because nobody put a utm parameter on the link.

'use client'

import { useState } from 'react'
import { ATTRIBUTION_COLORS, ATTRIBUTION_LABELS, type AttributionClass } from '@/lib/analytics/campaigns'
import { formatHoverDate } from './chartFormat'
import ChartHoverCard from './ChartHoverCard'

type TrendDay = { date: string; tagged: number; untagged: number; direct: number; total: number }
type ClassRow = { attribution: AttributionClass; label: string; views: number; visitors: number; sharePct: number }

type Props = {
  trend: TrendDay[]
  maxDaily: number
  byClass: ClassRow[]
  tagRatePct: number
}

const STACK_ORDER: AttributionClass[] = ['tagged', 'untagged', 'direct']


export default function CampaignReachChart({ trend, maxDaily, byClass, tagRatePct }: Props) {
  // Tap/click-pinned day: on touch screens there is no hover, so tapping a day
  // column pins the same metrics card that desktop users get on hover.
  const [pinnedDate, setPinnedDate] = useState<string | null>(null)
  // Hovered day for desktop: mirrors the tapped state so the hover card follows
  // the cursor across day columns instead of relying on the OS tooltip.
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  const totalViews = trend.reduce((s, d) => s + d.total, 0)
  if (totalViews === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No page views in this period — the reach split appears with the first recorded visit.
      </p>
    )
  }

  const peak = Math.max(1, maxDaily)
  const activeDate = hoveredDate ?? pinnedDate
  const activeDay = activeDate ? trend.find((d) => d.date === activeDate) ?? null : null
  const lastDay = trend[trend.length - 1]?.date ?? ''
  const midDay = trend[Math.floor(trend.length / 2)]?.date ?? ''
  const firstDay = trend[0]?.date ?? ''

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {STACK_ORDER.map((cls) => {
          const row = byClass.find((b) => b.attribution === cls)
          return (
            <span key={cls} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ATTRIBUTION_COLORS[cls] }} />
              <span className="text-foreground">{ATTRIBUTION_LABELS[cls]}</span>
              <span className="tabular-nums text-muted-foreground">
                {(row?.views ?? 0).toLocaleString()} · {row?.sharePct ?? 0}%
              </span>
            </span>
          )
        })}
      </div>

      {/* Pinned date card: in-flow ABOVE the strip (never absolute — the Card
          has overflow-hidden and an absolutely positioned card gets clipped),
          never inside an overflow-x-auto (clipped to the scroll viewport). */}
      {activeDay && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={formatHoverDate(activeDay.date)}
            subtitle={`${activeDay.total.toLocaleString()} views`}
            rows={STACK_ORDER.map((cls) => ({
              color: ATTRIBUTION_COLORS[cls],
              label: ATTRIBUTION_LABELS[cls],
              value: `${activeDay[cls].toLocaleString()} views · ${
                activeDay.total > 0 ? Math.round((activeDay[cls] / activeDay.total) * 10) / 10 : 0
              }%`,
            }))}
            footer={pinnedDate && !hoveredDate ? 'Pinned — tap the same day again to dismiss.' : undefined}
          />
        </div>
      )}

      {/* Day columns: stacked attribution bands, same scale across the row. */}
      <div onMouseLeave={() => setHoveredDate(null)}>
        <div className="flex h-32 items-end gap-[2px]">
          {trend.map((day) => (
            <button
              key={day.date}
              type="button"
              aria-label={`${formatHoverDate(day.date)} — ${day.total} views: ${day.tagged} tagged, ${day.untagged} referrer-only, ${day.direct} direct`}
              onMouseEnter={() => setHoveredDate(day.date)}
              onFocus={() => setHoveredDate(day.date)}
              onBlur={() => setHoveredDate(null)}
              onClick={() => setPinnedDate((prev) => (prev === day.date ? null : day.date))}
              className={`flex h-full flex-1 cursor-pointer flex-col justify-end rounded-sm outline-none transition ${
                activeDate === day.date ? 'bg-foreground/10' : 'hover:bg-foreground/5 focus-visible:bg-foreground/5'
              }`}
            >
              {STACK_ORDER.map((cls) => {
                const value = day[cls]
                if (value <= 0) return null
                return (
                  <div
                    key={cls}
                    style={{
                      height: `${Math.max(2, (value / peak) * 124)}px`,
                      backgroundColor: ATTRIBUTION_COLORS[cls],
                    }}
                  />
                )
              })}
              {day.total === 0 && <div className="h-[2px] w-full bg-foreground/10" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{firstDay}</span>
        <span className="hidden sm:inline">{midDay}</span>
        <span>{lastDay}</span>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Peak day: <span className="text-foreground">{peak.toLocaleString()} views</span>. Tagged share of all views:{' '}
        <span className={tagRatePct === 0 ? 'font-semibold text-rose-400' : 'font-semibold text-foreground'}>
          {tagRatePct}%
        </span>
        {tagRatePct === 0 ? (
          <>
            {' '}
            — nothing in this window carried utm parameters, so the strip is showing referrer classification only. Every
            acquisition number on this tab is contextual until the next placement ships tagged.
          </>
        ) : (
          <>
            {' '}
            — the untagged band is traffic the referrer could classify but the link never named.
          </>
        )}
      </p>
    </div>
  )
}
