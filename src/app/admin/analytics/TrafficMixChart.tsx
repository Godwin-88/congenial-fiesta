'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatAxisDate, formatHoverDate, SOURCE_COLORS, SOURCE_LABELS } from './chartFormat'

type MixPoint = { date: string; direct: number; search: number; social: number; referral: number }

type Props = { data: MixPoint[] }

const MIX_KEYS = ['direct', 'search', 'social', 'referral'] as const

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
}

export default function TrafficMixChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No traffic mix data available</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={12}
            minTickGap={28}
            tickFormatter={(val: string) => formatAxisDate(val)}
            label={{ value: 'Date', position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--card-foreground)' }}
            labelFormatter={(label) => formatHoverDate(String(label ?? ''))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `${(value as number).toLocaleString()} views`,
              SOURCE_LABELS[name as string] ?? (name as string),
            ]}
          />
          {MIX_KEYS.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={SOURCE_COLORS[key]}
              strokeWidth={1}
              fill={SOURCE_COLORS[key]}
              fillOpacity={0.75}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {MIX_KEYS.map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SOURCE_COLORS[key] }} />
            {SOURCE_LABELS[key]}
          </span>
        ))}
      </div>
    </div>
  )
}