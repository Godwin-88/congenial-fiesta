'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: Array<{ date: string; views: number }>
}

export default function PageViewsChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No view data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(val: string) => {
            const d = new Date(val)
            return `${d.getMonth() + 1}/${d.getDate()}`
          }}
        />
        <YAxis stroke="#9CA3AF" fontSize={12} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#F9FAFB' }}
          itemStyle={{ color: '#0066FF' }}
        />
        <Line
          type="monotone"
          dataKey="views"
          stroke="#0066FF"
          strokeWidth={2}
          dot={{ fill: '#0066FF', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}