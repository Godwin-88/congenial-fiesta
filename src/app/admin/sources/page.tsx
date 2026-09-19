'use client'
// Source Registry — admin control over where device data comes from.
// ============================================================================
// Phone Database §11/§11a: sources are ordered by priority (lower wins), can be
// disabled without deletion, and can be rebound to a different adapter. Health
// columns make it obvious when an external source starts failing. Credentials
// are NEVER edited here — only the NAME of the env var that holds them.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { adapterLabels, adapterNames, sourceTypes, authTypes } from '@/lib/devices/source-config'

interface SourceRow {
  id: number
  slug: string
  name: string
  source_type: string
  base_url: string | null
  api_endpoint: string | null
  auth_type: string
  auth_env_key: string | null
  adapter_name: string | null
  priority: number
  active: boolean
  last_success_at: string | null
  last_failure_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string | null
}

const inputClass =
  'w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none'
const labelClass = 'block text-xs text-gray-500 mb-1'

function healthLabel(row: SourceRow): { text: string; tone: string } {
  if (!row.active) return { text: 'Disabled', tone: 'text-gray-500' }
  if (row.last_error && row.last_failure_at && (!row.last_success_at || row.last_failure_at > row.last_success_at)) {
    return { text: 'Failing', tone: 'text-red-400' }
  }
  if (row.last_success_at) {
    return { text: `OK · ${new Date(row.last_success_at).toLocaleDateString()}`, tone: 'text-green-400' }
  }
  return { text: 'Never queried', tone: 'text-amber-400' }
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    slug: '',
    name: '',
    source_type: 'aggregator',
    base_url: '',
    adapter_name: 'gsmarena',
    priority: 40,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sources')
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Could not load sources.')
        return
      }
      setSources(body.data ?? [])
    } catch {
      setError('Could not load sources.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (id: number, payload: Record<string, unknown>) => {
    setSavingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Save failed.')
        return
      }
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...body.data } : s)))
    } catch {
      setError('Save failed.')
    } finally {
      setSavingId(null)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Remove this source from the registry? Existing devices keep their stored specs.')) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Delete failed.')
        return
      }
      setSources((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Delete failed.')
    } finally {
      setSavingId(null)
    }
  }

  const create = async () => {
    setSavingId(-1)
    setError(null)
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          base_url: draft.base_url || null,
          priority: Number(draft.priority),
          adapter_name: draft.adapter_name || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Could not add source.')
        return
      }
      setSources((prev) => [...prev, body.data].sort((a, b) => a.priority - b.priority))
      setCreating(false)
      setDraft({ slug: '', name: '', source_type: 'aggregator', base_url: '', adapter_name: 'gsmarena', priority: 40 })
    } catch {
      setError('Could not add source.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Data Sources</h1>
          <p className="text-xs text-gray-500 mt-1">
            Priority decides which source wins a conflict — lower runs first. Sources are replaceable: adapters can be
            re-bound or disabled at any time without touching stored device data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm border border-border text-white hover:border-brand-primary"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm bg-brand-primary text-white hover:bg-blue-600"
          >
            <Plus size={14} /> Add source
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {creating && (
        <div className="rounded-lg border-2 border-border bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Slug *</label>
            <input className={inputClass} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="gsmarena" />
          </div>
          <div>
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="GSMArena" />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={draft.source_type} onChange={(e) => setDraft({ ...draft, source_type: e.target.value })}>
              {sourceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Adapter</label>
            <select className={inputClass} value={draft.adapter_name} onChange={(e) => setDraft({ ...draft, adapter_name: e.target.value })}>
              <option value="">— none (stored only) —</option>
              {adapterNames.map((a) => <option key={a} value={a}>{adapterLabels[a] ?? a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Base URL</label>
            <input className={inputClass} value={draft.base_url} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <input type="number" className={inputClass} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={create}
              disabled={savingId === -1 || draft.slug.length < 2 || draft.name.length < 2}
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm bg-brand-primary text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {savingId === -1 ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save source
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {sources.map((row) => {
            const health = healthLabel(row)
            return (
              <div key={row.id} className="rounded-lg border-2 border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{row.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {row.slug} · {row.source_type} · {row.adapter_name ? adapterLabels[row.adapter_name] ?? row.adapter_name : 'no adapter'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] ${health.tone}`}>{health.text}</span>
                    <label className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <input type="checkbox" checked={row.active} onChange={(e) => patch(row.id, { active: e.target.checked })} />
                      Active
                    </label>
                    <button type="button" onClick={() => remove(row.id)} className="text-red-400 hover:text-red-300" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Priority {savingId === row.id ? '· saving…' : ''}</label>
                    <input
                      type="number"
                      className={inputClass}
                      defaultValue={row.priority}
                      onBlur={(e) => {
                        const next = Number(e.target.value)
                        if (next !== row.priority) patch(row.id, { priority: next })
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Adapter</label>
                    <select
                      className={inputClass}
                      value={row.adapter_name ?? ''}
                      onChange={(e) => patch(row.id, { adapter_name: e.target.value || null })}
                    >
                      <option value="">— none (stored only) —</option>
                      {adapterNames.map((a) => <option key={a} value={a}>{adapterLabels[a] ?? a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Auth type</label>
                    <select className={inputClass} value={row.auth_type} onChange={(e) => patch(row.id, { auth_type: e.target.value })}>
                      {authTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {row.last_error && <p className="text-[11px] text-red-400">Last error: {row.last_error}</p>}
              </div>
            )
          })}
          {sources.length === 0 && <p className="text-sm text-gray-500">No sources registered yet.</p>}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Credentials are never stored in the database — a source only records the name of the environment variable that
        holds its key (<code>auth_env_key</code>).
      </p>
    </div>
  )
}
