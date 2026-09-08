'use client'

import { useState, useEffect } from 'react'
import { Plug, RefreshCw, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AffiliateNetwork {
  id: number
  name: string
  label: string
  baseUrl: string
  authType: 'none' | 'bearer' | 'query' | 'basic'
  authEnvKey: string | null
  authQueryParam: string | null
  mapping: Record<string, string>
  note: string | null
  enabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: 'idle' | 'success' | 'error' | null
  lastSyncError: string | null
}

interface SyncLog {
  id: number
  networkId: number
  status: 'success' | 'error'
  rowsInserted: number
  rowsSkipped: number
  rowsErrors: number
  message: string | null
  startedAt: string
}

const EMPTY_FORM = {
  name: '',
  label: '',
  baseUrl: '',
  authType: 'bearer',
  authEnvKey: '',
  authQueryParam: '',
}

const AUTH_LABELS: Record<string, string> = {
  none: 'None',
  bearer: 'Bearer token',
  query: 'Query param',
  basic: 'Basic',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40'
const fieldCls = 'flex flex-col gap-1'

function StatusBadge({ ok }: { ok: boolean }) {
  const cls = ok
    ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400'
    : 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-400'
  return (
    <span className={cls}>
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {ok ? 'success' : 'error'}
    </span>
  )
}

function AuthBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70">
      <Plug size={11} /> {AUTH_LABELS[type] ?? type}
    </span>
  )
}
function SyncLogTable({ logs, nets }: { logs: SyncLog[]; nets: AffiliateNetwork[] }) {
  const nameOf = (id: number) => nets.find((n) => n.id === id)?.label ?? `#${id}`
  if (logs.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground mb-3">Latest sync runs</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-4 font-medium">Time</th>
              <th className="text-left py-2 pr-4 font-medium">Network</th>
              <th className="text-left py-2 pr-4 font-medium">Status</th>
              <th className="text-right py-2 pr-4 font-medium">Ins</th>
              <th className="text-right py-2 pr-4 font-medium">Dup</th>
              <th className="text-right py-2 font-medium">Err</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{fmtDate(l.startedAt)}</td>
                <td className="py-2 pr-4 text-foreground">{nameOf(l.networkId)}</td>
                <td className="py-2 pr-4"><StatusBadge ok={l.status === 'success'} /></td>
                <td className="py-2 pr-4 text-right">{l.rowsInserted}</td>
                <td className="py-2 pr-4 text-right">{l.rowsSkipped}</td>
                <td className="py-2 text-right">{l.rowsErrors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddForm({ onSave, onCancel, busy }: {
  onSave: (f: typeof EMPTY_FORM) => void
  onCancel: () => void
  busy: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  return (
    <div className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-2 gap-3">
      <div className={fieldCls}>
        <label className="text-xs text-muted-foreground">Name (slug)</label>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="jumia" />
      </div>
      <div className={fieldCls}>
        <label className="text-xs text-muted-foreground">Label</label>
        <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Jumia Marketplace" />
      </div>
      <div className={`${fieldCls} sm:col-span-2`}>
        <label className="text-xs text-muted-foreground">Report endpoint</label>
        <input className={inputCls} value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://partners.example.com/api/earnings" />
      </div>
      <div className={fieldCls}>
        <label className="text-xs text-muted-foreground">Auth</label>
        <select className={inputCls} value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}>
          <option value="bearer">Bearer token</option>
          <option value="basic">Basic auth</option>
          <option value="query">Query param</option>
          <option value="none">None</option>
        </select>
      </div>
      <div className={fieldCls}>
        <label className="text-xs text-muted-foreground">ENV var holding the secret</label>
        <input className={inputCls} value={form.authEnvKey} onChange={(e) => setForm({ ...form, authEnvKey: e.target.value })} placeholder="JUMIA_API_KEY" />
      </div>
      <div className={`${fieldCls} sm:col-span-2`}>
        <label className="text-xs text-muted-foreground">Query param name (if query auth)</label>
        <input className={inputCls} value={form.authQueryParam} onChange={(e) => setForm({ ...form, authQueryParam: e.target.value })} placeholder="access_token" />
      </div>
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="button" onClick={() => onSave(form)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  )
}

function NetworkCard({ net, canManage, busy, onToggle, onSync, onRemove }: {
  net: AffiliateNetwork
  canManage: boolean
  busy: boolean
  onToggle: (n: AffiliateNetwork) => void
  onSync: (n: AffiliateNetwork) => void
  onRemove: (n: AffiliateNetwork) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Plug className="h-4 w-4 text-brand-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{net.label}</p>
            <p className="text-xs text-muted-foreground truncate">{net.baseUrl}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSync(net)}
              disabled={busy || !net.enabled}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5 disabled:opacity-40"
              title="Sync now"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => onToggle(net)}
              className="px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            >
              {net.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={() => onRemove(net)}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <AuthBadge type={net.authType} />
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${net.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-foreground/10 text-muted-foreground'}`}>
          {net.enabled ? 'Enabled' : 'Disabled'}
        </span>
        {net.lastSyncStatus && net.lastSyncStatus !== 'idle' && <StatusBadge ok={net.lastSyncStatus === 'success'} />}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Last sync: {fmtDate(net.lastSyncAt)}
        {net.lastSyncError && <span className="block text-red-400 mt-1">{net.lastSyncError}</span>}
      </p>
    </div>
  )
}
export default function AffiliateNetworksPanel({ canManage }: { canManage: boolean }) {
  const [nets, setNets] = useState<AffiliateNetwork[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/analytics/networks', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setNets(data.networks ?? [])
  }

  const loadLogs = async () => {
    const res = await fetch('/api/admin/analytics/networks/logs', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setLogs(data.logs ?? [])
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = async (f: typeof EMPTY_FORM) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/analytics/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name.trim(),
          label: f.label.trim(),
          baseUrl: f.baseUrl.trim(),
          authType: f.authType,
          authEnvKey: f.authEnvKey.trim() || null,
          authQueryParam: f.authQueryParam.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to create')
      await load()
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (net: AffiliateNetwork) => {
    const res = await fetch(`/api/admin/analytics/networks/${net.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !net.enabled }),
    })
    const data = await res.json()
    if (res.ok && data.network) {
      setNets((prev) => prev.map((n) => (n.id === data.network.id ? data.network : n)))
    } else {
      setError(data.error ?? 'Toggle failed')
    }
  }

  const runSync = async (net: AffiliateNetwork) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/networks/${net.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      await load()
      await loadLogs()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (net: AffiliateNetwork) => {
    if (!confirm(`Delete the "${net.label}" connector?`)) return
    const res = await fetch(`/api/admin/analytics/networks/${net.id}`, { method: 'DELETE' })
    setError(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Delete failed')
    }
    await load()
  }

  return (
    <div className="space-y-4">
      <SyncLogTable logs={logs} nets={nets} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Configure affiliate-network APIs for zero-touch earnings sync. Secrets live in env vars only.
        </p>
        {canManage && (
          <Button type="button" onClick={() => setShowForm((s) => !s)} className="whitespace-nowrap">
            <Plus size={16} className="mr-1" /> {showForm ? 'Close' : 'Add network'}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {showForm && canManage && (
        <AddForm onSave={create} onCancel={() => setShowForm(false)} busy={busy} />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading connectors…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {nets.map((net) => (
            <NetworkCard
              key={net.id}
              net={net}
              canManage={canManage}
              busy={busy}
              onToggle={toggle}
              onSync={runSync}
              onRemove={remove}
            />
          ))}
          {nets.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No connectors configured yet.</p>
          )}
        </div>
      )}
    </div>
  )
}