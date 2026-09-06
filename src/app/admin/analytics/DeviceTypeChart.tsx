'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: Array<{ deviceType: string; views: number }>
}

const COLORS: Record<string, string> = {
  mobile: 'var(--brand-primary)',
  tablet: '#F59E0B',
  desktop: '#10B981',
  unknown: 'var(--muted-foreground)',
}

const axisColor = 'var(--muted-foreground)'
const gridColor = 'var(--border)'
const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
}

const tooltipLabelStyle = { color: 'var(--card-foreground)' }

export default function DeviceTypeChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No device data available</p>
  }

  const chartData = data.map((d) => ({
    name: d.deviceType.charAt(0).toUpperCase() + d.deviceType.slice(1),
    views: d.views,
    fill: COLORS[d.deviceType.toLowerCase()] ?? 'var(--muted-foreground)',
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
        <YAxis stroke={axisColor} fontSize={12} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
        />
        <Bar dataKey="views" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <rect key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
