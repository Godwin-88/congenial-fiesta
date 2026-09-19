'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Wand2, X, Loader2, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react'

/** Per-item result shape echoed by the youtube-batch route (local copy). */
type BatchItemResult = {
  name: string
  videoId: string | null
  status: 'created' | 'updated' | 'skipped'
  deviceId: number | null
  fieldsImported: number
  conflicts: number
  reason: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onQueued: (scope: 'latest-50' | 'all') => void
}

/** One device candidate returned by the scan step. */
type Candidate = {
  videoId: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  url: string
  name: string
  brandName: string | null
  brandSlug: string | null
  releaseYear: number | null
  tagline: string | null
  priceTier: string | null
  majorCategory: string | null
  specs: Record<string, unknown>
  providedPaths: string[]
}

/** base64url of the UTF-8 JSON payload handed to the create form. */
function encodePayload(candidate: Candidate): string {
  const json = JSON.stringify({
    videoId: candidate.videoId,
    name: candidate.name,
    brandName: candidate.brandName,
    releaseYear: candidate.releaseYear,
    tagline: candidate.tagline,
    priceTier: candidate.priceTier,
    majorCategory: candidate.majorCategory,
    specs: candidate.specs,
  })
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Admin "Import devices from YouTube" modal.
 *
 * Merged pipeline (no transcript needed):
 *  1. SCAN  — the agent reads the channel feed, resolves the device NAME from the
 *             video title, classifies the major category against the live
 *             taxonomy, and extracts any specs the creator wrote in the description.
 *  2. PICK  — the admin either saves ALL scanned devices as drafts in one click
 *             (each flows through the same import-agent pipeline as a single
 *             apply, with provenance + import_runs + change history) or opens
 *             one device individually.
 *  3. LOAD  — the create form (or the saved draft's edit page) opens with that
 *             device staged. The Import Specifications panel there supplements
 *             whatever the video did not state, then the admin saves.
 */
export default function YouTubeImportModal({ open, onClose, onQueued }: Props) {
  const router = useRouter()
  const [scope, setScope] = useState<'latest-50' | 'all'>('latest-50')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  /** videoId → saved draft device id (batch save results carry over to Load). */
  const [savedDrafts, setSavedDrafts] = useState<Record<string, number>>({})
  /** videoId → full per-item batch outcome (fields, conflicts, skip reason). */
  const [batchDetails, setBatchDetails] = useState<Record<string, BatchItemResult>>({})
  /** Per-row expand/collapse for the batch outcome strip. */
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchResult, setBatchResult] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setCandidates(null)
    setError(null)
    setLoading(false)
    setLoadingId(null)
    setSavedDrafts({})
    setBatchDetails({})
    setExpandedVideoId(null)
    setBatchSaving(false)
    setBatchResult(null)
  }

  const close = () => {
    if (loading || loadingId || batchSaving) return
    reset()
    onClose()
  }

  /** Step 1+2: scan the channel and list the device candidates. */
  const scan = async () => {
    setLoading(true)
    setError(null)
    setCandidates(null)
    setSavedDrafts({})
    setBatchDetails({})
    setExpandedVideoId(null)
    setBatchResult(null)
    try {
      const res = await fetch('/api/admin/devices/import/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fetchAll: scope === 'all' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Scan failed. Please try again.')
        return
      }
      const found: Candidate[] = data.candidates ?? []
      if (found.length === 0) {
        setError(data.message ?? 'No device reviews found in the scanned videos.')
        return
      }
      setCandidates(found)
    } catch {
      setError('Network error while scanning the channel.')
    } finally {
      setLoading(false)
    }
  }

  /** Step 3: stage the chosen device in the create form. */
  const loadIntoForm = (candidate: Candidate) => {
    setLoadingId(candidate.videoId)
    router.push(`/admin/devices/create?yt=${encodePayload(candidate)}`)
  }

  /**
   * Batch step: save EVERY scanned device as a draft through the SAME
   * import-agent pipeline as a single apply (preview then applyImport, with
   * provenance + import_runs + change history). Each saved draft keeps its
   * device id so the admin can open it individually afterwards and enrich it
   * with the Import Specifications panel on the edit page.
   */
  const saveAllAsDrafts = async () => {
    if (!candidates || candidates.length === 0 || batchSaving) return
    setBatchSaving(true)
    setError(null)
    setBatchResult(null)
    try {
      const res = await fetch('/api/admin/devices/import/youtube-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: candidates.map((c) => ({
            videoId: c.videoId,
            name: c.name,
            brandName: c.brandName,
            releaseYear: c.releaseYear,
            tagline: c.tagline,
            priceTier: c.priceTier,
            majorCategory: c.majorCategory,
            specs: c.specs,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Batch save failed. Please try again.')
        return
      }
      const next: Record<string, number> = { ...savedDrafts }
      const details: Record<string, BatchItemResult> = { ...batchDetails }
      for (const r of (data.results ?? []) as BatchItemResult[]) {
        if (r.videoId) details[r.videoId] = r
        if (r.videoId && r.deviceId && (r.status === 'created' || r.status === 'updated')) {
          next[r.videoId] = r.deviceId
        }
      }
      setSavedDrafts(next)
      setBatchDetails(details)
      setBatchResult(data.message ?? 'Drafts saved.')
      if (data.summary && data.summary.skipped > 0) {
        const skippedNames = (data.results as BatchItemResult[] | undefined)
          ?.filter((r) => r.status === 'skipped')
          .map((r) => r.name)
          .slice(0, 5)
        const detail = skippedNames && skippedNames.length > 0 ? `: ${skippedNames.join(', ')}` : ''
        setError(
          `${data.summary.skipped} of ${data.summary.total} skipped — load ${data.summary.skipped === 1 ? 'it' : 'them'} individually to review conflicts${detail}.`,
        )
      }
    } catch {
      setError('Batch save failed. Please try again.')
    } finally {
      setBatchSaving(false)
    }
  }

  /** Open a saved draft's edit page to enrich it with the spec agent. */
  const openDraft = (candidate: Candidate) => {
    const deviceId = savedDrafts[candidate.videoId]
    if (!deviceId) {
      loadIntoForm(candidate)
      return
    }
    router.push(`/admin/devices/${deviceId}/edit`)
  }

  /**
   * Secondary path: queue a background scan of the whole channel (the original
   * behaviour). Useful for bulk seeding — the per-device handoff above stays the
   * primary flow.
   */
  const queueChannel = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/devices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fetchAll: scope === 'all' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not queue the channel import.')
        return
      }
      onQueued(scope)
      reset()
      onClose()
    } catch {
      setError('Network error while queuing the channel import.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import devices from YouTube"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-lg rounded-xl border-2 border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          disabled={loading || loadingId !== null}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Wand2 size={18} />
          </span>
          <h2 className="text-lg font-bold font-heading text-foreground">
            Import devices from YouTube
          </h2>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          The agent reads your reviews, resolves each device name, and loads it into the create
          form. You then supplement any missing specs with the spec agent before saving.
        </p>

        {/* Step 1 — scope */}
        {!candidates && (
          <>
            <div className="mb-5 space-y-3">
              <button
                type="button"
                onClick={() => setScope('latest-50')}
                className={`flex w-full items-start gap-3 rounded-lg border-2 p-3.5 text-left transition-colors ${
                  scope === 'latest-50'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-muted-foreground/50">
                  {scope === 'latest-50' && <span className="h-2 w-2 rounded-full bg-brand-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Latest videos</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Fast — scans recent reviews. Best for regular updates.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`flex w-full items-start gap-3 rounded-lg border-2 p-3.5 text-left transition-colors ${
                  scope === 'all'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-muted-foreground/50">
                  {scope === 'all' && <span className="h-2 w-2 rounded-full bg-brand-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Wider scan</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Reads further back through the channel history.
                  </span>
                </span>
              </button>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={scan}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Scan for devices
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={queueChannel}
              disabled={loading}
              className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
            >
              Or queue a background scan of the whole channel
            </button>
          </>
        )}

        {/* Step 2 — save all as drafts, or pick one to enrich individually */}
        {candidates && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={14} className="text-green-500" />
              {candidates.length} device{candidates.length === 1 ? '' : 's'} found — save all as drafts or open one
            </div>

            {batchResult && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border-2 border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{batchResult}</span>
              </div>
            )}

            {error && <ErrorBox message={error} />}

            <div className="mb-3">
              <button
                type="button"
                onClick={saveAllAsDrafts}
                disabled={batchSaving || loadingId !== null}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-60"
              >
                {batchSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {batchSaving
                  ? 'Saving drafts…'
                  : Object.keys(savedDrafts).length > 0
                    ? `Saved ${Object.keys(savedDrafts).length} of ${candidates.length} — save again for the rest`
                    : `Save all ${candidates.length} as drafts`}
              </button>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Each draft keeps its video link, category and provenance. Open any draft below to
                enrich it with the Import Specifications panel.
              </p>
            </div>

            <div className="mb-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {candidates.map((candidate) => {
                const draftId = savedDrafts[candidate.videoId]
                const batchInfo = batchDetails[candidate.videoId]
                const isOpen = expandedVideoId === candidate.videoId
                return (
                <div
                  key={candidate.videoId}
                  className="rounded-lg border-2 border-border"
                >
                <button
                  type="button"
                  onClick={() => (draftId ? openDraft(candidate) : loadIntoForm(candidate))}
                  disabled={loadingId !== null || batchSaving}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-border p-3 text-left transition-colors hover:border-brand-primary disabled:opacity-60"
                >
                  {candidate.thumbnailUrl ? (
                    <Image
                      src={candidate.thumbnailUrl}
                      alt={candidate.name}
                      width={64}
                      height={48}
                      unoptimized
                      className="h-12 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-muted">
                      <Smartphone size={18} className="text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {candidate.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[candidate.brandName, candidate.releaseYear, candidate.majorCategory]
                        .filter(Boolean)
                        .join(' · ') || candidate.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {candidate.providedPaths.length
                        ? `${candidate.providedPaths.length} spec value${candidate.providedPaths.length === 1 ? '' : 's'} from the video`
                        : 'Name only — specs to be supplemented by the agent'}
                    </span>
                  </span>
                  {loadingId === candidate.videoId ? (
                    <Loader2 size={16} className="shrink-0 animate-spin text-brand-primary" />
                  ) : draftId ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded bg-green-600/20 px-2 py-1 text-[11px] font-medium text-green-400">
                        Draft #{draftId}
                      </span>
                      <span className="rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white">
                        Open
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-brand-primary px-2.5 py-1 text-xs font-medium text-white">
                      Load
                    </span>
                  )}
                </button>
                {batchInfo && (
                  <button
                    type="button"
                    onClick={() => setExpandedVideoId(isOpen ? null : candidate.videoId)}
                    className="flex w-full items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>
                      {batchInfo.status === 'skipped'
                        ? `Skipped — ${batchInfo.reason ?? 'see edit page'}`
                        : `${batchInfo.fieldsImported} field${batchInfo.fieldsImported === 1 ? '' : 's'} imported · ${batchInfo.conflicts} conflict${batchInfo.conflicts === 1 ? '' : 's'}`}
                    </span>
                    <span>{isOpen ? '▴' : '▾'}</span>
                  </button>
                )}
                {batchInfo && isOpen && (
                  <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                    <p>
                      Status: <span className="font-medium text-foreground">{batchInfo.status}</span>
                      {batchInfo.deviceId ? ` · device #${batchInfo.deviceId}` : ''}
                    </p>
                    {batchInfo.reason && <p className="mt-0.5">Reason: {batchInfo.reason}</p>}
                    {batchInfo.status !== 'skipped' && (
                      <p className="mt-0.5">
                        Open the draft and run the Import Specifications panel to enrich it with
                        MobileAPI.dev / GSMArena / manufacturer specs.
                      </p>
                    )}
                  </div>
                )}
                </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={loadingId !== null || batchSaving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={close}
                disabled={loadingId !== null || batchSaving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
