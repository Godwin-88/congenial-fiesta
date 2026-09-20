// Search fix queue — the loop-closer for the Search & Discovery tab.
//
// Every other visual measures; this one assigns the work. Rows are ranked by
// demand at stake (searches × how expensive the miss is), and each row carries
// the ACTION in plain language plus a link to the exact search the visitor ran.
//
// The distinguishing feature versus every other queue on the dashboard: the
// near-miss rows. When a zero-result query is a token-level match for something
// already in the catalog, the fix is a synonym or a slug — minutes, not days —
// so those rows outrank brand-new content of equal volume.

import type { SearchFixQueueItem } from '@/lib/analytics/queries'
import { SEARCH_ISSUE_META, type SearchIssue } from '@/lib/analytics/searchStory'

type Props = {
  items: SearchFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<SearchIssue, string> = {
  near_miss: '#8B5CF6',
  zero_result: '#EF4444',
  thin_result: '#F59E0B',
  vague_query: '#94A3B8',
  unindexed_content: '#3B82F6',
  unrecorded_result: '#64748B',
}

const SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#64748B',
}

export default function SearchFixQueue({ items, limit = 20 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing queued — every logged query in this period got a real answer and the index matches the catalog.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length
  const totalStake = items.reduce((s, i) => s + i.stake, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open items:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Demand at stake:</span>
          <span className="font-semibold text-foreground">{Math.round(totalStake).toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">High priority:</span>
          <span className="font-semibold text-foreground">{items.filter((i) => i.severity === 'high').length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1">
          <span className="text-muted-foreground">Near misses:</span>
          <span className="font-semibold text-foreground">{items.filter((i) => i.issue === 'near_miss').length}</span>
        </span>
      </div>


      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">#</th>
              <th className="py-2 pr-3 text-left font-medium">Issue</th>
              <th className="py-2 pr-3 text-left font-medium">Query</th>
              <th className="py-2 pr-3 text-left font-medium">What it costs</th>
              <th className="py-2 pr-3 text-right font-medium">Searches</th>
              <th className="py-2 pr-3 text-right font-medium">Stake</th>
              <th className="py-2 text-right font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr
                key={`${item.issue}-${item.query}-${i}`}
                className="border-b border-border last:border-0 hover:bg-foreground/5"
              >
                <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${ISSUE_TINT[item.issue]}22`, color: ISSUE_TINT[item.issue] }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLORS[item.severity] }}
                    />
                    {item.label}
                  </span>
                </td>
                <td className="max-w-[14rem] py-2 pr-3">
                  <a
                    href={item.href}
                    className="block truncate font-mono text-xs text-brand-primary hover:underline"
                    title={item.query}
                  >
                    {item.query}
                  </a>
                </td>
                <td className="max-w-[22rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                  {item.searches > 0 ? item.searches.toLocaleString() : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold text-foreground">
                  {Math.round(item.stake).toLocaleString()}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <a
                    href={item.href}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  >
                    See query
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {hidden} more item{hidden === 1 ? '' : 's'} below the cut — export the backlog CSV for the full list.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Stake weights the miss by how expensive it is to fix: near miss ×4, zero-result ×3, thin result ×1.5, unindexed
        page a flat 10. {SEARCH_ISSUE_META.near_miss.action}
      </p>
    </div>
  )
}
