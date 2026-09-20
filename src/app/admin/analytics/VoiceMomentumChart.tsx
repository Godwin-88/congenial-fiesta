'use client'

// Voice momentum — ratings vs comments per bucket, stacked.
//
// Recharts (client component): the story is the two layers' balance — a healthy
// community comments (dialogue), a rating-only community scores (drive-by).
// Same period-bucket recipe as the content and intent momentum charts.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Props = {
  momentum: Array<{ bucket: string; ratings: number; comments: number; total: number }>
}

export default function VoiceMomentumChart({ momentum }: Props) {
  const total = momentum.reduce((s, m) => s + m.total, 0)

  if (momentum.length === 0 || total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No community signals in this period — the chart fills with the first rating or comment.
      </p>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={momentum} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ratings" name="Ratings" stackId="voice" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="comments" name="Comments" stackId="voice" fill="#10B981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
