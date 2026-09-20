// Revenue fix queue — the loop-closer for the money story.
//
// Every other visual on the tab measures; this one assigns work. Rows are
// ranked by stake (KES proxy at risk, or views flowing to a dead shelf), so
// the ticket order IS the payout order. Issue codes come from revenue.ts so
// the ledger, the charts and this queue can never drift apart.

import {
  REVENUE_ISSUE_META,
  REVENUE_ISSUE_SEVERITY_COLORS,
  type RevenueIssue,
} from '@/lib/analytics/revenue'
import type { RevenueFixQueueItem } from '@/lib/analytics/queries'

type Props = {
  items: RevenueFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<RevenueIssue, string> = {
  unpriced_clicks: '#EF4444',
  'tax_mismatch': '#F59E0B',
  no_clicks: '#F97316',
  low_ctr: '#3B82F6',
  dead_link: '#EF4444',
  unimported_actuals: '#8B5CF6',
}

export default function RevenueFixQueue({ items, limit = 25 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing to fix — every click is priced, every link is live and every shelf with traffic earns.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length
  const totalStake = items.reduce((sum, item) => sum + item.stake, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open leaks:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Stake:</span>
          <span className="font-semibold text-foreground">{totalStake.toLocaleString()}</span>
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
              <th className="py-2 pr-3 text-left font-medium">Where</th>
              <th className="py-2 pr-3 text-left font-medium">Why it costs money</th>
              <th className="py-2 pr-3 text-right font-medium">At stake</th>
              <th className="py-2 text-right font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr
                key={`${item.issue}-${item.slug ?? item.name ?? i}`}
                className="border-b border-border last:border-0 hover:bg-foreground/5"
              >
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
                      style={{ backgroundColor: REVENUE_ISSUE_SEVERITY_COLORS[item.severity] }}
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
                  {item.slug ? (
                    <span className="block truncate text-[11px] text-muted-foreground" title={item.slug}>
                      {item.slug}
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[20rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <span className="font-semibold text-foreground">{item.stake.toLocaleString()}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {item.issue === 'no_clicks' || item.issue === 'low_ctr' || item.issue === 'dead_link'
                      ? 'views'
                      : 'KES/clicks'}
                  </span>
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {item.editHref ? (
                    <a
                      href={item.editHref}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    >
                      {item.issue === 'unimported_actuals' ? 'Import' : item.slug ? 'Edit device' : 'Fix'}
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
          Showing the top {rows.length} of {items.length} leaks — export the full queue as CSV to work the backlog.
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Stake = KES proxy (or views, for traffic rows) at risk. {REVENUE_ISSUE_META['tax_mismatch'].label} rows price
        via the normalised fallback until the rate sheet and the click stream agree;{' '}
        {REVENUE_ISSUE_META.unpriced_clicks.label.toLowerCase()} price at zero until a rate exists.
      </p>
    </div>
  )
}
