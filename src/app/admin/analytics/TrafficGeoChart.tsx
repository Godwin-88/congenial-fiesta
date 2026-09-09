'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { countryName, flagEmoji } from './chartFormat'

type Props = {
  data: Array<{ code: string; views: number; sharePct: number }>
}

const PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#94A3B8', '#14B8A6', '#F97316']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GeoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">
        {flagEmoji(row.code)} {countryName(row.code)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(row.views).toLocaleString()} views · {row.sharePct}%
      </p>
    </div>
  )
}

export default function TrafficGeoChart({ data }: Props) {
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, name: `${flagEmoji(d.code)} ${d.code}` })),
    [data],
  )

  if (!chartData.length) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No geo data available yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={11}
          label={{ value: 'Views', position: 'insideRight', offset: -8, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          width={86}
          label={{ value: 'Country', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip content={<GeoTooltip />} cursor={{ fill: 'var(--foreground/5)' }} />
        <Bar dataKey="views" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={`geo-${i}`} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}