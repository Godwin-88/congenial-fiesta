'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: Array<{ deviceType: string; views: number }>
}

const COLORS: Record<string, string> = {
  mobile: '#0066FF',
  tablet: '#F59E0B',
  desktop: '#10B981',
  unknown: '#6B7280',
}

export default function DeviceTypeChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No device data available</p>
  }

  const chartData = data.map((d) => ({
    name: d.deviceType.charAt(0).toUpperCase() + d.deviceType.slice(1),
    views: d.views,
    fill: COLORS[d.deviceType.toLowerCase()] ?? '#6B7280',
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
        <YAxis stroke="#9CA3AF" fontSize={12} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#F9FAFB' }}
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