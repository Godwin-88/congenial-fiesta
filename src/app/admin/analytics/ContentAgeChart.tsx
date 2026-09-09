'use client'

type Props = {
  data: Array<{ label: string; minDays: number | null; maxDays: number | null; views: number; sharePct: number }>
}

const BUCKET_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']

export default function ContentAgeChart({ data }: Props) {
  if (!data.length || data.every((d) => d.views === 0)) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No age data available</p>
  }

  const max = Math.max(...data.map((d) => d.views), 1)

  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{d.label} old</span>
            <span className="text-foreground font-medium">
              {d.views.toLocaleString()} views · {d.sharePct}%
            </span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="flex h-full items-center justify-end rounded-full px-2 text-[10px] font-medium text-white"
              style={{
                width: `${Math.max((d.views / max) * 100, d.views > 0 ? 6 : 0)}%`,
                backgroundColor: BUCKET_COLORS[i % BUCKET_COLORS.length],
              }}
            >
              {d.sharePct > 8 ? `${d.sharePct}%` : ''}
            </div>
          </div>
        </div>
      ))}
      <p className="mt-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">X:</span> bar length = views · % = share of the period&apos;s views on routable content
      </p>
    </div>
  )
}