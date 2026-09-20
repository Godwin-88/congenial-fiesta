'use client'
// Ranking Breakdown Panel — admin-only visibility into the FweezyTech Score.
// ============================================================================
// The public site shows ONE number (Ranking §36). Administrators need the full
// reasoning: each component, its inputs, and the dynamic global best it was
// measured against.
//
// Two modes:
//  • deviceId    — the persisted device's breakdown (GET breakdown/:id, with a
//    manual "Recalculate from specs" button).
//  • specPreview — LIVE preview of the agent's computation from the CURRENT
//    (unsaved) form data (POST /api/admin/ranking/preview, debounced). Used by
//    the create/edit forms so the computed score is visible while typing, next
//    to the manual Fweezy Score sliders. The admin's score supersedes the
//    agent's (§48) — this panel is the audit view of what the agent WOULD do.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

interface ComponentBlock {
  points: number | null
  max: number
  detail: Record<string, unknown>
}

interface BreakdownRecord {
  scoring_version: string
  benchmark_version: string
  build: ComponentBlock
  display: ComponentBlock
  performance: ComponentBlock & {
    processor: ComponentBlock
    ram: ComponentBlock
    storage: ComponentBlock
  }
  cameras: ComponentBlock
  battery: ComponentBlock
  total: number
  effectiveMax: number
  prorated: boolean
}

interface BreakdownResponse {
  device?: {
    id: number
    name: string
    slug: string
    status: string
    scores_overall: number | null
  }
  breakdown: BreakdownRecord | null
  benchmarks: Record<string, number>
  formula: { version: string; benchmarkVersion: string; categoryMax: number }
  note?: string
}

const BENCHMARK_LABELS: Record<string, string> = {
  best_single_core: 'Best single-core',
  best_multi_core: 'Best multi-core',
  best_gpu: 'Best GPU score',
  best_sensor_area_mm2: 'Best sensor area (mm²)',
  best_aperture: 'Best aperture (f/)',
  best_brightness_nits: 'Best brightness (nits)',
  best_battery_mah: 'Best battery (mAh)',
  best_wired_w: 'Best wired charging (W)',
  best_wireless_w: 'Best wireless charging (W)',
}

export default function RankingBreakdownPanel({
  deviceId,
  specPreview,
}: {
  deviceId?: number
  specPreview?: Record<string, unknown> | null
}) {
  const [data, setData] = useState<BreakdownResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewMode = specPreview != null

  const load = useCallback(
    async (recalculate: boolean) => {
      if (!deviceId) return
      if (recalculate) setRecalculating(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/admin/ranking/breakdown/${deviceId}${recalculate ? '?recalculate=1' : ''}`,
        )
        const body = await res.json()
        if (!res.ok) {
          setError(body.error ?? 'Could not load the breakdown.')
          return
        }
        setData(body)
      } catch {
        setError('Could not load the breakdown.')
      } finally {
        setLoading(false)
        setRecalculating(false)
      }
    },
    [deviceId],
  )

  // Persisted-device mode: load once on mount.
  useEffect(() => {
    if (!previewMode && deviceId) void load(false)
  }, [previewMode, deviceId, load])

  // Preview mode: debounced POST of the unsaved form state — the exact
  // computation the engine would run on save (same canonical write gate).
  useEffect(() => {
    if (!previewMode) return
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/ranking/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specPreview),
        })
        const body = await res.json()
        if (!res.ok) {
          setError(body.error ?? 'Could not compute the preview.')
          return
        }
        setData(body)
      } catch {
        setError('Could not compute the preview.')
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [previewMode, specPreview])

  const breakdown = data?.breakdown ?? null

  // Flatten the deterministic breakdown into renderable rows (§36).
  const rows: Array<{ key: string; label: string; points: number | null; max: number; detail?: Record<string, unknown> }> = []
  if (breakdown) {
    rows.push({ key: 'build', label: 'Build Quality', ...breakdown.build })
    rows.push({ key: 'display', label: 'Display', ...breakdown.display })
    rows.push({ key: 'performance', label: 'Performance', points: breakdown.performance.points, max: breakdown.performance.max })
    rows.push({ key: 'processor', label: '· Processor', ...breakdown.performance.processor })
    rows.push({ key: 'ram', label: '· RAM', ...breakdown.performance.ram })
    rows.push({ key: 'storage', label: '· Storage', ...breakdown.performance.storage })
    rows.push({ key: 'cameras', label: 'Cameras', ...breakdown.cameras })
    rows.push({ key: 'battery', label: 'Battery', ...breakdown.battery })
  }

  // Unknown inputs are surfaced, not silently zeroed (§28).
  const unknownInputs = rows.flatMap((r) =>
    Object.entries(r.detail ?? {})
      .filter(([, v]) => v === null)
      .map(([k]) => `${r.key}.${k}`),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {previewMode ? (
          <span className="text-[11px] text-gray-500">
            Live preview of the agent's computation from the current (unsaved) form data — recomputed as you type.
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading || recalculating}
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium bg-muted text-white border border-border hover:border-brand-primary disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Show breakdown
            </button>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading || recalculating}
              className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium bg-brand-primary text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {recalculating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Recalculate from specs
            </button>
          </>
        )}
        {data?.formula && (
          <span className="text-[11px] text-gray-500">
            {data.formula.version} · benchmarks {data.formula.benchmarkVersion}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {data && (
        <>
          <div className="rounded border border-border p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {previewMode
                ? 'FweezyTech Score (agent computation — for audit only)'
                : 'FweezyTech Score (final, deterministic)'}
            </p>
            <p className="text-2xl text-white font-medium">
              {breakdown ? `${Math.round(breakdown.total * 10) / 10} / 100` : '—'}
            </p>
            {breakdown && (
              <p className="text-[11px] text-gray-500">
                {breakdown.scoring_version} · benchmarks {breakdown.benchmark_version} · effective max{' '}
                {breakdown.effectiveMax}
              </p>
            )}
            {breakdown?.prorated && (
              <p className="text-[11px] text-amber-400">
                Prorated — some ranking inputs are unknown, so unknown categories are excluded rather
                than scored as zero (§28).
              </p>
            )}
            {breakdown && previewMode && (
              <p className="text-[11px] text-gray-500">
                This number never reaches the public page when the Fweezy Score above is filled — your manual score supersedes it on save (§48).
              </p>
            )}
            {!breakdown && <p className="text-[11px] text-amber-400">{data.note}</p>}
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((c) => (
                <div key={c.key} className="rounded bg-muted p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white">{c.label}</span>
                    <span className="text-gray-400">
                      {c.points != null ? `${Math.round(c.points * 100) / 100} / ${c.max}` : `unknown / ${c.max}`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-background overflow-hidden">
                    <div
                      className="h-full bg-brand-primary"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((c.points ?? 0) / (c.max || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  {c.detail && Object.keys(c.detail).length > 0 && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      {Object.entries(c.detail)
                        .map(([k, v]) => `${k}: ${v === null ? 'unknown' : String(v)}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {unknownInputs.length > 0 && (
            <details className="text-[11px] text-gray-500">
              <summary className="cursor-pointer">
                Unknown ranking inputs ({unknownInputs.length}) — these limit the score
              </summary>
              <p className="mt-1">{unknownInputs.slice(0, 60).join(' · ')}</p>
            </details>
          )}

          <details className="text-[11px] text-gray-500">
            <summary className="cursor-pointer">
              Dynamic global benchmarks this device is measured against
            </summary>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {Object.entries(data.benchmarks ?? {}).map(([key, value]) => (
                <span key={key}>
                  {BENCHMARK_LABELS[key] ?? key}: <span className="text-gray-300">{value}</span>
                </span>
              ))}
            </div>
            <p className="mt-1">
              Benchmarks are recalculated when new devices are published (§31); an administrator can
              override any of them, and overrides are never overwritten automatically.
            </p>
          </details>
        </>
      )}
    </div>
  )
}
