'use client'

import { useState } from 'react'
import type { AlertRule, AlertEvent } from '@/lib/analytics/queries'

const KPI_LABELS: Record<string, { label: string; kind: 'count' | 'pct' }> = {
  views: { label: 'Page views', kind: 'count' },
  unique_visitors: { label: 'Unique visitors', kind: 'count' },
  return_rate: { label: 'Return rate', kind: 'pct' },
  device_views: { label: 'Device page views', kind: 'count' },
  affiliate_clicks: { label: 'Affiliate clicks', kind: 'count' },
  device_to_ctr: { label: 'Device to click rate', kind: 'pct' },
  revenue_proxy: { label: 'Est. revenue proxy', kind: 'count' },
  zero_report: { label: 'Revenue-leak views (zero-click devices)', kind: 'count' },
  search_gap: { label: 'Zero-result searches', kind: 'count' },
  consideration_events: { label: 'Consideration events', kind: 'count' },
  trust_coverage: { label: 'Trust coverage', kind: 'pct' },
  hot_leads: { label: 'Hot-tier qualified leads', kind: 'count' },
  broken_links: { label: 'Broken buy links', kind: 'count' },
}

function fmt(value: number, kind: 'count' | 'pct'): string {
  return `${value.toLocaleString()}${kind === 'pct' ? '%' : ''}`
}

function statusFor(rule: AlertRule, value: number | undefined): { label: string; cls: string } {
  if (value === undefined) return { label: 'No data', cls: 'bg-foreground/10 text-muted-foreground' }
  const hit = rule.operator === 'gt' ? value > rule.threshold : value < rule.threshold
  if (hit) return { label: 'Breached', cls: 'bg-red-500/15 text-red-400' }
  const risk = rule.operator === 'gt' ? value >= rule.threshold * 0.8 : value <= rule.threshold * 1.2
  if (risk) return { label: 'At risk', cls: 'bg-amber-500/15 text-amber-400' }
  return { label: 'On track', cls: 'bg-emerald-500/15 text-emerald-400' }
}

export default function GoalsPanel({
  rules,
  values,
  events,
}: {
  rules: AlertRule[]
  values: Record<string, number>
  events: AlertEvent[]
}) {
  const [alertEvents, setAlertEvents] = useState(events)
  const [acking, setAcking] = useState<number | null>(null)

  const acknowledge = async (id: number) => {
    setAcking(id)
    try {
      const res = await fetch('/api/admin/analytics/alerts/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setAlertEvents(alertEvents.map((ev) => (ev.id === id ? { ...ev, acknowledgedAt: new Date().toISOString() } : ev)))
      }
    } catch {
      // offline - leave as open
    } finally {
      setAcking(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Goal progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rules.map((rule) => {
          const meta = KPI_LABELS[rule.kpi] ?? { label: rule.kpi, kind: 'count' as const }
          const value = values[rule.kpi]
          const status = statusFor(rule, value)
          const pct = value !== undefined && rule.threshold !== 0
            ? Math.round((value / rule.threshold) * 100)
            : null
          return (
            <div key={rule.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground line-clamp-2">{rule.name}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.cls}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{meta.label} · {rule.period}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {value !== undefined ? fmt(value, meta.kind) : '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {rule.operator === 'gt' ? 'target below' : 'target above'} {fmt(rule.threshold, meta.kind)}
                  {pct !== null ? ` · ${pct}% of target` : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{rule.description}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70">
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Alert activity log */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-3 pr-4 font-medium">Rule</th>
              <th className="text-left py-3 pr-4 font-medium">Fired</th>
              <th className="text-right py-3 pr-4 font-medium">Current</th>
              <th className="text-right py-3 pr-4 font-medium">Threshold</th>
              <th className="text-left py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {alertEvents.map((ev) => {
              const meta = KPI_LABELS[ev.kpi] ?? { label: ev.kpi, kind: 'count' as const }
              const acknowledged = ev.acknowledgedAt !== null
              return (
                <tr key={ev.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 text-foreground">{ev.ruleName}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(ev.firedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="py-3 pr-4 text-right">{fmt(ev.value, meta.kind)}</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{fmt(ev.threshold, meta.kind)}</td>
                  <td className="py-3">
                    {acknowledged ? (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => acknowledge(ev.id)}
                        disabled={acking === ev.id}
                        className="inline-block text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground
                                   hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {acking === ev.id ? 'Working...' : 'Acknowledge'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {alertEvents.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No alerts fired yet - the daily cron evaluates every enabled rule and emails breaches here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}