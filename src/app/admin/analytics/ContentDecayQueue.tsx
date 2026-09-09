'use client'

import { RefreshCcw } from 'lucide-react'

type Props = {
  data: Array<{ path: string; views: number; publishedAt: string | null }>
}

export default function ContentDecayQueue({ data }: Props) {
  if (!data.length) {
    return (
      <p className="flex items-center gap-1.5 text-muted-foreground text-center py-8 text-sm">
        <RefreshCcw className="h-3.5 w-3.5" /> No cold content — every published piece earned views this period.
      </p>
    )
  }

  const ageLabel = (publishedAt: string | null) => {
    if (!publishedAt) return '—'
    const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000)
    if (days < 0) return 'just launched'
    if (days < 30) return `${days}d old`
    if (days < 365) return `~${Math.round(days / 30)}mo old`
    return `~${Math.round(days / 365)}yr old`
  }

  return (
    <ul className="space-y-2">
      {data.map((row) => (
        <li
          key={row.path}
          className="rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <a
              href={row.path}
              className="truncate text-left text-brand-primary hover:underline"
            >
              {row.path}
            </a>
            <span className="shrink-0 text-[11px] text-muted-foreground">{ageLabel(row.publishedAt)}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-400">
            {row.views} views in period — refresh or promote this piece
          </p>
        </li>
      ))}
    </ul>
  )
}