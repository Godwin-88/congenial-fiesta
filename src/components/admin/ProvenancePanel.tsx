'use client'
// Provenance & Verification Panel — where did this device's data come from?
// ============================================================================
// Phone Database §17/§18/§24/§25. Shows, per field, which source supplied the
// value, when it was retrieved, whether an administrator locked it as a manual
// override, and the complete change history. The admin can verify a field or
// flag it as a conflict; either action is itself recorded in the audit trail.

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Flag, Loader2, RefreshCw } from 'lucide-react'
import { humanizePath } from '@/components/admin/SpecImportPanel'

interface ProvenanceRow {
  id: number
  field_path: string
  source_id: number | null
  source_label: string | null
  source_url: string | null
  imported_value: unknown
  current_value: unknown
  verification_status: 'pending' | 'verified' | 'conflict' | 'rejected'
  manual_override: boolean
  retrieved_at: string | null
}

interface RawRow {
  id: number
  source_id: number | null
  external_id: string | null
  source_url: string | null
  retrieved_at: string | null
}

interface ChangeRow {
  id: number
  field_path: string
  old_value: unknown
  new_value: unknown
  changed_by: string | null
  reason: string | null
  created_at: string
}

interface ImportRunRow {
  id: number
  run_name: string
  status: string
  started_at: string
  completed_at: string | null
  fields_imported: number
  fields_missing: number
  conflicts_detected: number
  duplicates_detected: number
  error_message: string | null
}

interface Response {
  provenance: ProvenanceRow[]
  rawSources: RawRow[]
  importRuns: ImportRunRow[]
  changes: ChangeRow[]
  counts: {
    fieldsTracked: number
    manualOverrides: number
    conflicts: number
    rawPayloads: number
    changesRecorded: number
  }
}

export function formatValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const STATUS_TONES: Record<string, string> = {
  pending: 'text-amber-400',
  verified: 'text-green-400',
  conflict: 'text-red-400',
  rejected: 'text-gray-500',
}

type UpdateFn = (
  fieldPath: string,
  payload: { verification_status?: string; manual_override?: boolean },
) => void

// ─ Field-level provenance table (§17) ───────────────────────────────────────

function ProvenanceTable({
  rows,
  busyPath,
  onUpdate,
}: {
  rows: ProvenanceRow[]
  busyPath: string | null
  onUpdate: UpdateFn
}) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted text-gray-500">
          <tr>
            <th className="text-left px-2 py-1.5 font-medium">Field</th>
            <th className="text-left px-2 py-1.5 font-medium">Source</th>
            <th className="text-left px-2 py-1.5 font-medium">Stored value</th>
            <th className="text-left px-2 py-1.5 font-medium">Status</th>
            <th className="text-left px-2 py-1.5 font-medium">Retrieved</th>
            <th className="text-left px-2 py-1.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-2 py-1.5 text-gray-300">{humanizePath(r.field_path)}</td>
              <td className="px-2 py-1.5">
                {r.source_url ? (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:underline"
                  >
                    {r.source_label ?? 'source'}
                  </a>
                ) : (
                  <span className="text-gray-500">{r.source_label ?? '—'}</span>
                )}
                {r.manual_override && (
                  <span className="ml-1 rounded bg-amber-500/20 px-1 text-[10px] text-amber-300">locked</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-white max-w-[220px] truncate" title={formatValue(r.current_value)}>
                {formatValue(r.current_value)}
              </td>
              <td className={`px-2 py-1.5 ${STATUS_TONES[r.verification_status] ?? 'text-gray-400'}`}>
                {r.verification_status}
              </td>
              <td className="px-2 py-1.5 text-gray-500">
                {r.retrieved_at ? new Date(r.retrieved_at).toLocaleDateString() : '—'}
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-2">
                  {busyPath === r.field_path && <Loader2 size={11} className="animate-spin text-gray-500" />}
                  {r.verification_status !== 'verified' && (
                    <button
                      type="button"
                      title="Mark this field verified"
                      onClick={() => onUpdate(r.field_path, { verification_status: 'verified' })}
                      className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                    >
                      <CheckCircle2 size={12} /> Verify
                    </button>
                  )}
                  {r.verification_status !== 'conflict' && (
                    <button
                      type="button"
                      title="Flag this field as a conflict"
                      onClick={() => onUpdate(r.field_path, { verification_status: 'conflict' })}
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300"
                    >
                      <Flag size={12} /> Flag
                    </button>
                  )}
                  <button
                    type="button"
                    title={
                      r.manual_override
                        ? 'Unlock — automated imports may update this field again'
                        : 'Lock — automated imports must never overwrite this field'
                    }
                    onClick={() => onUpdate(r.field_path, { manual_override: !r.manual_override })}
                    className="text-gray-400 hover:text-white"
                  >
                    {r.manual_override ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ProvenancePanel({ deviceId }: { deviceId: number }) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyPath, setBusyPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}/provenance`)
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Could not load provenance.')
        return
      }
      setData(body)
    } catch {
      setError('Could not load provenance.')
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  useEffect(() => {
    if (deviceId) void load()
  }, [deviceId, load])

  const update = useCallback(
    async (fieldPath: string, payload: { verification_status?: string; manual_override?: boolean }) => {
      setBusyPath(fieldPath)
      setError(null)
      try {
        const res = await fetch(`/api/admin/devices/${deviceId}/provenance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field_path: fieldPath, ...payload }),
        })
        const body = await res.json()
        if (!res.ok) {
          setError(body.error ?? 'Update failed.')
          return
        }
        await load()
      } catch {
        setError('Update failed.')
      } finally {
        setBusyPath(null)
      }
    },
    [deviceId, load],
  )

  if (loading && !data) {
    return (
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin" /> Loading provenance…
      </p>
    )
  }

  if (!data) {
    return <p className="text-xs text-red-400">{error ?? 'No provenance data.'}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 border border-border hover:border-brand-primary disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
        <span>{data.counts.fieldsTracked} fields tracked</span>
        <span className={data.counts.manualOverrides ? 'text-white' : ''}>
          {data.counts.manualOverrides} manual override{data.counts.manualOverrides === 1 ? '' : 's'}
        </span>
        <span className={data.counts.conflicts ? 'text-red-400' : ''}>
          {data.counts.conflicts} conflict{data.counts.conflicts === 1 ? '' : 's'}
        </span>
        <span>{data.counts.rawPayloads} raw payloads</span>
        <span>{data.counts.changesRecorded} recorded changes</span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {data.provenance.length === 0 ? (
        <p className="text-xs text-gray-500">
          No field-level provenance yet. Values are recorded here when an import runs or an administrator
          edits a tracked field.
        </p>
      ) : (
        <ProvenanceTable rows={data.provenance} busyPath={busyPath} onUpdate={update} />
      )}

      <ImportRuns runs={data.importRuns} />
      <RawPayloads rows={data.rawSources} />
      <ChangeHistory changes={data.changes} />
    </div>
  )
}

// ── Import runs (§24) ────────────────────────────────────────────────────────

function ImportRuns({ runs }: { runs: ImportRunRow[] }) {
  if (runs.length === 0) return null
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-400">Import runs ({runs.length})</summary>
      <div className="mt-2 space-y-1">
        {runs.map((r) => (
          <div key={r.id} className="rounded bg-muted px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white">{r.run_name}</span>
              <span
                className={
                  r.status === 'success'
                    ? 'text-green-400'
                    : r.status === 'error'
                      ? 'text-red-400'
                      : 'text-amber-400'
                }
              >
                {r.status}
              </span>
              <span className="text-gray-500">{new Date(r.started_at).toLocaleString()}</span>
            </div>
            <p className="text-gray-500">
              {r.fields_imported} imported · {r.fields_missing} missing · {r.conflicts_detected} conflicts ·{' '}
              {r.duplicates_detected} duplicate warnings
            </p>
            {r.error_message && <p className="text-red-400">{r.error_message}</p>}
          </div>
        ))}
      </div>
    </details>
  )
}

// ── Raw payloads (§18) ───────────────────────────────────────────────────────

function RawPayloads({ rows }: { rows: RawRow[] }) {
  if (rows.length === 0) return null
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-400">Raw source payloads ({rows.length})</summary>
      <div className="mt-2 space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="rounded bg-muted px-2 py-1.5 flex flex-wrap items-center gap-2">
            <span className="text-gray-500">#{r.id}</span>
            {r.source_url ? (
              <a
                href={r.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:underline truncate max-w-[320px]"
              >
                {r.source_url}
              </a>
            ) : (
              <span className="text-gray-500">no URL</span>
            )}
            {r.external_id && <span className="text-gray-500">id {r.external_id}</span>}
            <span className="text-gray-500">
              {r.retrieved_at ? new Date(r.retrieved_at).toLocaleString() : '—'}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-gray-500">
        Raw payloads are preserved verbatim so any stored value can be re-checked against its origin.
      </p>
    </details>
  )
}

// ── Change history (§25) ─────────────────────────────────────────────────────

function ChangeHistory({ changes }: { changes: ChangeRow[] }) {
  if (changes.length === 0) return null
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-400">Change history ({changes.length})</summary>
      <div className="mt-2 space-y-1">
        {changes.map((c) => (
          <div key={c.id} className="rounded bg-muted px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2 text-gray-500">
              <span className="text-gray-300">{humanizePath(c.field_path)}</span>
              <span>{new Date(c.created_at).toLocaleString()}</span>
              <span>by {c.changed_by ?? 'system'}</span>
            </div>
            <p className="text-gray-400 truncate">
              <span className="line-through text-gray-600">{formatValue(c.old_value)}</span>
              {' → '}
              <span className="text-white">{formatValue(c.new_value)}</span>
            </p>
            {c.reason && <p className="text-gray-500">{c.reason}</p>}
          </div>
        ))}
      </div>
    </details>
  )
}