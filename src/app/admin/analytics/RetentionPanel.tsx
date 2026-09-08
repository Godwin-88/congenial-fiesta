'use client'

import { useState } from 'react'
import type { RetentionTableStatus, RetentionLogRow, PurgeResult } from '@/lib/analytics/queries'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtCount(n: number): string {
  return n.toLocaleString()
}

export default function RetentionPanel({
  status,
  log,
  canManage,
}: {
  status: RetentionTableStatus[]
  log: RetentionLogRow[]
  canManage: boolean
}) {
  const [rows, setRows] = useState(status)
  const [audit, setAudit] = useState(log)
  const [busy, setBusy] = useState<'preview' | 'purge' | 'expunge' | null>(null)
  const [preview, setPreview] = useState<PurgeResult | null>(null)
  const [result, setResult] = useState<PurgeResult | null>(null)
  const [fpId, setFpId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/admin/analytics/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      return await res.json()
    } catch {
      return { error: 'Request failed' }
    }
  }

  const refreshStatus = async () => {
    const data = await call('status')
    if (!data.error && Array.isArray(data.status)) {
      setRows(data.status)
      setAudit(data.log ?? audit)
    }
  }

  const runPreview = async () => {
    setBusy('preview'); setError(null); setPreview(null)
    const data = await call('preview')
    setBusy(null)
    if (data.error) return setError(data.error)
    setPreview(data.preview)
  }

  const runPurge = async () => {
    if (!window.confirm('Purge expired raw events for good? This is audited but irreversible.')) return
    setBusy('purge'); setError(null); setResult(null)
    const data = await call('purge')
    setBusy(null)
    if (data.error) return setError(data.error)
    setResult(data.result)
    await refreshStatus()
  }

  const runExpunge = async () => {
    const id = fpId.trim()
    if (!id) return
    if (!window.confirm('Delete ALL analytics rows bound to this visitor id? This satisfies a DPA erase request.')) return
    setBusy('expunge'); setError(null); setResult(null)
    const data = await call('expunge', { fpId: id })
    setBusy(null)
    if (data.error) return setError(data.error)
    setResult(data.result)
    setFpId('')
    await refreshStatus()
  }

  return (
    <div className="space-y-4">
      {/* Per-table TTL audit */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-3 pr-4 font-medium">Raw store</th>
              <th className="text-right py-3 pr-4 font-medium">Rows</th>
              <th className="text-left py-3 pr-4 font-medium">Oldest</th>
              <th className="text-right py-3 pr-4 font-medium">Purgable</th>
              <th className="text-right py-3 pr-4 font-medium">TTL</th>
              <th className="text-left py-3 font-medium">Policy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.table} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-mono text-foreground">{row.table}</td>
                <td className="py-3 pr-4 text-right">{fmtCount(row.rows)}</td>
                <td className="py-3 pr-4 text-muted-foreground">{fmtDate(row.oldestAt)}</td>
                <td className="py-3 pr-4 text-right">
                  {row.purgable > 0
                    ? <span className="text-amber-400">{fmtCount(row.purgable)}</span>
                    : <span className="text-muted-foreground">0</span>}
                </td>
                <td className="py-3 pr-4 text-right text-muted-foreground">{row.retentionDays}d</td>
                <td className="py-3">
                  {row.enabled ? (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Active</span>
                  ) : (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">Paused</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls (owner/admin only) */}
      {canManage && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Retention controls</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button
              type="button"
              onClick={runPreview}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              {busy === 'preview' ? 'Previewing...' : 'Preview purge'}
            </button>
            <button
              type="button"
              onClick={runPurge}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              {busy === 'purge' ? 'Purging...' : 'Run TTL purge'}
            </button>
          </div>

          <div className="flex gap-3 mt-4 items-center">
            <input
              type="text"
              value={fpId}
              onChange={(e) => setFpId(e.target.value)}
              placeholder="Visitor fp_id to expunge (DPA erase)"
              className="flex-1 min-w-0 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => void runExpunge()}
              disabled={busy !== null || fpId.trim().length === 0}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
            >
              {busy === 'expunge' ? 'Expunging...' : 'Expunge visitor'}
            </button>
          </div>

          {preview && (
            <p className="text-xs text-muted-foreground mt-3">
              Preview: {preview.total.toLocaleString()} row(s) would be purged across {preview.purged.length} table(s).
            </p>
          )}
          {result && (
            <p className="text-xs text-muted-foreground mt-3">
              Done: {result.total.toLocaleString()} row(s) affected
              {result.purged.length > 0
                ? ` across ${result.purged.map((p) => `${p.table} (${p.rows.toLocaleString()})`).join(', ')}`
                : ''}.
              Audit appended to the log below.
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      )}

      {/* Audit log */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-3 pr-4 font-medium">When</th>
              <th className="text-left py-3 pr-4 font-medium">Action</th>
              <th className="text-left py-3 pr-4 font-medium">Table</th>
              <th className="text-right py-3 pr-4 font-medium">Rows</th>
              <th className="text-left py-3 pr-4 font-medium">Triggered by</th>
              <th className="text-left py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 text-muted-foreground">{fmtDate(entry.createdAt)}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${entry.action === 'expunge' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-foreground">{entry.table ?? '—'}</td>
                <td className="py-3 pr-4 text-right">{fmtCount(entry.rows)}</td>
                <td className="py-3 pr-4 font-mono text-muted-foreground">{entry.triggeredBy}</td>
                <td className="py-3 text-muted-foreground">{entry.note ?? ''}</td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No purge / expunge runs yet — actions are audited here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}