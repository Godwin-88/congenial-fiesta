'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type LaunchPiece = {
  slug: string
  title: string
  type: 'article' | 'device' | 'video'
  publishedAt: string
  daysSincePublish: number
  cumulative: number[]
}

type Props = { data: LaunchPiece[] }

const PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LaunchTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">Day {label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="mt-0.5 flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
            <span className="max-w-40 truncate">{p.name}</span>
          </span>
          <span className="font-medium text-foreground">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function ContentLaunchChart({ data }: Props) {
  const pieces = data.slice(0, 5)
  if (!pieces.length) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No launch data available</p>
  }

  const maxDays = Math.min(30, Math.max(...pieces.map((p) => p.daysSincePublish)))
  const rows = Array.from({ length: maxDays + 1 }, (_, day) => {
    const row: Record<string, string | number | null> = { day }
    for (const p of pieces) {
      row[p.slug] = day < p.cumulative.length ? p.cumulative[day] : null
    }
    return row
  })

  const shortTitle = (t: string) => t.length > 22 ? `${t.slice(0, 22)}…` : t

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(d: number) => `D${d}`}
          label={{ value: 'Days since publish', position: 'insideBottom', offset: -6, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v: number) => v.toLocaleString()}
          label={{ value: 'Cumulative views', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip content={<LaunchTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => {
            const p = pieces.find((x) => x.slug === value)
            return p ? shortTitle(p.title) : String(value)
          }}
        />
        {pieces.map((p, i) => (
          <Line
            key={p.slug}
            type="monotone"
            dataKey={p.slug}
            name={p.title}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}