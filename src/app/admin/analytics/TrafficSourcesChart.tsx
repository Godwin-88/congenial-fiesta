'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Props = {
  data: Array<{ source: string; platform: string | null; views: number }>
  totalViews: number
}

const COLORS = ['#0066FF', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1']

export default function TrafficSourcesChart({ data, totalViews }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-8">No traffic data available</p>
  }

  const chartData = data.map((d) => ({
    name: d.platform ? `${d.source} (${d.platform})` : d.source,
    value: d.views,
    percentage: totalViews > 0 ? Math.round((d.views / totalViews) * 100) : 0,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#F9FAFB' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [`${(value as number).toLocaleString()} views`, name as string]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-1">
        {chartData.map((item, i) => (
          <div key={item.name} className="flex justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {item.name}
            </span>
            <span className="text-gray-300">{item.percentage}% ({item.value.toLocaleString()})</span>
          </div>
        ))}
      </div>
    </div>
  )
}