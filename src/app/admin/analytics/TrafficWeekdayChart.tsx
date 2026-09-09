'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Props = {
  data: Array<{ day: string; views: number; sharePct: number; isPeak: boolean }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DayTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(p.views).toLocaleString()} views · {p.sharePct}% of weekly traffic
      </p>
    </div>
  )
}

export default function TrafficWeekdayChart({ data }: Props) {
  if (!data.length || data.every((d) => d.views === 0)) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No weekday data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          stroke="var(--muted-foreground)"
          fontSize={12}
          label={{ value: 'Day of week', position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          label={{ value: 'Views', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip content={<DayTooltip />} cursor={{ fill: 'var(--foreground/5)' }} />
        <Bar dataKey="views" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.isPeak ? '#F59E0B' : '#3B82F6'} fillOpacity={d.isPeak ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}