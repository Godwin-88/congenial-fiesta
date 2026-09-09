'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type Props = {
  data: Array<{ deviceSlug: string; brandSlug: string; views: number; clicks: number; ctr: number }>
}

const PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#94A3B8']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ConversionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{p.deviceSlug}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(p.views).toLocaleString()} views · {p.ctr}% CTR · {Number(p.clicks).toLocaleString()} clicks
      </p>
    </div>
  )
}

export default function ContentConversionScatter({ data }: Props) {
  const rows = data.filter((d) => d.views > 0)
  if (!rows.length) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No conversion data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="views"
          name="views"
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v: number) => v.toLocaleString()}
          label={{ value: 'Views', position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          dataKey="ctr"
          name="ctr"
          type="number"
          stroke="var(--muted-foreground)"
          fontSize={11}
          unit="%"
          label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip content={<ConversionTooltip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={rows} name="Devices">
          {rows.map((row, i) => (
            <Cell key={row.deviceSlug} fill={PALETTE[(row.brandSlug.length + i) % PALETTE.length]} fillOpacity={0.75} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}