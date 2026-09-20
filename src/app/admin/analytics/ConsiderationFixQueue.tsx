// Consideration fix queue — the loop-closer for the Compare tab.
//
// Every other visual on the tab measures; this one assigns work. Rows are
// ranked by the interest at stake (intent score for devices, pair runs for
// comparisons), each carries the concrete action and — where a device row is
// involved — a deep link into the device editor.

import { ISSUE_SEVERITY_COLORS, type ConsiderationIssue } from '@/lib/analytics/consideration'
import type { ConsiderationFixQueueItem } from '@/lib/analytics/queries'

type Props = {
  items: ConsiderationFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<ConsiderationIssue, string> = {
  high_interest_no_links: '#F59E0B',
  conversion_leak: '#EF4444',
  save_only: '#3B82F6',
  watch_only: '#3B82F6',
  compare_orphan: '#94A3B8',
  lopsided_pair: '#8B5CF6',
}

function QueueChips({ items }: { items: ConsiderationFixQueueItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
        <span className="text-muted-foreground">Open issues:</span>
        <span className="font-semibold text-foreground">{items.length}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
        <span className="text-muted-foreground">Interest at stake:</span>
        <span className="font-semibold text-foreground">
          {items.reduce((sum, item) => sum + item.interest, 0).toLocaleString()}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
        <span className="text-muted-foreground">High priority:</span>
        <span className="font-semibold text-foreground">{items.filter((i) => i.severity === 'high').length}</span>
      </span>
    </div>
  )
}

export default function ConsiderationFixQueue({ items, limit = 25 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing to fix — every considered device has a buy path and every live pair is balanced.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length

  return (
    <div className="space-y-3">
      <QueueChips items={items} />
      <QueueTable rows={rows} />
      {hidden > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Showing the top {rows.length} of {items.length} issues — export the full queue as CSV to work the backlog.
        </p>
      ) : null}
    </div>
  )
}

function QueueTable({ rows }: { rows: ConsiderationFixQueueItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">#</th>
            <th className="py-2 pr-3 text-left font-medium">Issue</th>
            <th className="py-2 pr-3 text-left font-medium">Device / Pair</th>
            <th className="py-2 pr-3 text-left font-medium">Why it costs intent</th>
            <th className="py-2 pr-3 text-right font-medium">Interest</th>
            <th className="py-2 text-right font-medium">Fix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={`${item.issue}-${item.slug ?? (item.pair ?? []).join('+')}-${i}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-3">
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${ISSUE_TINT[item.issue]}22`,
                    color: ISSUE_TINT[item.issue],
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: ISSUE_SEVERITY_COLORS[item.severity] }}
                  />
                  {item.label}
                </span>
              </td>
              <td className="max-w-[14rem] py-2 pr-3">
                {item.href ? (
                  <a href={item.href} className="block truncate text-brand-primary hover:underline" title={item.name}>
                    {item.name}
                  </a>
                ) : (
                  <span className="block truncate text-foreground" title={item.name}>
                    {item.name}
                  </span>
                )}
                {item.pair ? (
                  <span className="block truncate font-mono text-[11px] text-muted-foreground" title={item.pair.join(' + ')}>
                    {item.pair.join(' + ')}
                  </span>
                ) : null}
              </td>
              <td className="max-w-[20rem] py-2 pr-3">
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                <span className="font-semibold text-foreground">{item.interest.toLocaleString()}</span>
              </td>
              <td className="whitespace-nowrap py-2 text-right">
                {item.editHref ? (
                  <a
                    href={item.editHref}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  >
                    Edit device
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground">editorial</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
