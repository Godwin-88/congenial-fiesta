'use client'
// Spec Import Panel — the admin-facing half of the phone-database agent.
// ============================================================================
// Wraps the three agent steps (search → fetch specs → apply) in one review
// surface. Everything stays *staged*: the admin either applies the result to
// the open form, or saves it as a DRAFT device. Nothing is ever published here
// (Phone Database §13, §24).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, TriangleAlert, CheckCircle2 } from 'lucide-react'
import type { DevicePrefill } from '@/lib/chat/prefill-schemas'
import { specsToDevicePrefill } from '@/lib/devices/form-mapping'
import type {
  ExtractionDiagnostics,
  ImportPreview,
  SourceMatch,
  SourceSearchResult,
  SpecSnapshot,
} from '@/lib/devices/import-agent'

type Resolution = { path: string; sourceSlug: string; value: unknown }

interface Props {
  /** When set, fetched specs are compared against this device's stored values. */
  existingDeviceId?: number | null
  defaultQuery?: string
  /** Apply the reviewed result to the open form (create/edit pages). */
  onApplyToForm: (prefill: DevicePrefill, preview: ImportPreview) => void
  /** Called when the admin chooses "save as draft device" instead. */
  onCreated?: (deviceId: number) => void
  /**
   * A YouTube-sourced device snapshot (from the "Import from YouTube" handoff).
   * Merged with the adapter sources on fetch, lowest priority — the YouTube
   * review supplies the NAME and only what the video stated; authoritative
   * sources win factual conflicts.
   */
  youtubeSnapshot?: SpecSnapshot | null
}

const inputClass =
  'w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none'
const buttonClass =
  'inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'

function formatValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  return JSON.stringify(value)
}

/** 'specs_display.peak_brightness_nits' → 'Display · peak brightness nits' */
export function humanizePath(path: string): string {
  const [section, ...rest] = path.split('.')
  const sectionLabel = section.replace(/^specs_/, '').replace(/_/g, ' ')
  return `${sectionLabel.charAt(0).toUpperCase()}${sectionLabel.slice(1)} · ${rest.join('.').replace(/_/g, ' ')}`
}

export default function SpecImportPanel({
  existingDeviceId = null,
  defaultQuery = '',
  onApplyToForm,
  onCreated,
  youtubeSnapshot = null,
}: Props) {
  const [query, setQuery] = useState(defaultQuery)
  const [searching, setSearching] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sources, setSources] = useState<SourceSearchResult[]>([])
  const [selected, setSelected] = useState<Record<string, SourceMatch>>({})
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [sourceErrors, setSourceErrors] = useState<Array<{ sourceSlug: string; error: string }>>([])
  /** Why a pasted sheet produced nothing usable — never a silent "0 fields". */
  const [diagnostics, setDiagnostics] = useState<ExtractionDiagnostics | null>(null)
  /** path → chosen source slug (defaults to the merged winner). */
  const [choices, setChoices] = useState<Record<string, string>>({})

  // The device name can arrive AFTER this panel mounts (e.g. the "Import from
  // YouTube" handoff stages it into the form), so keep the search box in step
  // with `defaultQuery` unless the admin has typed a query of their own. The
  // query doubles as the label for a pasted spec sheet, which is what gives a
  // paste-only import a sensible device name.
  const prevDefaultRef = useRef(defaultQuery)
  useEffect(() => {
    if (defaultQuery === prevDefaultRef.current) return
    setQuery((current) =>
      current.trim() === '' || current === prevDefaultRef.current ? defaultQuery : current,
    )
    prevDefaultRef.current = defaultQuery
  }, [defaultQuery])

  const selections = useMemo(() => Object.values(selected), [selected])

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) {
      setError('Enter at least 2 characters.')
      return
    }
    setSearching(true)
    setError(null)
    setNotice(null)
    setPreview(null)
    try {
      const res = await fetch('/api/admin/devices/import/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Search failed')
        return
      }
      setSources(data.sources ?? [])
      setSelected({})
      if (Number(data.total ?? 0) === 0) {
        setNotice('No matches on any active source. Try a shorter query, or paste manufacturer specs below.')
      }
    } catch {
      setError('Search failed — check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }, [query])

  const fetchSpecs = useCallback(async () => {
    if (selections.length === 0 && !pasteText.trim() && !youtubeSnapshot) {
      setError('Select at least one match, paste manufacturer specifications, or keep the YouTube device to merge.')
      return
    }
    setFetching(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/devices/import/specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections,
          manufacturerText: pasteText.trim() || undefined,
          existingDeviceId,
          // The YouTube handoff snapshot travels along so the merge shows the
          // true multi-source pipeline (YouTube + spec-sheet sources together).
          youtubeSnapshot: youtubeSnapshot ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not retrieve specifications.')
        return
      }
      const p: ImportPreview = data.preview
      setPreview(p)
      setSourceErrors(data.errors ?? [])
      setDiagnostics(data.extractionDiagnostics ?? null)
      // Default every choice to the merged winner so the admin only has to act
      // on genuine disagreements.
      const defaults: Record<string, string> = {}
      for (const [path, m] of Object.entries(p.merged ?? {})) defaults[path] = m.sourceSlug
      setChoices(defaults)
      if (data.message) setNotice(data.message)
    } catch {
      setError('Fetch failed — the source may be slow or unreachable.')
    } finally {
      setFetching(false)
    }
  }, [selections, pasteText, existingDeviceId, youtubeSnapshot])

  const resolutions = useMemo<Resolution[]>(() => {
    if (!preview) return []
    const out: Resolution[] = []
    for (const conflict of preview.conflicts) {
      const chosen = choices[conflict.path]
      const entry = conflict.values.find((v) => v.sourceSlug === chosen)
      if (entry) out.push({ path: conflict.path, sourceSlug: entry.sourceSlug, value: entry.value })
    }
    return out
  }, [preview, choices])

  /** Rebuild a preview whose conflicts carry the admin's decisions. */
  const resolvedPreview = useCallback((): ImportPreview | null => {
    if (!preview) return null
    const merged = { ...preview.merged }
    const resolvedPaths = new Set<string>()
    for (const r of resolutions) {
      merged[r.path] = { value: r.value, sourceSlug: r.sourceSlug }
      resolvedPaths.add(r.path)
    }
    return {
      ...preview,
      merged,
      conflicts: preview.conflicts.filter((c) => !resolvedPaths.has(c.path)),
    }
  }, [preview, resolutions])

  const applyToForm = useCallback(() => {
    const p = resolvedPreview()
    if (!p) return
    const prefill = specsToDevicePrefill({ identity: p.identity, specs: p.specs })
    // Preserve the YouTube handoff context through the merge: the staged form
    // already carries the related video id, major category and price tier, and
    // the snapshot merge must not drop them.
    if (youtubeSnapshot) {
      const yt = youtubeSnapshot
      const ytVideoId = typeof yt.match.externalId === 'string' && /^[a-zA-Z0-9_-]{6,}$/.test(yt.match.externalId)
        ? yt.match.externalId
        : null
      if (ytVideoId && !prefill.relatedVideoId) prefill.relatedVideoId = ytVideoId
    }
    onApplyToForm(prefill, p)
    setNotice('Specifications staged in the form below — review, then save.')
  }, [resolvedPreview, onApplyToForm, youtubeSnapshot])

  const createDraft = useCallback(async () => {
    const p = resolvedPreview()
    if (!p) return
    setApplying(true)
    setError(null)
    try {
      // Carry the YouTube video identity into the draft: the import agent
      // names the device from the snapshot identity (never invented), and the
      // apply route resolves the live major category from name + raw text.
      const primaryYoutube = p.snapshots.find((s) => s.match.sourceSlug === 'youtube')
      const res = await fetch('/api/admin/devices/import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: p,
          resolutions: Object.fromEntries(resolutions.map((r) => [r.path, r.value])),
          existingDeviceId,
          relatedVideoId: primaryYoutube && /^[a-zA-Z0-9_-]{6,}$/.test(primaryYoutube.match.externalId)
            ? primaryYoutube.match.externalId
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Apply failed')
        return
      }
      setNotice(data.message ?? 'Saved.')
      if (onCreated && data.deviceId) onCreated(data.deviceId)
    } catch {
      setError('Apply failed — try again.')
    } finally {
      setApplying(false)
    }
  }, [resolvedPreview, resolutions, existingDeviceId, onCreated])

  const toggleMatch = useCallback((match: SourceMatch) => {
    setSelected((prev) => {
      const next = { ...prev }
      // One selection per source — a source can only speak once.
      if (next[match.sourceSlug]?.externalId === match.externalId) delete next[match.sourceSlug]
      else next[match.sourceSlug] = match
      return next
    })
  }, [])

  const noDuplicateWarning = preview && preview.duplicates.length === 0

  return (
    <div className="space-y-4">
      {/* YouTube handoff — merged into every fetch as a low-priority snapshot */}
      {youtubeSnapshot && (
        <div className="rounded border border-brand-primary/40 bg-brand-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white">
              {youtubeSnapshot.identity.name}
              {youtubeSnapshot.identity.releaseYear ? (
                <span className="text-gray-400"> · {youtubeSnapshot.identity.releaseYear}</span>
              ) : null}
            </span>
            <span className="text-[11px] text-gray-500">YouTube review · merged on fetch</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {youtubeSnapshot.providedPaths.length > 0
              ? `Supplies the name + ${youtubeSnapshot.providedPaths.length} field${youtubeSnapshot.providedPaths.length === 1 ? '' : 's'} from the video. Spec-sheet sources win conflicts.`
              : 'Supplies the device name. Select matches below and the agent will supplement the specs.'}
          </p>
        </div>
      )}

      {/* Step 1 — search */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Search a device across all active sources</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder='e.g. "Samsung Galaxy S25 Ultra"'
            className={inputClass}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className={`${buttonClass} bg-brand-primary text-white hover:bg-blue-600 shrink-0`}
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
      </div>

      {/* Step 2 — pick the right match per source */}
      {sources.length > 0 && (
        <div className="space-y-3">
          {sources.map((src) => (
            <div key={src.sourceSlug} className="rounded border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">{src.sourceLabel}</span>
                {src.error ? (
                  <span className="text-[11px] text-amber-400">{src.error}</span>
                ) : (
                  <span className="text-[11px] text-gray-500">
                    {src.matches.length} match{src.matches.length === 1 ? '' : 'es'} · {src.durationMs}ms
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {src.matches.map((m) => {
                  const active = selected[src.sourceSlug]?.externalId === m.externalId
                  return (
                    <button
                      key={`${src.sourceSlug}-${m.externalId}`}
                      type="button"
                      onClick={() => toggleMatch(m)}
                      className={`w-full text-left rounded px-2 py-1.5 text-xs border transition-colors ${
                        active
                          ? 'border-brand-primary bg-brand-primary/10 text-white'
                          : 'border-transparent bg-muted text-gray-300 hover:border-border'
                      }`}
                    >
                      <span className="font-medium">{m.name}</span>
                      {m.releaseYear ? <span className="text-gray-500"> · {m.releaseYear}</span> : null}
                      {m.modelNumber ? <span className="text-gray-500"> · {m.modelNumber}</span> : null}
                      {m.variantLabel ? <span className="text-gray-500"> · {m.variantLabel}</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manufacturer paste — highest-authority source (§10d) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Or paste manufacturer specifications (highest authority)
        </label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={4}
          placeholder="Paste the spec sheet text from the manufacturer's page…"
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="button"
        onClick={fetchSpecs}
        disabled={fetching || (selections.length === 0 && !pasteText.trim() && !youtubeSnapshot)}
        className={`${buttonClass} bg-muted text-white border border-border hover:border-brand-primary`}
      >
        {fetching ? <Loader2 size={14} className="animate-spin" /> : null}
        Fetch &amp; compare specifications
      </button>

      {error && (
        <p className="flex items-start gap-2 text-xs text-red-400">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-start gap-2 text-xs text-emerald-400">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      )}
      {sourceErrors.length > 0 && (
        <p className="text-[11px] text-amber-400">
          Source issues: {sourceErrors.map((e) => `${e.sourceSlug} (${e.error})`).join(', ')}
        </p>
      )}

      {/* Extraction diagnostics — a pasted sheet that yields nothing must say
          WHY (no key / circuit open / every section dropped), otherwise
          "0 fields" reads as "the sheet was empty", which is a different and
          much rarer situation. */}
      {diagnostics?.attempted && diagnostics.failureReason && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 space-y-1">
          <p className="flex items-start gap-2 text-[11px] text-amber-300 font-medium">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            Pasted-sheet extraction did not produce usable fields
          </p>
          {diagnostics.message && <p className="text-[11px] text-gray-300">{diagnostics.message}</p>}
          {diagnostics.droppedSections.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Empty sections: {diagnostics.droppedSections.map((s) => s.replace(/^specs_/, '')).join(', ')}
            </p>
          )}
          {diagnostics.rejectedSections.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Rejected by the schema: {diagnostics.rejectedSections.map((s) => s.replace(/^specs_/, '')).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Step 3 — review: identity, coverage, duplicates, conflicts */}
      {preview && (
        <div className="rounded border border-border p-3 space-y-3">
          <div>
            <p className="text-xs text-white font-medium">{preview.identity.name}</p>
            <p className="text-[11px] text-gray-500">
              {[preview.identity.brand, preview.identity.releaseYear, preview.identity.modelNumber, preview.identity.variantLabel]
                .filter(Boolean)
                .join(' · ') || 'No identity details provided'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-muted py-2">
              <p className="text-sm text-white">{preview.fieldsImported}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Fields found</p>
            </div>
            <div className="rounded bg-muted py-2">
              <p className="text-sm text-white">{preview.fieldsMissing}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Still missing</p>
            </div>
            <div className="rounded bg-muted py-2">
              <p className={`text-sm ${preview.conflicts.length ? 'text-amber-400' : 'text-white'}`}>
                {preview.conflicts.length}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Conflicts</p>
            </div>
          </div>

          {preview.duplicates.length > 0 && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2">
              <p className="text-[11px] text-amber-300 font-medium mb-1">
                Possible existing device{preview.duplicates.length === 1 ? '' : 's'} — update it instead of creating a duplicate
              </p>
              <ul className="space-y-1">
                {preview.duplicates.slice(0, 5).map((d) => (
                  <li key={d.deviceId} className="text-[11px] text-gray-300">
                    #{d.deviceId} {d.name}{' '}
                    <span className="text-gray-500">
                      ({d.matchType} · {Math.round(d.score * 100)}% · {d.status})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.fieldsImported === 0 && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2">
              <p className="flex items-start gap-2 text-[11px] text-red-300 font-medium">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                Nothing was extracted from these sources
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Applying would prefill no fields. Check the extraction diagnostic above, or try a different
                source/paste.
              </p>
            </div>
          )}

          {preview.conflicts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-amber-300 font-medium">
                Sources disagree — your choice wins (the administrator has final authority)
              </p>
              {preview.conflicts.slice(0, 25).map((c) => (
                <div key={c.path} className="rounded bg-muted p-2">
                  <p className="text-[11px] text-gray-400 mb-1">{humanizePath(c.path)}</p>
                  <div className="space-y-1">
                    {c.values.map((v, i) => (
                      <label
                        key={`${c.path}-${v.sourceSlug}-${i}`}
                        className="flex items-center gap-2 text-[11px] text-gray-200 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`conflict-${c.path}`}
                          checked={choices[c.path] === v.sourceSlug}
                          onChange={() => setChoices((prev) => ({ ...prev, [c.path]: v.sourceSlug }))}
                        />
                        <span className="text-gray-500 min-w-[120px]">{v.sourceLabel}</span>
                        <span className="truncate">{formatValue(v.value)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {preview.conflicts.length > 25 && (
                <p className="text-[11px] text-gray-500">
                  +{preview.conflicts.length - 25} more conflicts — resolve them after applying.
                </p>
              )}
            </div>
          )}

          {preview.missingPaths.length > 0 && (
            <details className="text-[11px] text-gray-500">
              <summary className="cursor-pointer">
                Missing fields ({preview.missingPaths.length}) — left empty, never invented
              </summary>
              <p className="mt-1">{preview.missingPaths.slice(0, 60).map(humanizePath).join(' · ')}</p>
            </details>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={applyToForm}
              disabled={preview.conflicts.length > 0 || preview.fieldsImported === 0}
              className={`${buttonClass} bg-brand-primary text-white hover:bg-blue-600`}
              title={
                preview.conflicts.length > 0
                  ? 'Resolve every conflict first'
                  : preview.fieldsImported === 0
                    ? 'Nothing was extracted — there is nothing to apply'
                    : undefined
              }
            >
              Apply to this form
            </button>
            {onCreated && (
              <button
                type="button"
                onClick={createDraft}
                disabled={applying || preview.conflicts.length > 0 || !noDuplicateWarning || preview.fieldsImported === 0}
                className={`${buttonClass} bg-muted text-white border border-border hover:border-brand-primary`}
                title={
                  !noDuplicateWarning
                    ? 'A possible duplicate exists — update that device instead'
                    : preview.fieldsImported === 0
                      ? 'Nothing was extracted — nothing to save'
                      : undefined
                }
              >
                {applying ? <Loader2 size={14} className="animate-spin" /> : null}
                Save as draft device with provenance
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            Imports are always saved as drafts. Raw payloads, per-field provenance and the change history are stored for audit.
          </p>
        </div>
      )}
    </div>
  )
}