// Campaign fix queue — the loop-closer for the Campaigns tab.
//
// Every other visual measures attribution; this one assigns the work. Rows are
// ranked by stake (reach × how expensive the gap is), and each row carries the
// ACTION in plain language.
//
// Unlike the other queues on the dashboard these rows are mostly not editorial
// work — they are tracking work, and the top row is almost always money: clicks
// that happened whose campaign we never saw.

import type { CampaignFixQueueItem } from '@/lib/analytics/queries'
import { CAMPAIGN_ISSUE_META, type CampaignIssue } from '@/lib/analytics/campaigns'

type Props = {
  items: CampaignFixQueueItem[]
  limit?: number
}

const ISSUE_TINT: Record<CampaignIssue, string> = {
  unattributed_clicks: '#EF4444',
  creator_unattributed: '#8B5CF6',
  untagged_referral: '#F59E0B',
  shallow_landing: '#F59E0B',
  campaign_no_click: '#EF4444',
  unmapped_medium: '#3B82F6',
  no_medium: '#06B6D4',
  naming_violation: '#94A3B8',
  stale_campaign: '#64748B',
  no_tagged_traffic: '#8B5CF6',
}

const SEVERITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#64748B',
}

export default function CampaignFixQueue({ items, limit = 20 }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        Nothing queued — every tagged campaign reached a deep landing, earned a click and kept to the tag convention.
      </p>
    )
  }

  const rows = items.slice(0, limit)
  const hidden = items.length - rows.length
  const totalStake = items.reduce((s, i) => s + i.stake, 0)
  const attributionGaps = items.filter(
    (i) =>
      i.issue === 'unattributed_clicks' ||
      i.issue === 'creator_unattributed' ||
      i.issue === 'untagged_referral' ||
      i.issue === 'no_tagged_traffic',
  ).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Open items:</span>
          <span className="font-semibold text-foreground">{items.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Reach at stake:</span>
          <span className="font-semibold text-foreground">{Math.round(totalStake).toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">High priority:</span>
          <span className="font-semibold text-foreground">{items.filter((i) => i.severity === 'high').length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1">
          <span className="text-muted-foreground">Attribution gaps:</span>
          <span className="font-semibold text-foreground">{attributionGaps}</span>
        </span>
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
                  <span className="block truncate font-mono text-xs text-foreground" title={item.target}>
                    {item.target}
                  </span>
                </td>
                <td className="max-w-[24rem] py-2 pr-3">
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground/80">{item.action}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold text-foreground">
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
          {hidden} more item{hidden === 1 ? '' : 's'} below the cut — export the campaign queue CSV for the full list.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Stake = the reach the issue affects × its weight (clicks we cannot credit ×8 · creator traffic ×2 · shallow
        landing ×1.5 · reach with no outcome ×1.2 · unmapped medium ×1). {CAMPAIGN_ISSUE_META.unattributed_clicks.action}
      </p>
    </div>
  )
}
