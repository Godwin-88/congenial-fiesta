'use client'

import { useEffect, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'

interface AuditEvent {
  id: string
  kind: 'secret' | 'config'
  target: string
  action: string
  email: string | null
  createdAt: string
}

function actionStyle(action: string) {
  switch (action) {
    case 'set': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'reset': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'delete': return 'bg-red-500/10 text-red-600 dark:text-red-400'
    default: return 'bg-muted text-muted-foreground'
  }
}

export function AuditPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/audit')
      if (res.ok) {
        const json = await res.json()
        setEvents(json.events ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-lg border-2 border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <History size={17} className="text-brand-primary" /> Audit log
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Credential changes (set / reset / delete) and configuration edits, newest first. Retained for the last 50 events.
      </p>

      {events.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No events yet — credential and configuration changes will appear here.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 bg-background/50 px-4 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${actionStyle(e.action)}`}>
                  {e.action}
                </span>
                <code className="truncate font-mono text-xs text-foreground">{e.target}</code>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {e.kind === 'secret' ? 'secret' : 'config'}
                </span>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <div>{e.email ?? '—'}</div>
                <div>{new Date(e.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}