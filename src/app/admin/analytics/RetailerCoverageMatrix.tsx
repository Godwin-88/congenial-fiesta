// Distribution coverage matrix — retailer × price tier.
//
// A blank cell is the message: a tier with no retailer coverage is demand you
// cannot convert no matter how much traffic it gets. Intensity = how many
// published devices that retailer can actually sell in that tier.

import { tint } from './chartFormat'

type Props = {
  tiers: string[]
  tierLabels: string[]
  rows: Array<{ retailer: string; label: string; counts: number[]; total: number }>
  maxCell: number
  published: number
}

const BASE = '#3B82F6'

function cellColor(count: number, maxCell: number): string {
  if (count <= 0) return 'transparent'
  // Higher count = deeper colour (blend less toward white).
  const ratio = Math.min(1, count / Math.max(1, maxCell))
  return tint(BASE, '#FFFFFF', 0.72 - 0.62 * ratio)
}

export default function RetailerCoverageMatrix({ tiers, tierLabels, rows, maxCell, published }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No retailers configured yet — add buy links to a device to populate the distribution matrix.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground">Retailer</th>
            {tierLabels.map((label) => (
              <th key={label} className="text-center text-xs font-medium text-muted-foreground">
                {label}
              </th>
            ))}
            <th className="text-right text-xs font-medium text-muted-foreground">Devices</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.retailer}>
              <td className="whitespace-nowrap pr-2 text-xs text-foreground">{row.label}</td>
              {row.counts.map((count, i) => (
                <td key={`${row.retailer}-${tiers[i]}`} className="p-0">
                  <div
                    title={`${row.label} · ${tierLabels[i]}: ${count} of ${published} published devices`}
                    className="flex h-8 items-center justify-center rounded-sm text-[11px] font-medium"
                    style={{
                      backgroundColor: cellColor(count, maxCell),
                      color: count > maxCell * 0.45 ? '#FFFFFF' : 'var(--foreground)',
                      border: count > 0 ? '1px solid transparent' : '1px dashed var(--border)',
                    }}
                  >
                    {count > 0 ? count : '–'}
                  </div>
                </td>
              ))}
              <td className="pl-2 text-right text-xs font-semibold text-foreground">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Darker cell</span> = more published devices that retailer can
        sell in that tier · <span className="font-medium text-foreground">dashed (–)</span> = zero coverage, a demand
        pocket with no buy path · totals count devices, not links.
      </p>
    </div>
  )
}
