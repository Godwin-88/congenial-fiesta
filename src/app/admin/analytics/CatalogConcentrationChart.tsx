'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

type Props = {
  data: Array<{ rank: number; slug: string; label: string; views: number; sharePct: number; cumulativePct: number }>
  paretoIndex: number | null
  top10SharePct: number
  totalViews: number
}

function shortLabel(value: string): string {
  const cleaned = value.replace(/^(Apple|Samsung|Xiaomi|Tecno|Infinix|Oppo|Google)\s+/i, '')
  return cleaned.length > 14 ? `${cleaned.slice(0, 14)}…` : cleaned
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ParetoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">
        <span className="text-muted-foreground">#{row.rank} </span>
        {row.label}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(row.views).toLocaleString()} views · {row.sharePct}% of device traffic
      </p>
      <p className="text-xs text-muted-foreground">cumulative {row.cumulativePct}%</p>
    </div>
  )
}

export default function CatalogConcentrationChart({ data, paretoIndex, top10SharePct, totalViews }: Props) {
  const rows = data.map((row) => ({ ...row, name: `#${row.rank}` }))

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No device-page views in this period — the Pareto curve needs at least one visited device page.
      </p>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={11}
            label={{ value: 'Device rank (by views)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            yAxisId="left"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v: number) => v.toLocaleString()}
            label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            stroke="var(--muted-foreground)"
            fontSize={11}
            label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', offset: 12, fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip content={<ParetoTooltip />} cursor={{ fill: 'var(--foreground)', fillOpacity: 0.05 }} />
          <ReferenceLine
            yAxisId="right"
            y={80}
            stroke="#10B981"
            strokeDasharray="4 4"
            label={{ value: '80% of views', position: 'insideTopRight', fontSize: 10, fill: '#10B981' }}
          />
          {paretoIndex && paretoIndex <= rows.length ? (
            <ReferenceLine
              x={`#${paretoIndex}`}
              yAxisId="left"
              stroke="#F59E0B"
              strokeDasharray="4 4"
              label={{ value: `top ${paretoIndex}`, position: 'top', fontSize: 10, fill: '#F59E0B' }}
            />
          ) : null}
          <Bar yAxisId="left" dataKey="views" name="Views" fill="#3B82F6" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePct"
            name="Cumulative"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Bars</span> = views per device (left) ·{' '}
        <span className="font-medium text-foreground">line</span> = running share of {totalViews.toLocaleString()} device
        views (right) · <span className="font-medium text-foreground">top 10</span> carry {top10SharePct}%.
        {paretoIndex
          ? ` ${paretoIndex} page${paretoIndex === 1 ? '' : 's'} reach 80% — everything after that rank is the long tail to link, merge or prune.`
          : ''}
      </p>
    </div>
  )
}
