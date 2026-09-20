'use client'

// Click momentum — affiliate clicks per bucket, stacked by retailer channel.
//
// Recharts (client component): the story is channel balance and cadence — a
// click flow that lives on one retailer is one network policy change away from
// zero. Same period-bucket recipe as the voice and intent momentum charts.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RevenueMomentumBucket } from '@/lib/analytics/queries'

const RETAILER_TINTS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F97316', '#EF4444']

type Props = {
  momentum: RevenueMomentumBucket[]
}

export default function ClickMomentumChart({ momentum }: Props) {
  const total = momentum.reduce((s, m) => s + m.total, 0)

  if (momentum.length === 0 || total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No clicks in this period — the chart fills with the first click on a buy link.
      </p>
    )
  }

  // Flatten byRetailer maps into chart rows; retailers ordered by total clicks.
  const retailerTotals = new Map<string, number>()
  for (const m of momentum) {
    for (const [retailer, count] of Object.entries(m.byRetailer)) {
      retailerTotals.set(retailer, (retailerTotals.get(retailer) ?? 0) + count)
    }
  }
  const retailers = Array.from(retailerTotals.entries()).sort((a, b) => b[1] - a[1]).map(([r]) => r)
  const data = momentum.map((m) => ({ bucket: m.bucket, ...m.byRetailer }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {retailers.map((retailer, i) => (
            <Bar
              key={retailer}
              dataKey={retailer}
              name={retailer}
              stackId="flow"
              fill={RETAILER_TINTS[i % RETAILER_TINTS.length]}
              radius={i === retailers.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
