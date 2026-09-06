'use client'

// Agentic Prefill Review Panel
// ----------------------------
// Accepts a pasted spec sheet / article copy, calls POST /api/admin/prefill,
// renders grouped fields with per-field checkboxes, and on Apply dispatches
// `fweezy:prefill-apply` (CustomEvent) with the pruned field payload for the
// create/edit form page. Nothing writes to the DB — the admin still saves.

import { useState } from 'react'
import { Bot, Check, ChevronDown, Sparkles, Wand2, X } from 'lucide-react'
import type { PrefillCollection } from '@/lib/chat/prefill-schemas'
import { flattenDeviceFields, flattenArticleFields, type PrefillGroup } from '@/lib/chat/prefill-flatten'

type FieldSelection = Record<string, boolean>

export default function PrefillReviewPanel({
  collection,
  onApply,
  onClose,
}: {
  collection: PrefillCollection
  onApply: (payload: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [selected, setSelected] = useState<FieldSelection>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const groups: PrefillGroup[] = raw
    ? collection === 'devices'
      ? flattenDeviceFields(raw)
      : flattenArticleFields(raw)
    : []

  const selectedCount = Object.values(selected).filter(Boolean).length
  const totalCount = groups.reduce((n, g) => n + g.fields.length, 0)
  const allSelected = totalCount > 0 && selectedCount === totalCount

  const handleExtract = async () => {
    if (!source.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, source: source.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Prefill failed')
      setRaw(data.fields as Record<string, unknown>)
      const fresh: FieldSelection = {}
      const grp = collection === 'devices' ? flattenDeviceFields(data.fields) : flattenArticleFields(data.fields)
      grp.forEach((g) => g.fields.forEach((f) => (fresh[f.key] = true)))
      setSelected(fresh)
      setOpen(Object.fromEntries(grp.map((g) => [g.id, true])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prefill failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleAll = () => {
    const next: FieldSelection = {}
    groups.forEach((g) => g.fields.forEach((f) => (next[f.key] = !allSelected)))
    setSelected(next)
  }

  // Reconstruct a pruned payload — keep only selected branches of `raw`.
  const handleApply = () => {
    if (!raw || selectedCount === 0) return
    const picked = new Set(Object.keys(selected).filter((k) => selected[k]))
    const prune = (node: unknown, path: string): unknown => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        return picked.has(path) ? node : undefined
      }
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const childPath = path ? `${path}.${k}` : k
        if (picked.has(childPath)) {
          out[k] = v
        } else {
          const pruned = prune(v, childPath)
          if (pruned !== undefined) out[k] = pruned
        }
      }
      return out
    }
    const payload = prune(raw, '') as Record<string, unknown>
    onApply(payload)
    setSource('')
    setRaw(null)
    setSelected({})
    setError(null)
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Wand2 size={14} className="text-brand-primary" /> Auto-fill {collection === 'devices' ? 'device' : 'article'}
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-accent" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={4}
        placeholder={`Paste ${collection === 'devices' ? 'device specs (e.g. GSMArena text)' : 'article copy'} — or describe what to extract…`}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!source.trim() || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Bot size={14} className="animate-pulse" /> : <Sparkles size={14} />}
          {loading ? 'Extracting…' : 'Extract fields'}
        </button>
        <span className="text-[11px] text-muted-foreground">{source.length}/6000</span>
      </div>

      {error && <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>}

      {groups.length > 0 && (
        <div className="mt-3 max-h-60 overflow-auto rounded-lg border border-border bg-background/50">
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/90 px-3 py-2">
            <span className="text-[11px] font-medium text-muted-foreground">{selectedCount}/{totalCount} fields</span>
            <button type="button" onClick={toggleAll} className="text-[11px] text-brand-primary hover:underline">
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {groups.map((g) => (
            <div key={g.id} className="border-b border-border px-3 py-2 last:border-0">
              <button
                type="button"
                className="flex w-full items-center justify-between py-1 text-left"
                onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
              >
                <span className="text-xs font-semibold text-foreground">{g.title}</span>
                <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open[g.id] ? 'rotate-180' : ''}`} />
              </button>
              {open[g.id] && (
                <div className="space-y-1 pt-1">
                  {g.fields.map((f) => (
                    <label key={f.key} className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-accent/40">
                      <input
                        type="checkbox"
                        checked={selected[f.key] ?? false}
                        onChange={(e) => setSelected((s) => ({ ...s, [f.key]: e.target.checked }))}
                        className="mt-0.5 h-3.5 w-3.5 accent-brand-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium text-muted-foreground">{f.label}</span>
                        <span className="block break-words text-xs text-foreground">{f.value}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <button
          type="button"
          onClick={handleApply}
          disabled={selectedCount === 0}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-primary bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-50"
        >
          <Check size={14} /> Apply {selectedCount} to form
        </button>
      )}
    </div>
  )
}