// Demand rhythm heatmap — time bucket × price tier.
//
// Same idea as the Content tab's section momentum, but keyed by the catalog's
// own dimension: where attention moves across the price ladder, and whether a
// tier is warming up or cooling down. Hand-rolled table (no chart lib) so the
// cells stay exact and readable at 30/90-day densities.

import { tint } from './chartFormat'

type Props = {
  buckets: string[]
  tiers: string[]
  tierLabels: string[]
  matrix: Array<{ bucket: string; tiers: Record<string, number>; total: number }>
  maxCell: number
}

const BASE = '#10B981'

function cellColor(value: number, maxCell: number): string {
  if (value <= 0) return 'transparent'
  const ratio = Math.min(1, value / Math.max(1, maxCell))
  return tint(BASE, '#FFFFFF', 0.78 - 0.68 * ratio)
}

export default function DeviceDemandHeatmap({ buckets, tiers, tierLabels, matrix, maxCell }: Props) {
  if (matrix.length === 0 || tiers.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No device-page views in this period.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card px-1 text-left font-medium text-muted-foreground">Period</th>
            {tierLabels.map((label) => (
              <th key={label} className="px-1 text-center font-medium text-muted-foreground">
                {label}
              </th>
            ))}
            <th className="px-1 text-right font-medium text-muted-foreground">All</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.bucket}>
              <td className="sticky left-0 whitespace-nowrap bg-card px-1 text-muted-foreground">{row.bucket}</td>
              {tiers.map((tier, i) => {
                const value = row.tiers[tier] ?? 0
                return (
                  <td key={`${row.bucket}-${tier}`} className="p-0">
                    <div
                      title={`${row.bucket} · ${tierLabels[i]}: ${value.toLocaleString()} views`}
                      className="flex h-7 min-w-9 items-center justify-center rounded-sm tabular-nums"
                      style={{
                        backgroundColor: cellColor(value, maxCell),
                        color: value > maxCell * 0.5 ? '#FFFFFF' : 'var(--foreground)',
                        border: value > 0 ? '1px solid transparent' : '1px dashed var(--border)',
                      }}
                    >
                      {value > 0 ? value : ''}
                    </div>
                  </td>
                )
              })}
              <td className="px-1 text-right font-semibold text-foreground tabular-nums">
                {row.total.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 bg-card px-1 font-medium text-muted-foreground">Total</td>
            {tiers.map((tier) => (
              <td key={`total-${tier}`} className="px-1 text-center font-semibold text-foreground tabular-nums">
                {matrix.reduce((sum, row) => sum + (row.tiers[tier] ?? 0), 0).toLocaleString()}
              </td>
            ))}
            <td className="px-1 text-right font-semibold text-foreground tabular-nums">
              {matrix.reduce((sum, row) => sum + row.total, 0).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Darker</span> = more views · one row per{' '}
        {buckets.length > 1 ? 'week' : 'day'} · read a column top-to-bottom for a tier&apos;s trend: an expensive tier
        that only lights up mid-month is a payday effect worth stocking for.
      </p>
    </div>
  )
}
