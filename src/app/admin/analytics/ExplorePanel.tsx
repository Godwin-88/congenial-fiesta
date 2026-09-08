import Link from 'next/link'
import { Download, BarChart3 } from 'lucide-react'
import { EXPLORE_METRICS, EXPLORE_DIMENSIONS } from '@/lib/analytics/queries'
import type { ExploreResult } from '@/lib/analytics/queries'

interface ExplorePanelProps {
  result: ExploreResult
  metric: string
  dimension: string
  period: string
}

function linkWith(metric: string, dimension: string, period: string): string {
  return `/admin/analytics?tab=explore&metric=${metric}&dimension=${dimension}&period=${period}`
}

const PERIOD_LABELS: Record<string, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' }
const ACTIVE_CLS =
  'px-3 py-1.5 rounded-lg text-sm border border-transparent bg-brand-primary text-primary-foreground'
const IDLE_CLS =
  'px-3 py-1.5 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5'

export default function ExplorePanel({ result, metric, dimension, period }: ExplorePanelProps) {
  return (
    <div className="space-y-5">
      {/* Metric selector */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Metric</p>
        <div className="flex flex-wrap gap-2">
          {EXPLORE_METRICS.map((m) => (
            <Link
              key={m.id}
              href={linkWith(m.id, dimension, period)}
              className={m.id === metric ? ACTIVE_CLS : IDLE_CLS}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Dimension selector */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Breakdown / Dimension</p>
        <div className="flex flex-wrap gap-2">
          {EXPLORE_DIMENSIONS.map((d) => (
            <Link
              key={d.id}
              href={linkWith(metric, d.id, period)}
              className={d.id === dimension ? ACTIVE_CLS : IDLE_CLS}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Period selector */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Period</p>
        <div className="flex flex-wrap gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <Link
              key={p}
              href={linkWith(metric, dimension, p)}
              className={p === period ? ACTIVE_CLS : IDLE_CLS}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-primary" />
            <p className="text-sm font-medium text-foreground">Breakdown</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-bold text-foreground">{result.total.toLocaleString()}</span>
            </p>
            <Link
              href={`/api/admin/export/explore?metric=${metric}&dimension=${dimension}&period=${period}&limit=100`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-border
                         text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Link>
          </div>
        </div>

        {result.rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No data yet for this metric × dimension in the selected period.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <th className="text-left py-2 pr-4 font-medium">Rank</th>
                <th className="text-left py-2 pr-4 font-medium">{dimension.replace('_', ' ')}</th>
                <th className="text-right py-2 pr-4 font-medium">Value</th>
                <th className="text-right py-2 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={r.label} className="border-b border-border last:border-0 hover:bg-foreground/5">
                  <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="truncate max-w-[260px] text-foreground">{r.label}</span>
                      <span className="flex-1">
                        <span
                          className="block h-1.5 rounded-full bg-brand-primary"
                          style={{ width: `${Math.max(r.sharePct, 0.5)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right font-medium text-foreground">{r.value.toLocaleString()}</td>
                  <td className="py-2 text-right text-muted-foreground">{r.sharePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}