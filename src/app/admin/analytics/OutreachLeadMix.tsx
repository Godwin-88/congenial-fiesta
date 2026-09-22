// Lead temperature band — the self-serve audience as a demand thermometer.
//
// The Community tab bands the catalog by proof, the Search tab bands searches
// by answerability; this bands VISITORS by how close they are to a decision.
// Hot / warm / cold come from the same fp_id qualification model the Compare
// tab uses, so a hot lead here is the same number the consideration tab shows.
//
// The cooling marker is what makes it actionable: hot leads not seen in the
// last week of the window are drawn as a hatched slice of the hot band — the
// part of the thermometer that is losing heat right now.
//
// Hover/tap a band to pin its metrics card (the dashboard's single hover-card
// contract), rendered in-flow above the band so nothing truncates.

'use client'

import { useState } from 'react'
import { LEAD_TEMPERATURE_COLORS, LEAD_TEMPERATURE_LABELS, type LeadTemperature } from '@/lib/analytics/outreach'
import ChartHoverCard from './ChartHoverCard'

type Props = {
  hot: number
  warm: number
  cold: number
  cooling: number
  clickers: number
  signedIn: number
  medianScore: number
}

const ORDER: LeadTemperature[] = ['hot', 'warm', 'cold']

export default function OutreachLeadMix({ hot, warm, cold, cooling, clickers, signedIn, medianScore }: Props) {
  const [active, setActive] = useState<LeadTemperature | null>(null)
  const counts: Record<LeadTemperature, number> = { hot, warm, cold }
  const total = hot + warm + cold

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scored visitors in this window — the thermometer fills with the first save, compare, watch or click.
      </p>
    )
  }

  const share = (n: number) => Math.round((n / total) * 1000) / 10

  return (
    <div className="space-y-3">
      {active && (
        <div className="flex justify-start">
          <ChartHoverCard
            title={`${LEAD_TEMPERATURE_LABELS[active]} — ${counts[active].toLocaleString()} visitors (${share(counts[active])}%)`}
            subtitle={`median score ${medianScore} · ${clickers.toLocaleString()} clicked a buy link`}
            rows={[
              {
                color: LEAD_TEMPERATURE_COLORS[active],
                label: 'Visitors',
                value: counts[active].toLocaleString(),
              },
              { color: '#94A3B8', label: 'Share of scored', value: `${share(counts[active])}%` },
              ...(active === 'hot'
                ? [{ color: '#F97316', label: 'Gone quiet (7d+)', value: `${cooling.toLocaleString()}` }]
                : []),
            ]}
            footer={
              active === 'hot'
                ? 'Hot = 8+ intent points. There is no email for these visitors — recover them with surfaces, not a newsletter.'
                : active === 'warm'
                  ? 'Warm = 4–7 points: interested but not shortlisting. Feed them proof (ratings, comparisons) rather than a CTA.'
                  : 'Cold = under 4 points: browsing. Cheap to serve, not worth a manual follow-up.'
            }
          />
        </div>
      )}

      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
        {ORDER.map((tier) => {
          const count = counts[tier]
          if (count <= 0) return null
          const pct = share(count)
          const quietSlice = tier === 'hot' && cooling > 0 ? Math.min(100, (cooling / count) * 100) : 0
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActive((prev) => (prev === tier ? null : tier))}
              onMouseEnter={() => setActive(tier)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(tier)}
              aria-label={`${LEAD_TEMPERATURE_LABELS[tier]}: ${count} visitors, ${pct}% — activate to pin the breakdown`}
              className="relative flex cursor-pointer items-center justify-center text-[11px] font-semibold text-white/95 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-primary/60"
              style={{ width: `${Math.max(pct, 1.5)}%`, backgroundColor: LEAD_TEMPERATURE_COLORS[tier] }}
            >
              {pct >= 10 ? `${LEAD_TEMPERATURE_LABELS[tier]} ${count}` : ''}
              {quietSlice > 0 && (
                <span
                  className="absolute bottom-0 left-0 top-0 border-l border-white/40"
                  style={{
                    width: `${quietSlice}%`,
                    backgroundImage:
                      'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 3px, transparent 3px 6px)',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{total.toLocaleString()}</span> scored visitors
        </span>
        <span>
          median score <span className="font-medium text-foreground">{medianScore}</span>
        </span>
        <span>
          <span className="font-medium text-foreground">{clickers.toLocaleString()}</span> clicked a buy link
        </span>
        <span>
          <span className="font-medium text-foreground">{signedIn.toLocaleString()}</span> signed in
        </span>
        {cooling > 0 && (
          <span className="text-amber-400">
            {cooling.toLocaleString()} hot leads cooling off (hatched slice)
          </span>
        )}
      </div>
    </div>
  )
}
