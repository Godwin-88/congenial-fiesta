// Query repeat histogram — is search a habit or a fallback?
//
// Nobody else on the dashboard measures repetition. Here it is the whole point:
// a query typed once is exploration; a query typed six times is a question the
// site keeps failing to answer — or a term the audience genuinely uses instead
// of the official product name (which is a synonym, not an article).
//
// Columns are frequency buckets, height is search volume; hover/tap a column to
// pin that bucket's share of demand (the same date-style hover card the Content
// tab's charts use).

'use client'

import { useState } from 'react'
import ChartHoverCard from './ChartHoverCard'
import type { QueryAnswerState } from '@/lib/analytics/searchStory'

import { ANSWER_STATE_COLORS, ANSWER_STATE_LABELS } from '@/lib/analytics/searchStory'

type Bucket = {
  bucket: string
  label: string
  queries: number
  searches: number
  sharePct: number
}

type RepeatRow = {
  query: string
  searches: number
  state: QueryAnswerState
  avgResults: number
}

type Props = {
  buckets: Bucket[]
  topRepeats: RepeatRow[]
  oneOffQueries: number
  repeatSharePct: number
}

const BUCKET_COLORS = ['#10B981', '#84CC16', '#F59E0B', '#EF4444']

export default function QueryRepeatChart({ buckets, topRepeats, oneOffQueries, repeatSharePct }: Props) {
  const totalSearches = buckets.reduce((s, b) => s + b.searches, 0)
  const [activeBucket, setActiveBucket] = useState<string | null>(null)
  const active = activeBucket ? buckets.find((b) => b.bucket === activeBucket) ?? null : null

  if (totalSearches === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No searches in this period — repetition shows up once terms start to recur.
      </p>
    )
  }

  const maxQueries = Math.max(1, ...buckets.map((b) => b.queries))
  const unansweredRepeats = topRepeats.filter((r) => r.state !== 'answered').length

  return (
    <div>
      {active && (
        <div className="mb-3 flex justify-start">
          <ChartHoverCard
            title={`${active.label} repetition`}
            subtitle={`${active.queries.toLocaleString()} queries · ${active.searches.toLocaleString()} searches`}
            rows={[
              {
                color: BUCKET_COLORS[buckets.indexOf(active)] ?? '#94A3B8',
                label: 'Share of demand',
                value: `${active.sharePct}%`,
              },
              {
                color: '#94A3B8',
                label: 'Searches per query',
                value: active.queries > 0 ? `${Math.round((active.searches / active.queries) * 10) / 10}×` : '—',
              },
            ]}
          />
        </div>
      )}
      <div className="flex h-40 items-end gap-3">
        {buckets.map((bucket, i) => (
          <button
            key={bucket.bucket}
            type="button"
            onClick={() => setActiveBucket((prev) => (prev === bucket.bucket ? null : bucket.bucket))}
            onMouseEnter={() => setActiveBucket(bucket.bucket)}
            onMouseLeave={() => setActiveBucket(null)}
            onFocus={() => setActiveBucket(bucket.bucket)}
            aria-label={`${bucket.label}: ${bucket.queries} queries, ${bucket.searches} searches (${bucket.sharePct}%). Activate to pin the breakdown.`}
            className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-sm outline-none transition ${
              activeBucket === bucket.bucket ? 'bg-foreground/10' : 'hover:bg-foreground/5 focus-visible:bg-foreground/5'
            }`}
          >
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {bucket.queries > 0 ? bucket.queries : ''}
            </span>
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(4, (bucket.queries / maxQueries) * 116)}px`,
                backgroundColor: BUCKET_COLORS[i] ?? '#94A3B8',
              }}
            />
            <span className="text-[11px] font-medium text-foreground">{bucket.label}</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">{bucket.sharePct}%</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{oneOffQueries.toLocaleString()}</span> one-off queries
        </span>
        <span>
          <span className="font-medium text-foreground">{repeatSharePct}%</span> of searches are repeats
        </span>
        {unansweredRepeats > 0 && (
          <span className="text-amber-400">
            {unansweredRepeats} repeated terms the catalog still does not answer
          </span>
        )}
      </div>

      {topRepeats.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Most repeated terms
          </p>
          <div className="flex flex-wrap gap-2">
            {topRepeats.map((row) => (
              <a
                key={row.query}
                href={`/search?q=${encodeURIComponent(row.query)}`}
                title={`${row.searches} searches · ${row.avgResults} results on average`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-foreground/5"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: ANSWER_STATE_COLORS[row.state] }}
                />
                <span className="text-foreground">{row.query}</span>
                <span className="tabular-nums text-muted-foreground">×{row.searches}</span>
                <span className="text-[10px] text-muted-foreground">{ANSWER_STATE_LABELS[row.state]}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
