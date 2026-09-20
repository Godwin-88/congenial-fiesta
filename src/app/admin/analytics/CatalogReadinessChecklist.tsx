// Catalog readiness checklist — the six fields a published device page needs.
//
// Read as "what share of live pages can do their job": findable (SEO title),
// trustworthy (images, verdict, score) and clickable (price, buy link). Bars
// are ordered by funnel position, and the weakest bar is highlighted, because
// that is the single highest-leverage catalog task.

type Props = {
  rows: Array<{ key: string; label: string; covered: number; total: number; pct: number }>
}

const ROW_HINT: Record<string, string> = {
  buy_link: 'Without a link the page cannot earn a single shilling.',
  images: 'Product imagery drives both trust and click-through.',
  price: 'A price anchors the buy box and filters the right shoppers.',
  verdict: 'The verdict is the reason a reader trusts your recommendation.',
  score: 'Scores make devices comparable — the substrate for /compare.',
  seo: 'Without an SEO title the page competes with a truncated snippet.',
}

function barColor(pct: number): string {
  if (pct >= 90) return '#10B981'
  if (pct >= 60) return '#F59E0B'
  return '#EF4444'
}

export default function CatalogReadinessChecklist({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No published devices yet.</p>
  }

  const weakest = [...rows].sort((a, b) => a.pct - b.pct)[0]
  const complete = rows.filter((r) => r.pct >= 100).length

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{complete}/{rows.length}</span> attributes fully covered
        </p>
        {weakest && weakest.pct < 100 ? (
          <p className="text-xs text-muted-foreground">
            weakest: <span className="font-semibold text-amber-400">{weakest.label}</span> at{' '}
            <span className="font-semibold text-foreground">{weakest.pct}%</span>
          </p>
        ) : (
          <p className="text-xs text-emerald-400">catalog fully attributed</p>
        )}
      </div>

      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${row.pct < 60 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {row.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{row.covered}</span>/{row.total} · {row.pct}%
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${row.pct}%`, backgroundColor: barColor(row.pct) }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{ROW_HINT[row.key] ?? ''}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
