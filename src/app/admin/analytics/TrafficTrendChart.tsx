'use client'

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatAxisDate, formatHoverDate } from './chartFormat'

type TrendPoint = { date: string; views: number; avg: number | null }

type Props = { data: TrendPoint[] }

const axisColor = 'var(--muted-foreground)'
const gridColor = 'var(--border)'

// Custom tooltip so the hover shows "Wed, Sep 9, 2026" plus views & rolling avg.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{formatHoverDate(String(label))}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="mt-1 flex items-center justify-between gap-5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill }} />
            {p.dataKey === 'views' ? 'Views' : 'Rolling avg'}
          </span>
          <span className="font-medium text-foreground">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrafficTrendChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No traffic data available</p>
  }

  const periodAvg = Math.round(data.reduce((s, d) => s + d.views, 0) / data.length)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          stroke={axisColor}
          fontSize={12}
          minTickGap={28}
          tickFormatter={(val: string) => formatAxisDate(val)}
          label={{ value: 'Date', position: 'insideBottom', offset: -8, fontSize: 11, fill: axisColor }}
        />
        <YAxis
          stroke={axisColor}
          fontSize={12}
          label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: axisColor }}
        />
        <Tooltip content={<TrendTooltip />} />
        <ReferenceLine
          y={periodAvg}
          stroke={axisColor}
          strokeDasharray="6 4"
          strokeOpacity={0.7}
          label={{
            value: `period avg ${periodAvg.toLocaleString()}`,
            position: 'insideTopRight',
            fontSize: 11,
            fill: axisColor,
          }}
        />
        <Area
          type="monotone"
          dataKey="views"
          name="views"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="#3B82F6"
          fillOpacity={0.16}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="avg"
          name="avg"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}