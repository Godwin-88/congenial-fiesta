'use client'

import { RefreshCw, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import type { HealthProbe } from '@/lib/settings/health'

function statusStyle(status: HealthProbe['status']) {
  switch (status) {
    case 'ok': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'degraded': return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'error': return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
    default: return 'border-muted bg-muted/50 text-muted-foreground'
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  ai: 'AI',
  email: 'Email',
  cdn: 'Media / CDN',
  data: 'Device data',
  video: 'Video',
  search: 'Search',
}

export function IntegrationsPanel({
  probes,
  loading,
  onRefresh,
  onTab,
}: {
  probes: HealthProbe[]
  loading: boolean
  onRefresh: () => void
  onTab: (t: 'overview' | 'integrations' | 'secrets' | 'general' | 'search' | 'logs') => void
}) {
  const grouped = probes.reduce<Record<string, HealthProbe[]>>((acc, p) => {
    ;(acc[p.category] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Live connection status for every external service. Tap <b>Test now</b> to re-probe individually.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Test all
        </button>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-lg border-2 border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABEL[category] ?? category}
          </h3>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.slug} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm ${statusStyle(p.status)}`}>
                <div className="flex items-center gap-2">
                  {p.status === 'ok'
                    ? <CheckCircle2 size={16} />
                    : p.status === 'error' || p.status === 'degraded'
                      ? <XCircle size={16} />
                      : <MinusCircle size={16} />}
                  <span className="font-medium text-foreground">{p.service}</span>
                  {p.counts?.map((c) => (
                    <span key={c.label} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {c.label}: {c.value}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {p.latencyMs != null && <span>{p.latencyMs}ms</span>}
                  <span className="max-w-[280px] truncate text-muted-foreground" title={p.message}>{p.message}</span>
                  {p.configured && (
                    <button
                      onClick={onRefresh}
                      className="rounded border border-current px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100"
                    >
                      Test now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-lg border-2 border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Manage credentials</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          View the masked status of every API key and set / rotate them from the Secrets & Keys console.
        </p>
        <button
          onClick={() => onTab('secrets')}
          className="mt-3 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80"
        >
          Open Secrets & Keys
        </button>
      </div>
    </div>
  )
}