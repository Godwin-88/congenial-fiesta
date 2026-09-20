// Search index health — the observability panel that answers
// "is search actually working?".
//
// This tab reports on search, so it must also report on the machinery behind
// search: which engines are live for this runtime, and whether the published
// catalog is actually inside the Upstash index (the Postgres full-text layer is
// always live because it queries the catalog directly).
//
// It exists because "search isn't working" is rarely a ranking problem — it is
// usually a coverage problem: pages present in the DB, absent from the index.

type Telemetry = {
  configured: boolean
  ok: boolean
  error: string | null
  indexName: string | null
  indexId: string | null
  upstashPeriod: string
  documentCount: number | null
  pendingDocumentCount: number | null
  dailyQueryCount: number | null
  monthlyQueryCount: number | null
  periodQueryCount: number | null
  captureRatePct: number | null
  latencyMeanMs: number | null
  latencyP99Ms: number | null
  queryThroughput: Array<{ ts: string; value: number }>
  fetchedAt: string
}

type Props = {
  layers: { postgres: boolean; upstash: boolean; semantic: boolean; upstashAnalytics: boolean }
  indexed: { devices: number; articles: number; videos: number; total: number; readable: boolean }
  published: { devices: number; articles: number; videos: number }
  coveragePct: number
  missingFromIndex: string[]
  searchPageViews: number
  searches: number
  recordedSearches: number
  unrecordedSearches: number
  telemetry: Telemetry
}

const LAYER_META: Array<{ key: keyof Props['layers']; label: string; note: string }> = [
  {
    key: 'postgres',
    label: 'Catalog full-text',
    note: 'Postgres search_vector on devices + article/video title match — always available because it reads the catalog itself.',
  },
  {
    key: 'upstash',
    label: 'BM25 index',
    note: 'Upstash Search: exact-match priority and typo tolerance. Absent → only the catalog layer answers.',
  },
  {
    key: 'semantic',
    label: 'Semantic index',
    note: 'Upstash Vector: spec-phrase intent ("phone with the best camera"). Absent → only literal matches answer.',
  },
  {
    key: 'upstashAnalytics',
    label: 'Upstash telemetry feed',
    note: 'Account Developer API: query volume, latency percentiles and document count per index. Absent → add UPSTASH_EMAIL + UPSTASH_API_KEY; what was searched always comes from the first-party log either way.',
  },
]

export default function SearchIndexHealth({
  layers,
  indexed,
  published,
  coveragePct,
  missingFromIndex,
  searchPageViews,
  searches,
  recordedSearches,
  unrecordedSearches,
  telemetry,
}: Props) {
  const coverageTone = coveragePct >= 95 ? 'text-emerald-400' : coveragePct >= 70 ? 'text-amber-400' : 'text-rose-400'
  const captureRate = searchPageViews > 0 ? Math.round((searches / searchPageViews) * 1000) / 10 : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Index coverage</p>
          <p className={`mt-1 text-2xl font-bold ${coverageTone}`}>
            {indexed.readable ? `${coveragePct}%` : '—'}
            <span className="ml-1 text-sm font-normal text-muted-foreground">of published pages indexed</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {indexed.readable ? (
              <>
                Index holds <span className="font-medium text-foreground">{indexed.devices}</span> devices ·{' '}
                <span className="font-medium text-foreground">{indexed.articles}</span> articles ·{' '}
                <span className="font-medium text-foreground">{indexed.videos}</span> videos. Catalog publishes{' '}
                {published.devices} devices and {published.articles} articles.
              </>
            ) : (
              'The index could not be read from this runtime — the catalog full-text layer is still serving search.'
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Query capture</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {searches.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted-foreground">terms logged</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {searchPageViews.toLocaleString()} search-page loads in the period{captureRate > 0 && <> · {captureRate}% converted into a logged term</>}. Preview keystrokes are deliberately NOT logged, so this stays a count of real searches.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{recordedSearches.toLocaleString()}</span> carry a recorded
            result count{unrecordedSearches > 0 && <> · <span className="font-medium text-foreground">{unrecordedSearches.toLocaleString()}</span> predate the instrumentation and are excluded from the rates</>}.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upstash telemetry — capture &amp; latency
          </p>
          <span
            className={`text-[11px] font-medium ${telemetry.ok ? 'text-emerald-400' : telemetry.configured ? 'text-amber-400' : 'text-muted-foreground'}`}
          >
            {telemetry.ok ? `live · index "${telemetry.indexName ?? '?'}" (${telemetry.upstashPeriod})` : telemetry.configured ? 'configured, fetch failed' : 'not configured'}
          </span>
        </div>

        {!telemetry.configured ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Set <span className="font-mono">UPSTASH_EMAIL</span> and{' '}
            <span className="font-mono">UPSTASH_API_KEY</span> (account API credentials — not the index REST token) to
            enable index-side query volume and latency from the Upstash Developer API. First-party logging is
            unaffected; it is already the source of truth for what was searched.
          </p>
        ) : !telemetry.ok ? (
          <p className="mt-1 text-[11px] text-amber-400">{telemetry.error}</p>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {(telemetry.periodQueryCount ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">queries Upstash executed in the window</p>
              </div>
              <div>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    telemetry.captureRatePct !== null && telemetry.captureRatePct < 60 ? 'text-amber-400' : 'text-foreground'
                  }`}
                >
                  {telemetry.captureRatePct !== null ? `${telemetry.captureRatePct}%` : '—'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  logged ({recordedSearches.toLocaleString()} measured) ÷ executed
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {telemetry.latencyP99Ms !== null ? `${Math.round(telemetry.latencyP99Ms)} ms` : '—'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  p99 query latency{telemetry.latencyMeanMs !== null && <> · mean {Math.round(telemetry.latencyMeanMs)} ms</>}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Upstash counts every operation on the index — visitor searches, reindex jobs and admin probes alike — and
              it never sees Postgres-only searches. So a low capture rate means lost instrumentation OR non-visitor
              traffic; a rate above 100% is impossible, and one far below 100% is a reason to audit the logging path,
              not a content problem.
            </p>

            <p className="text-[11px] text-muted-foreground">
              Index documents per Upstash:{' '}
              <span className="font-medium text-foreground">{(telemetry.documentCount ?? 0).toLocaleString()}</span>
              {indexed.readable && <> · our enumeration counted {indexed.total.toLocaleString()} (should match)</>}
              {(telemetry.pendingDocumentCount ?? 0) > 0 && (
                <span className="text-amber-400"> · {telemetry.pendingDocumentCount} pending</span>
              )}
              {telemetry.dailyQueryCount !== null && <> · {telemetry.dailyQueryCount.toLocaleString()} queries today</>}
            </p>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {LAYER_META.map((layer) => {
          const live = layers[layer.key]
          return (
            <li key={layer.key} className="flex items-start gap-2 text-xs">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: live ? '#10B981' : '#94A3B8' }}
              />
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {layer.label}
                  <span className={`ml-1.5 font-normal ${live ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {live ? 'live' : 'not configured'}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{layer.note}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {missingFromIndex.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-400">
            {missingFromIndex.length} published page{missingFromIndex.length === 1 ? '' : 's'} missing from the index
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            These exist in the catalog but the index cannot serve them. Run the reindex job after publishing in bulk.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingFromIndex.slice(0, 12).map((label) => (
              <span key={label} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
