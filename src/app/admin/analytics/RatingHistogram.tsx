// Rating distribution — the shape of the catalog's verdicts, 5★ → 1★.
//
// Horizontal bars (server component, zero client JS). A left-leaning
// distribution (fat 5★) reads as trust; a fat right tail (2★/1★) surfaces a
// product-claim problem worth editorial review before promotion.

import { RATING_BUCKET_COLORS } from '@/lib/analytics/community'

type Props = {
  histogram: Array<{ bucket: string; count: number; sharePct: number }>
}

export default function RatingHistogram({ histogram }: Props) {
  const total = histogram.reduce((s, h) => s + h.count, 0)

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No ratings in this period — the distribution appears with the first verdict.
      </p>
    )
  }

  const max = Math.max(1, ...histogram.map((h) => h.count))

  return (
    <div>
      <div className="space-y-1.5">
        {histogram.map((row) => {
          const stars = Number(row.bucket.replace('★', ''))
          return (
            <div key={row.bucket} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-xs font-medium text-muted-foreground">{row.bucket}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-foreground/5">
                <div
                  className="flex h-full items-center justify-end rounded-md px-1.5"
                  style={{
                    width: `${Math.max((row.count / max) * 100, row.count > 0 ? 6 : 0)}%`,
                    backgroundColor: RATING_BUCKET_COLORS[stars] ?? '#94A3B8',
                  }}
                  title={`${row.bucket}: ${row.count} ratings (${row.sharePct}%)`}
                >
                  {row.count > 0 ? (
                    <span className="text-[10px] font-semibold text-white/95 tabular-nums">{row.count}</span>
                  ) : null}
                </div>
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                {row.sharePct}%
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {total.toLocaleString()} ratings this period · a fat 2★/1★ tail is a product-claim problem — check the comments
        on those devices before promoting them anywhere.
      </p>
    </div>
  )
}
