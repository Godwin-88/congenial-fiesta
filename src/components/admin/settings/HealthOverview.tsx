'use client'

import { RefreshCw, CheckCircle2, XCircle, MinusCircle, Activity } from 'lucide-react'
import type { HealthProbe } from '@/lib/settings/health'

function statusStyle(status: HealthProbe['status']) {
  switch (status) {
    case 'ok': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'degraded': return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'error': return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
    default: return 'border-muted bg-muted/50 text-muted-foreground'
  }
}

function StatusIcon({ status }: { status: HealthProbe['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={14} />
  if (status === 'error' || status === 'degraded') return <XCircle size={14} />
  return <MinusCircle size={14} />
}

export function HealthOverview({
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
  const ok = probes.filter(p => p.status === 'ok').length
  const notConfigured = probes.filter(p => p.status === 'not-configured').length
  const unhealthy = probes.length - ok - notConfigured
  const total = probes.length

  return (
    <div className="space-y-6">
      {/* Scorecard */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border-2 border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity size={15} className="text-brand-primary" />
            Healthy
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{ok}</div>
          <div className="text-xs text-muted-foreground">of {total} services</div>
        </div>
        <div className="rounded-lg border-2 border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle size={15} className="text-red-500" />
            Needing attention
          </div>
          <div className="mt-2 text-3xl font-bold text-red-500">{unhealthy}</div>
          <div className="text-xs text-muted-foreground">errors or degraded</div>
        </div>
        <div className="rounded-lg border-2 border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MinusCircle size={15} className="text-muted-foreground" />
            Not configured
          </div>
          <div className="mt-2 text-3xl font-bold text-muted-foreground">{notConfigured}</div>
          <div className="text-xs text-muted-foreground">optional services</div>
        </div>
      </div>

      {/* Top service list */}
      <div className="rounded-lg border-2 border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Service health</h2>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {probes.map((p) => (
            <div key={p.slug} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${statusStyle(p.status)}`}>
              <span className="font-medium">{p.service}</span>
              <div className="flex items-center gap-2 text-xs">
                {p.latencyMs != null && <span>{p.latencyMs}ms</span>}
                <StatusIcon status={p.status} />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onTab('integrations')}
          className="mt-4 text-xs font-medium text-brand-primary hover:underline"
        >
          View full integration details →
        </button>
      </div>
    </div>
  )
}