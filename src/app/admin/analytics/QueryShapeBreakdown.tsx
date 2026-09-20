// Query shape breakdown — what KIND of demand walks in the door.
//
// Unique to this tab: it classifies every query into an intent shape (brand +
// model · brand only · head-to-head · spec intent · price intent · generic) and
// pairs the demand share with the SUCCESS RATE of that shape.
//
// The read is editorial, not statistical: brand+model demand failing means a
// catalog/alias problem; spec and price demand failing means an editorial gap
// (no buying guides, no price data). Two failures, two different teams.

import { QUERY_SHAPE_COLORS, QUERY_SHAPE_DESCRIPTIONS, type QueryShape } from '@/lib/analytics/searchStory'

type ShapeRow = {
  shape: QueryShape
  label: string
  searches: number
  queries: number
  recordedSearches: number
  sharePct: number
  successPct: number
}

type Props = {
  rows: ShapeRow[]
  totalSearches: number
}
export default function QueryShapeBreakdown({ rows, totalSearches }: Props) {
  if (rows.length === 0 || totalSearches <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No queries to classify yet — the shape mix appears with the first search.
      </p>
    )
  }

  const maxSearches = Math.max(1, ...rows.map((r) => r.searches))

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const unmeasured = row.recordedSearches === 0
        const weak = !unmeasured && row.successPct < 60
        return (
          <div key={row.shape}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: QUERY_SHAPE_COLORS[row.shape] }} />
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{row.searches.toLocaleString()}</span>
                {' · '}
                {row.sharePct}% · {row.queries.toLocaleString()} queries · answered{' '}
                {unmeasured ? (
                  <span className="font-semibold text-slate-400">n/a</span>
                ) : (
                  <span className={weak ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
                    {row.successPct}%
                  </span>
                )}
              </span>
            </div>

            {/* Demand bar (shape colour) with the answered portion overlaid in green */}
            <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.searches / maxSearches) * 100}%`,
                  backgroundColor: `${QUERY_SHAPE_COLORS[row.shape]}55`,
                  border: `1px solid ${QUERY_SHAPE_COLORS[row.shape]}`,
                }}
              />
              {!unmeasured && (
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-emerald-500/80"
                  style={{ width: `${(row.searches / maxSearches) * (row.successPct / 100) * 100}%` }}
                  title={`${row.successPct}% of this shape's recorded searches were answered with depth`}
                />
              )}
            </div>
          </div>
        )
      })}

      {rows.some((r) => r.recordedSearches === 0) && (
        <p className="text-[11px] text-muted-foreground">
          Shapes showing <span className="text-foreground">n/a</span> have no recorded result counts in this period —
          success rate is suppressed rather than reported as a false zero.
        </p>
      )}

      <ul className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={`desc-${row.shape}`} className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{row.label}:</span> {QUERY_SHAPE_DESCRIPTIONS[row.shape]}
          </li>
        ))}
      </ul>
    </div>
  )
}
