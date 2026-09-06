'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: Array<{ date: string; views: number }>
}

const axisColor = 'var(--muted-foreground)'
const gridColor = 'var(--border)'
const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
}

const tooltipLabelStyle = { color: 'var(--card-foreground)' }
const tooltipItemStyle = { color: 'var(--brand-primary)' }

export default function PageViewsChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No view data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          stroke={axisColor}
          fontSize={12}
          tickFormatter={(val: string) => {
            const d = new Date(val)
            return `${d.getMonth() + 1}/${d.getDate()}`
          }}
        />
        <YAxis stroke={axisColor} fontSize={12} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
        />
        <Line
          type="monotone"
          dataKey="views"
          stroke="var(--brand-primary)"
          strokeWidth={2}
          dot={{ fill: 'var(--brand-primary)', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
