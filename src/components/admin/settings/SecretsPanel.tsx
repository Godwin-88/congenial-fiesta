'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Eye, EyeOff, RefreshCw, Globe, Lock, AlertTriangle } from 'lucide-react'
import { useAdmin } from '@/context/AdminContext'

interface SecretDefUI {
  service: string
  serviceSlug: string
  key: string
  envVar: string
  category: string
  description: string
  field?: string
  required?: boolean
  hasValue: boolean
  masked: string
  source: 'env' | 'override'
  updatedAt: string | null
  updatedBy: string | null
}

export function SecretsPanel({ notify }: { notify: (m: string, t?: 'success' | 'error') => void }) {
  const { isOwner } = useAdmin()
  const [defs, setDefs] = useState<SecretDefUI[]>([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced?: string[]; failed?: string[] } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/secrets')
      if (res.ok) {
        const json = await res.json()
        setDefs(json.defs ?? [])
      } else {
        notify('Failed to load secrets', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReveal = (envVar: string) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(envVar)) next.delete(envVar); else next.add(envVar)
      return next
    })
  }

  const startEdit = (def: SecretDefUI) => {
    setEditing(`${def.serviceSlug}.${def.key}`)
    setValue('')
  }

  const submit = async (def: SecretDefUI) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/secrets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: def.serviceSlug, key: def.key, value }),
      })
      const json = await res.json()
      if (res.ok) {
        notify(`Saved ${def.serviceSlug}.${def.key}`)
        setEditing(null)
        setValue('')
        await load()
      } else {
        notify(json.error ?? 'Save failed', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const reset = async (def: SecretDefUI) => {
    if (!confirm(`Reset ${def.serviceSlug}.${def.key} to environment value?`)) return
    try {
      const res = await fetch('/api/admin/settings/secrets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: def.serviceSlug, key: def.key }),
      })
      const json = await res.json()
      if (res.ok) {
        notify(`Reset ${def.serviceSlug}.${def.key}`)
        await load()
      } else {
        notify(json.error ?? 'Reset failed', 'error')
      }
    } catch { notify('Network error', 'error') }
  }

  const syncToVercel = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/settings/vercel-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const json = await res.json()
      if (res.ok) {
        setSyncResult({ synced: json.synced ?? [], failed: json.failed ?? [] })
        notify(`Vercel sync complete · ${json.synced?.length ?? 0} synced, ${json.failed?.length ?? 0} failed`)
      } else {
        setSyncResult({ synced: [], failed: [json.error ?? 'Sync failed'] })
        notify(json.error ?? 'Sync failed', 'error')
      }
    } catch { notify('Sync network error', 'error') } finally {
      setSyncing(false)
    }
  }

  if (!isOwner) {
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle size={18} />
        Only the <b>owner</b> role can view or manage credentials. Ask the site owner to promote your role.
      </div>
    )
  }

  const groups = defs.reduce<Record<string, SecretDefUI[]>>((acc, d) => {
    ;(acc[d.service] ??= []).push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Secrets &amp; Keys</h2>
          <p className="text-sm text-muted-foreground">
            Values are <b>encrypted at rest</b> and <b>never shown in full</b>. You can set, rotate, or reset each one.
          </p>
        </div>
        <button
          onClick={syncToVercel}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Globe size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync to Vercel'}
        </button>
      </div>

      {syncResult && (
        <div className="space-y-1 rounded-lg border border-border bg-card p-4 text-xs">
          <div className="font-medium text-emerald-600 dark:text-emerald-400">Synced ({syncResult.synced?.length ?? 0})</div>
          {syncResult.synced && syncResult.synced.length > 0 && <div className="text-muted-foreground">{syncResult.synced.join(', ')}</div>}
          <div className="font-medium text-red-500">Failed ({syncResult.failed?.length ?? 0})</div>
          {syncResult.failed && syncResult.failed.length > 0 && <div className="text-muted-foreground">{syncResult.failed.join(' · ')}</div>}
        </div>
      )}

      {Object.entries(groups).map(([service, items]) => (
        <div key={service} className="rounded-lg border-2 border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <KeyRound size={14} /> {service}
          </h3>
          <div className="space-y-3">
            {items.map((def) => {
              const id = `${def.serviceSlug}.${def.key}`
              const isEditing = editing === id
              const isRevealed = revealed.has(def.envVar)
              return (
                <div key={id} className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{def.envVar}</span>
                        {def.source === 'override' && (
                          <span className="flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
                            <Lock size={9} /> override
                          </span>
                        )}
                        {def.required && <span className="text-[10px] text-muted-foreground">required</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                        {isRevealed ? '••••••••' : def.masked}
                      </span>
                      <button onClick={() => toggleReveal(def.envVar)} title="Show/hide masked value" className="text-muted-foreground hover:text-foreground">
                        {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
{isEditing ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={`New ${def.envVar}`}
                        autoFocus
                        className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none"
                      />
                      <button
                        onClick={() => submit(def)}
                        disabled={saving || !value.trim()}
                        className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-white hover:bg-brand-primary/80 disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => startEdit(def)} className="text-xs font-medium text-brand-primary hover:underline">
                        Set / rotate
                      </button>
                      {def.source === 'override' && (
                        <button onClick={() => reset(def)} className="text-xs text-muted-foreground hover:text-foreground">
                          Reset to env
                        </button>
                      )}
                      {def.updatedAt && <span className="text-[10px] text-muted-foreground">updated {new Date(def.updatedAt).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
      )}
    </div>
  )
}
