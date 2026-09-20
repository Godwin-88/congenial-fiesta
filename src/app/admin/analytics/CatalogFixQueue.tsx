// Catalog fix queue — the loop-closer.
//
// Every other visual on the tab measures; this one assigns work. Rows are
// ranked by views at risk, so the ticket order IS the revenue order, each row
// carries the concrete action and (where it exists) a deep link straight into
// the device editor.

import {
  DEVICE_ISSUE_SEVERITY_COLORS,
  type DeviceIssue,
} from '@/lib/analytics/deviceOutcome'
import type { DeviceFixQueueItem } from '@/lib/analytics/queries'

type Props = {
  items: DeviceFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<DeviceIssue, string> = {
  no_buy_link: '#F59E0B',
  unpublished_but_trafficked: '#EF4444',
  stale_slug: '#94A3B8',
  broken_link: '#EF4444',
  stale_price: '#3B82F6',
  missing_price: '#3B82F6',
}

export default function CatalogFixQueue({ items, limit = 25 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing to fix — every viewed device page is published with a live buy link.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length
  const totalAtRisk = items.reduce((sum, item) => sum + item.viewsAtRisk, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open issues:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Views at risk:</span>
          <span className="font-semibold text-foreground">{totalAtRisk.toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">High priority:</span>
          <span className="font-semibold text-foreground">{items.filter((i) => i.severity === 'high').length}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">#</th>
              <th className="py-2 pr-3 text-left font-medium">Issue</th>
              <th className="py-2 pr-3 text-left font-medium">Device</th>
              <th className="py-2 pr-3 text-left font-medium">Why it costs money</th>
              <th className="py-2 pr-3 text-right font-medium">Views at risk</th>
              <th className="py-2 text-right font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={`${item.issue}-${item.slug ?? item.path ?? i}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
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
                      style={{ backgroundColor: DEVICE_ISSUE_SEVERITY_COLORS[item.severity] }}
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
                  {item.path ? (
                    <span className="block truncate text-[11px] text-muted-foreground" title={item.path}>
                      {item.path}
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[20rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <span className="font-semibold text-foreground">{item.viewsAtRisk.toLocaleString()}</span>
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {item.editHref ? (
                    <a
                      href={item.editHref}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    >
                      Edit device
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">manual</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Showing the top {rows.length} of {items.length} issues — export the full queue as CSV to work the backlog.
        </p>
      ) : null}
    </div>
  )
}
