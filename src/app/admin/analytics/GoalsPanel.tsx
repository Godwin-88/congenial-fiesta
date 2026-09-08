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
const KPI_KEYS = Object.keys(KPI_LABELS)

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

const EMPTY_FORM = { name: '', kpi: 'views', operator: 'gt', threshold: '1000', period: '30d', description: '' }

export default function GoalsPanel({
  rules,
  values,
  events,
  canManage,
}: {
  rules: AlertRule[]
  values: Record<string, number>
  events: AlertEvent[]
  canManage: boolean
}) {
  const [alertRules, setAlertRules] = useState(rules)
  const [alertEvents, setAlertEvents] = useState(events)
  const [acking, setAcking] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

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

  const patchRule = async (rule: AlertRule, patch: Record<string, unknown>): Promise<boolean> => {
    setBusyId(rule.id)
    try {
      const res = await fetch(`/api/admin/analytics/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const json = await res.json()
        setAlertRules(alertRules.map((r) => (r.id === rule.id ? json.rule : r)))
        return true
      }
    } catch {
      // ignore
    } finally {
      setBusyId(null)
    }
    return false
  }

  const toggleRule = async (rule: AlertRule) => {
    await patchRule(rule, { enabled: !rule.enabled })
  }

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id)
    setEditValue(String(rule.threshold))
  }

  const saveEdit = async (rule: AlertRule) => {
    const threshold = Number(editValue)
    if (!Number.isFinite(threshold) || threshold < 0) return
    const ok = await patchRule(rule, { threshold })
    if (ok) setEditingId(null)
  }

  const removeRule = async (rule: AlertRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? Its alert history is removed too.`)) return
    setBusyId(rule.id)
    try {
      const res = await fetch(`/api/admin/analytics/rules/${rule.id}`, { method: 'DELETE' })
      if (res.ok) setAlertRules(alertRules.filter((r) => r.id !== rule.id))
    } catch {
      // ignore
    } finally {
      setBusyId(null)
    }
  }

  const createRule = async () => {
    const threshold = Number(form.threshold)
    if (!form.name.trim() || !Number.isFinite(threshold) || threshold < 0) {
      setFormError('Name and a numeric threshold are required.')
      return
    }
    setFormError(null)
    try {
      const res = await fetch('/api/admin/analytics/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          kpi: form.kpi,
          operator: form.operator,
          threshold,
          period: form.period,
          description: form.description,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setAlertRules([...alertRules, json.rule])
        setShowForm(false)
        setForm(EMPTY_FORM)
      } else {
        setFormError('Failed to create rule - check the payload.')
      }
    } catch {
      setFormError('Request failed.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Goal progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {alertRules.map((rule) => {
          const meta = KPI_LABELS[rule.kpi] ?? { label: rule.kpi, kind: 'count' as const }
          const value = values[rule.kpi]
          const status = statusFor(rule, value)
          const editing = editingId === rule.id
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
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-28 rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground"
                    autoFocus
                  />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {value !== undefined ? fmt(value, meta.kind) : '—'}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {rule.operator === 'gt' ? 'target below' : 'target above'} {fmt(rule.threshold, meta.kind)}
                  {pct !== null ? ` · ${pct}% of target` : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{rule.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${rule.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-foreground/10 text-muted-foreground'}`}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {canManage && (
                  <>
                    <button type="button" onClick={() => toggleRule(rule)} disabled={busyId === rule.id}
                      className="text-xs px-2 py-0.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                      {rule.enabled ? 'Pause' : 'Enable'}
                    </button>
                    {!editing ? (
                      <button type="button" onClick={() => startEdit(rule)} disabled={busyId === rule.id}
                        className="text-xs px-2 py-0.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                        Edit
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => void saveEdit(rule)} disabled={busyId === rule.id}
                          className="text-xs px-2 py-0.5 rounded-lg border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 transition-colors">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-0.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                          Cancel
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => void removeRule(rule)} disabled={busyId === rule.id}
                      className="text-xs px-2 py-0.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canManage && (
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          {showForm ? 'Cancel new rule' : '+ New alert rule'}
        </button>
      )}
{/* New rule form */}
      {canManage && showForm && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">New alert rule</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mt-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rule name"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            />
            <select
              value={form.kpi}
              onChange={(e) => setForm({ ...form, kpi: e.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              {KPI_KEYS.map((k) => (
                <option key={k} value={k}>{KPI_LABELS[k].label}</option>
              ))}
            </select>
            <select
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              <option value="gt">above</option>
              <option value="lt">below</option>
            </select>
            <input
              type="number"
              min={0}
              step="any"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              placeholder="Threshold"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            />
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            >
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          {formError && <p className="text-xs text-red-400 mt-2">{formError}</p>}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => void createRule()}
              className="px-3 py-1.5 rounded-lg bg-brand-primary text-primary-foreground text-sm hover:bg-brand-primary/90 transition-colors"
            >
              Create rule
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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