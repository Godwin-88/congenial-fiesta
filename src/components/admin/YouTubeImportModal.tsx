'use client'
import { useState } from 'react'
import { Wand2, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onQueued: (scope: 'latest-50' | 'all') => void
}

/**
 * Admin "Import devices from YouTube" modal.
 *
 * The agent pipeline (Groq device analyzer + image curator) runs as a
 * background QStash job because it can take minutes. This modal simply lets
 * the admin choose the scope and queue the job; drafts appear in the devices
 * list a little later for review.
 */
export default function YouTubeImportModal({ open, onClose, onQueued }: Props) {
  const [scope, setScope] = useState<'latest-50' | 'all'>('latest-50')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open) return null

  const start = async () => {
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
        setError(data.error ?? 'Import failed to queue. Please try again.')
        return
      }
      setDone(true)
      onQueued(scope)
      // Auto-dismiss after a beat so the "queued ✓" state is visible.
      setTimeout(() => {
        onClose()
        setDone(false)
      }, 1600)
    } catch {
      setError('Network error while queuing import.')
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading || done ? undefined : onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border-2 border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={loading || done}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Wand2 size={18} />
          </span>
          <h2 className="text-lg font-bold font-heading text-foreground">
            Import devices from YouTube
          </h2>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          The agent scans FweezyTech&apos;s channel, extracts device reviews, and creates{' '}
          <span className="text-amber-400 font-medium">drafts</span> for you to review and publish.
        </p>

        {done ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="text-sm font-medium text-foreground">Import queued</p>
            <p className="text-xs text-muted-foreground text-center">
              Drafts will start appearing here in the next few minutes.
            </p>
          </div>
        ) : (
          <>
            {/* Scope selector */}
            <div className="space-y-3 mb-5">
              <button
                type="button"
                onClick={() => setScope('latest-50')}
                className={`w-full flex items-start gap-3 rounded-lg border-2 p-3.5 text-left transition-colors ${
                  scope === 'latest-50'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-muted-foreground/50">
                  {scope === 'latest-50' && <span className="h-2 w-2 rounded-full bg-brand-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Latest 50 videos</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Fast — picks up recent reviews. Best for regular updates.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`w-full flex items-start gap-3 rounded-lg border-2 p-3.5 text-left transition-colors ${
                  scope === 'all'
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-muted-foreground/50">
                  {scope === 'all' && <span className="h-2 w-2 rounded-full bg-brand-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">All channel videos</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Full scan of the channel history. Can take several minutes.
                  </span>
                </span>
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Queuing…
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Start Import
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
