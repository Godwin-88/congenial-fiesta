// Consideration depth table — every device's attention-to-purchase ledger.
//
// Two derived ratios do the storytelling, and both need care (see the caption):
// intent-per-view (attention density — which pages hold people) and
// clicks-per-100-intent (shortlist conversion — which shortlists actually buy).
// Temperature colours come from the shared consideration vocabulary.

import type { ConsideredDeviceRow } from '@/lib/analytics/queries'

type Props = {
  rows: ConsideredDeviceRow[]
  limit?: number
}

const TEMP_COLORS: Record<ConsideredDeviceRow['temperature'], string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#3B82F6',
  untouched: '#94A3B8',
}

const TEMP_LABELS: Record<ConsideredDeviceRow['temperature'], string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  untouched: 'Untouched',
}

export default function ConsiderationDepthTable({ rows, limit = 15 }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No device-level consideration yet — it builds as save / compare / watch events land on catalog slugs.
      </p>
    )
  }

  const visible = rows.slice(0, limit)
  const hidden = rows.length - visible.length

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Device</th>
              <th className="py-2 pr-3 text-right font-medium">Intent</th>
              <th className="py-2 pr-3 text-right font-medium">S·C·W·R</th>
              <th className="py-2 pr-3 text-right font-medium">Intent/100 views</th>
              <th className="py-2 pr-3 text-right font-medium">Clicks/100 intent</th>
              <th className="py-2 pr-3 text-right font-medium">Links</th>
              <th className="py-2 text-left font-medium">Temp</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.slug} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="max-w-[13rem] py-2 pr-3">
                  <span className="block truncate text-foreground" title={row.name}>
                    {row.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {row.brandName} · {row.views.toLocaleString()} views · {row.clicks.toLocaleString()} clicks
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-semibold tabular-nums text-foreground">
                  {row.intentScore}
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-right text-xs tabular-nums text-muted-foreground">
                  {row.saves}·{row.compares}·{row.watches}·{row.relatedClicks}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums ${row.intentPerView >= 5 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {row.intentPerView}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums ${row.intentToClick >= 20 ? 'text-emerald-400' : row.intentScore >= 4 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {row.intentScore > 0 ? row.intentToClick : '—'}
                </td>
                <td className={`py-2 pr-3 text-right tabular-nums ${row.buyLinkCount === 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {row.buyLinkCount}
                </td>
                <td className="py-2">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: `${TEMP_COLORS[row.temperature]}1F`,
                      color: TEMP_COLORS[row.temperature],
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TEMP_COLORS[row.temperature] }} />
                    {TEMP_LABELS[row.temperature]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Intent</span> = compares×3 + saves×2 + watches + related ·{' '}
        <span className="font-medium text-foreground">S·C·W·R</span> = raw saves · compares · watches · related-clicks ·
        intent ratios divide by small numbers on quiet pages, so trust them on devices with 5+ views. Rows are ranked
        by intent score.
        {hidden > 0 ? ` Showing the top ${visible.length} of ${rows.length} — export the full ledger as CSV.` : ''}
      </p>
    </div>
  )
}
