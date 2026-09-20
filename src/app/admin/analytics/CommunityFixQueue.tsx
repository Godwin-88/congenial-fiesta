// Community moderation queue — the loop-closer for the Community tab.
//
// Every other visual measures; this one assigns the editor's day. Rows are
// ranked by stake (traffic for solicitation issues, signals × 5 for orphan
// proof, × 20 for unreviewed reports), each with the concrete action and a
// deep link into the device editor where a catalog fix applies.

import { DEVICE_ISSUE_SEVERITY_COLORS as ISSUE_SEVERITY_COLORS } from '@/lib/analytics/deviceOutcome'
import { type ModerationIssue } from '@/lib/analytics/community'
import type { CommunityFixQueueItem } from '@/lib/analytics/queries'

type Props = {
  items: CommunityFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<ModerationIssue, string> = {
  high_demand_no_proof: '#F59E0B',
  single_voice: '#F59E0B',
  unanswered_question: '#3B82F6',
  negative_drift: '#EF4444',
  orphan_proof: '#8B5CF6',
  reported_unreviewed: '#EF4444',
}

export default function CommunityFixQueue({ items, limit = 20 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing queued — every high-traffic device has proof, no questions are hanging and no reports await review.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open items:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Views at stake:</span>
          <span className="font-semibold text-foreground">{items.reduce((s, i) => s + i.stake, 0).toLocaleString()}</span>
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
              <th className="py-2 pr-3 text-left font-medium">Why it matters</th>
              <th className="py-2 pr-3 text-right font-medium">Stake</th>
              <th className="py-2 text-right font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={`${item.issue}-${item.slug ?? 'catalog'}-${i}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${ISSUE_TINT[item.issue]}22`, color: ISSUE_TINT[item.issue] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ISSUE_SEVERITY_COLORS[item.severity] }} />
                    {item.label}
                  </span>
                </td>
                <td className="max-w-[14rem] py-2 pr-3">
                  {item.href ? (
                    <a href={item.href} className="block truncate text-brand-primary hover:underline" title={item.name}>
                      {item.name}
                    </a>
                  ) : (
                    <span className="block truncate text-foreground">{item.name}</span>
                  )}
                </td>
                <td className="max-w-[20rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold text-foreground">
                  {item.stake.toLocaleString()}
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
                    <span className="text-[11px] text-muted-foreground">moderation</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Showing the top {rows.length} of {items.length} items — work top-down; each row is attention you already
          earned.
        </p>
      ) : null}
    </div>
  )
}
