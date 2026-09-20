// Monetization thermometer — how the catalog converts traffic into clicks.
//
// Server-rendered, five bands in CTR order (converter → unsold). Unlike the
// qualification thermometer (visitor intent), these bands are the SHELVES:
// every band names a different monetization problem, and the red unsold band
// is deliberately last so the eye lands on the pages with no audience at all.

import {
  MONETIZATION_COLORS,
  MONETIZATION_DESCRIPTIONS,
  type MonetizationTier,
} from '@/lib/analytics/revenue'

type Props = {
  tiers: Array<{ tier: MonetizationTier; label: string; devices: number; sharePct: number; views: number; proxy: number }>
  total: number
}

export default function MonetizationThermometer({ tiers, total }: Props) {
  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No device traffic or clicks yet — the shelves fill as device pages are viewed.
      </p>
    )
  }

  const visible = tiers.filter((t) => t.devices > 0)

  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
        {visible.map((row) => (
          <div
            key={row.tier}
            title={`${row.label}: ${row.devices.toLocaleString()} devices (${row.sharePct}%) · ${row.views.toLocaleString()} views`}
            className="flex items-center justify-center text-[11px] font-semibold text-white/95"
            style={{ width: `${Math.max(row.sharePct, 1.5)}%`, backgroundColor: MONETIZATION_COLORS[row.tier] }}
          >
            {row.sharePct >= 8 ? `${row.label} ${row.sharePct}%` : ''}
          </div>
        ))}
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {tiers.map((row) => (
          <li key={row.tier} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: MONETIZATION_COLORS[row.tier] }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {row.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {row.devices.toLocaleString()} devices · {row.sharePct}%
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">{MONETIZATION_DESCRIPTIONS[row.tier]}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> device pages seen this period,
        classified by CTR (converter ≥3% · engaged ≥1% · teaser &lt;1% · dormant 0 clicks · unsold no views). Dormant
        shelves are the cheapest wins — the traffic is already paid for.
      </p>
    </div>
  )
}
