'use client'

import { useState, useEffect } from 'react'
import { Send, Repeat, Power, Trash2 } from 'lucide-react'

interface ScheduledExport {
  id: number
  report: string
  period: string
  cadence: string
  destination: string
  recipients: string[]
  enabled: boolean
  lastRunAt: string | null
  lastError: string | null
  createdAt: string
}

interface ApiRes {
  exports?: ScheduledExport[]
  job?: ScheduledExport
  error?: string
}

const REPORTS = [
  'page-views',
  'top-pages',
  'affiliate-clicks',
  'qualified-leads',
  'earnings-reconciliation',
  'link-health',
  'explore',
]
const REPORT_LABELS: Record<string, string> = {
  'page-views': 'Page Views',
  'top-pages': 'Top Pages',
  'affiliate-clicks': 'Affiliate Clicks',
  'qualified-leads': 'Qualified Leads',
  'earnings-reconciliation': 'Earnings Reconciliation',
  'link-health': 'Link Health',
  explore: 'Explore (custom metric×dimension)',
}
const CADENCE_LABELS: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
const PERIOD_LABELS: Record<string, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' }

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ScheduledExportsPanel({ canManage }: { canManage: boolean }) {
  const [jobs, setJobs] = useState<ScheduledExport[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // create form
  const [report, setReport] = useState('top-pages')
  const [period, setPeriod] = useState('30d')
  const [cadence, setCadence] = useState('weekly')
  const [destination, setDestination] = useState('email')
  const [recipients, setRecipients] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/exports', { cache: 'no-store' })
      const data: ApiRes = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setJobs(data.exports ?? [])
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/analytics/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          period,
          cadence,
          destination,
          recipients: recipients.split(',').map((r) => r.trim()).filter(Boolean),
        }),
      })
      const data: ApiRes = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to create')
      setJobs((prev) => [data.job!, ...prev])
      setRecipients('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (job: ScheduledExport) => {
    const res = await fetch(`/api/admin/analytics/exports/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !job.enabled }),
    })
    const data: ApiRes = await res.json()
    if (res.ok && data.job) {
      setJobs((prev) => prev.map((j) => (j.id === data.job!.id ? data.job! : j)))
    }
  }

  const remove = async (job: ScheduledExport) => {
    const res = await fetch(`/api/admin/analytics/exports/${job.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok && data.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    }
  }

  const inputCls = 'w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground'
  const labelCls = 'text-muted-foreground uppercase tracking-wider'

  return (
    <div className="space-y-4">
      {/* Create form */}
      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          Editor/viewer cannot schedule exports. Owner or admin only.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-4 w-4 text-brand-primary" />
            <p className="text-sm font-medium text-foreground">Schedule a new export</p>
          </div>

          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs">
              <span className={labelCls}>Report</span>
              <select value={report} onChange={(e) => setReport(e.target.value)} className={inputCls}>
                {REPORTS.map((r) => (
                  <option key={r} value={r}>{REPORT_LABELS[r]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className={labelCls}>Period</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls}>
                {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className={labelCls}>Cadence</span>
              <select value={cadence} onChange={(e) => setCadence(e.target.value)} className={inputCls}>
                {Object.entries(CADENCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className={labelCls}>Deliver to</span>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls}>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 text-xs mt-3 block">
            <span className={labelCls}>Recipients (comma-separated — blank = ADMIN_EMAIL)</span>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="owner@fweezytech.com, finance@fweezytech.com"
              className={inputCls}
            />
          </label>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                       bg-brand-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> {busy ? 'Scheduling…' : 'Schedule export'}
          </button>
        </div>
      )}
{/* Jobs list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Scheduled jobs</p>
          <button
            type="button"
            onClick={load}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No scheduled exports yet. Create one above to auto-deliver CSVs by email or Slack.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-4 font-medium">Report</th>
                <th className="text-left py-2 font-medium">Cadence</th>
                <th className="text-left py-2 font-medium">Dest.</th>
                <th className="text-left py-2 font-medium">Last run</th>
                <th className="text-right py-2 pr-4 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-0 hover:bg-foreground/5">
                  <td className="py-2 px-4">
                    <div className="text-foreground">{REPORT_LABELS[job.report] ?? job.report}</div>
                    <div className="text-xs text-muted-foreground">
                      {PERIOD_LABELS[job.period] ?? job.period}
                      {job.lastError && <span className="text-red-400 ml-2">⚠ {job.lastError}</span>}
                    </div>
                  </td>
                  <td className="py-2">{CADENCE_LABELS[job.cadence] ?? job.cadence}</td>
                  <td className="py-2">{job.destination}</td>
                  <td className="py-2">
                    <div>{fmtDate(job.lastRunAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.recipients.length > 0 ? job.recipients.join(', ') : 'ADMIN_EMAIL'}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className={'h-2 w-2 rounded-full ' + (job.enabled ? 'bg-emerald-400' : 'bg-muted-foreground/40')} />
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggle(job)}
                            title={job.enabled ? 'Pause' : 'Enable'}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(job)}
                            title="Delete"
                            className="p-1 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
