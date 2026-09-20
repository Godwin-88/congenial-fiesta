// Answer coverage band — can the catalog answer what is asked?
//
// Sibling of the Community tab's TrustHealthBand, but the axis is different:
// trust bands ask "how many devices can prove themselves", this asks "how many
// SEARCHES get an answer at all". One horizontal band, three states, ordered
// answered → thin → zero so the red zero band closes the row — the eye lands on
// the size of the silence.
//
// The long-tail/head split underneath matters because search is a power law: a
// handful of terms are typed constantly, and coverage on those few is what the
// visitor experiences as "the search works".
//
// Hover/tap a band to pin the full metrics card for that answer state — the same
// hover-card idiom as the date hovers on Content Velocity and Campaign Reach.

'use client'

import { useState } from 'react'
import { ANSWER_STATE_COLORS, ANSWER_STATE_DESCRIPTIONS, type QueryAnswerState } from '@/lib/analytics/searchStory'
import ChartHoverCard from './ChartHoverCard'

type MixRow = {
  state: QueryAnswerState
  label: string
  queries: number
  searches: number
  sharePct: number
}

type Props = {
  mix: MixRow[]
  totalSearches: number
  recordedSearches: number
  unrecordedSearches: number
  headSharePct: number
}

export default function AnswerCoverageBand({
  mix,
  totalSearches,
  recordedSearches,
  unrecordedSearches,
  headSharePct,
}: Props) {
  if (totalSearches <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No searches in this period — answer coverage appears with the first logged query.
      </p>
    )
  }

  const visible = mix.filter((m) => m.searches > 0)
  const zero = mix.find((m) => m.state === 'zero')
  const answered = mix.find((m) => m.state === 'answered')
  const [activeState, setActiveState] = useState<QueryAnswerState | null>(null)
  const activeBand = activeState ? mix.find((m) => m.state === activeState) ?? null : null
  // Rates below are shares of the RECORDED band only (see the note), which is why
  // `recordedSearches` — not `totalSearches` — is the denominator.
  const pctOf = (searches: number) =>
    recordedSearches > 0 ? Math.round((searches / recordedSearches) * 1000) / 10 : 0

  return (
    <div>
      {activeBand && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={`${activeBand.label} — ${activeBand.searches.toLocaleString()} searches (${pctOf(activeBand.searches)}% of measured)`}
            subtitle={`${activeBand.queries.toLocaleString()} distinct queries`}
            rows={[
              {
                color: ANSWER_STATE_COLORS[activeBand.state],
                label: 'Searches',
                value: activeBand.searches.toLocaleString(),
              },
              {
                color: ANSWER_STATE_COLORS[activeBand.state],
                label: 'Share of measured',
                value: `${pctOf(activeBand.searches)}%`,
              },
            ]}
            footer={ANSWER_STATE_DESCRIPTIONS[activeBand.state]}
          />
        </div>
      )}
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
        {visible.map((band) => (
          <button
            key={band.state}
            type="button"
            onClick={() => setActiveState((prev) => (prev === band.state ? null : band.state))}
            onMouseEnter={() => setActiveState(band.state)}
            onMouseLeave={() => setActiveState(null)}
            onFocus={() => setActiveState(band.state)}
            aria-label={`${band.label}: ${band.searches} searches, ${band.sharePct}% — activate to pin the breakdown`}
            className="flex cursor-pointer items-center justify-center text-[11px] font-semibold text-white/95 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-primary/60"
            style={{
              width: `${Math.max(band.sharePct, 1.5)}%`,
              backgroundColor: ANSWER_STATE_COLORS[band.state],
            }}
          >
            {band.sharePct >= 8 ? `${band.label} ${band.sharePct}%` : ''}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer coverage</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {pctOf(answered?.searches ?? 0)}%
            <span className="ml-1 text-sm font-normal text-muted-foreground">of measured searches get depth</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {(answered?.searches ?? 0).toLocaleString()} answered · {(zero?.searches ?? 0).toLocaleString()} returned
            nothing ({pctOf(zero?.searches ?? 0)}%) across {recordedSearches.toLocaleString()} searches with a recorded
            result count.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Head vs long tail</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {headSharePct}%
            <span className="ml-1 text-sm font-normal text-muted-foreground">of demand sits in the top 20% of queries</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Fixing the head is what visitors feel as &ldquo;the search works&rdquo;; the long tail is SEO surface, not UX.
          </p>
        </div>
      </div>

      {unrecordedSearches > 0 && (
        <p className="mt-3 rounded-lg border border-border bg-foreground/5 p-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{unrecordedSearches.toLocaleString()} searches</span> were
          logged before result instrumentation, so their quality is unknown. They are shown as a grey band above and
          excluded from the rates — counting them as misses would overstate the gap by{' '}
          {pctOf(unrecordedSearches)} points.
        </p>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {mix.map((band) => (
          <li key={band.state} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: ANSWER_STATE_COLORS[band.state] }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {band.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {band.queries.toLocaleString()} queries · {band.sharePct}% of searches
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">{ANSWER_STATE_DESCRIPTIONS[band.state]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
