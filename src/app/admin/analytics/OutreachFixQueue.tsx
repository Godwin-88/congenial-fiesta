// Outreach fix queue — the loop-closer for the Outreach & Leads tab.
//
// Every other visual on the tab measures the pipeline; this one assigns the
// work, ranked by money at stake. The rows are deliberately heterogeneous — a
// stale inquiry, an unquotable package, a closed deal missing from the sponsor
// wall, a cooling hot lead — because that is what an owner's morning looks
// like.
//
// Tints come from the shared outreach vocabulary where a state exists, so a
// row's colour can never drift from the band it belongs to.

import type { OutreachFixQueueItem } from '@/lib/analytics/queries'
import { type OutreachIssue } from '@/lib/analytics/outreach'

type Props = {
  items: OutreachFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<OutreachIssue, string> = {
  stale_new: '#EF4444',
  press_unanswered: '#8B5CF6',
  aging_contacted: '#F97316',
  package_unmatched: '#F59E0B',
  hot_lead_cooling: '#EC4899',
  won_not_showcased: '#3B82F6',
  no_website: '#06B6D4',
  no_inquiries: '#EF4444',
}

const SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#64748B',
}

export default function OutreachFixQueue({ items, limit = 25 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing queued — every inquiry is answered, every stated interest matches a package, and every closed deal is on
        the sponsor wall.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length
  const stakeTotal = items.reduce((s, i) => s + i.stake, 0)
  const moneyRows = items.filter(
    (i) => i.issue === 'stale_new' || i.issue === 'press_unanswered' || i.issue === 'aging_contacted',
  ).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open items:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Stake at risk:</span>
          <span className="font-semibold text-foreground">{Math.round(stakeTotal).toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">High priority:</span>
          <span className="font-semibold text-foreground">{items.filter((i) => i.severity === 'high').length}</span>
        </span>
        {moneyRows > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1">
            <span className="text-muted-foreground">Unanswered inbound:</span>
            <span className="font-semibold text-foreground">{moneyRows}</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">#</th>
              <th className="py-2 pr-3 text-left font-medium">Issue</th>
              <th className="py-2 pr-3 text-left font-medium">Target</th>
              <th className="py-2 pr-3 text-left font-medium">What it costs</th>
              <th className="py-2 pr-3 text-right font-medium">Stake</th>
              <th className="py-2 text-right font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr
                key={`${item.issue}-${item.target}-${i}`}
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
                  <span className="block truncate text-xs text-foreground" title={item.target}>
                    {item.target}
                  </span>
                </td>
                <td className="max-w-[26rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right font-semibold tabular-nums text-foreground">
                  {Math.round(item.stake).toLocaleString()}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <a
                    href={item.href}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {hidden} more item{hidden === 1 ? '' : 's'} below the cut — export the outreach queue CSV for the full list.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Stake = age or volume × the cost of the gap (stale new inquiry ×2/day · contacted rot ×1.5/day · unquotable
        interest ×6/ask · cooling hot lead ×2/score-point). The first rows are money already on the table.
      </p>
    </div>
  )
}
