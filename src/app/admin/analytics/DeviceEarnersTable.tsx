// Device earners table — the Pareto of the proxy, ranked by KES earned.
//
// Server-rendered. Rows carry a tier pill and a cumulative share column, so
// the 80% line is visible: how many device pages actually produce the money,
// and how long the tail is. Empty states name the next action honestly.

import { MONETIZATION_COLORS, MONETIZATION_LABELS, type MonetizationTier } from '@/lib/analytics/revenue'
import type { RevenueDeviceRow } from '@/lib/analytics/queries'

type Props = {
  rows: RevenueDeviceRow[]
  limit?: number
}

export default function DeviceEarnersTable({ rows, limit = 12 }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No device pages seen this period — the earners table opens with the first device view.
      </p>
    )
  }

  const totalProxy = rows.reduce((s, r) => s + r.proxy, 0)
  const visible = rows.slice(0, limit)
  let cumulative = 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">#</th>
            <th className="py-2 pr-3 text-left font-medium">Device</th>
            <th className="py-2 pr-3 text-left font-medium">Tier</th>
            <th className="py-2 pr-3 text-right font-medium">Views</th>
            <th className="py-2 pr-3 text-right font-medium">Clicks</th>
            <th className="py-2 pr-3 text-right font-medium">CTR</th>
            <th className="py-2 pr-3 text-right font-medium">Proxy</th>
            <th className="py-2 text-right font-medium">Cum. share</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => {
            cumulative += row.proxy
            const cumPct = totalProxy > 0 ? Math.round((cumulative / totalProxy) * 1000) / 10 : 0
            return (
              <tr key={row.slug} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="max-w-[14rem] py-2 pr-3">
                  <span className="block truncate text-foreground" title={row.name}>
                    {row.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">{row.brandName}</span>
                </td>
                <td className="py-2 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${MONETIZATION_COLORS[row.tier]}22`, color: MONETIZATION_COLORS[row.tier] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: MONETIZATION_COLORS[row.tier] }} />
                    {MONETIZATION_LABELS[row.tier]}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.views.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.clicks.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.ctr}%</td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums text-foreground">
                  KES {row.proxy.toLocaleString()}
                </td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{cumPct}%</td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-4 text-center text-muted-foreground">
                No device pages with traffic or clicks.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Ranked by proxy contribution (blended mean rate × clicks — per-device retailer attribution arrives when
        clicks record their rate). Read the cumulative column for the 80% line: the shelves that fund the catalog.
      </p>
    </div>
  )
}
