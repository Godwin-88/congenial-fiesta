'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

type Props = {
  /** Metric name shown in the panel header. */
  metric: string
  /** Plain-English definition of the metric. */
  definition: string
  /** How the metric is computed. */
  formula?: string
  /** GA4 / industry alias, when one exists. */
  ga4Alias?: string
  /** Where the underlying data comes from. */
  dataSource?: string
  /** The actionable BI takeaway ("what to do with this"). */
  action?: string
  componentLabel?: string
}

const PANEL_W = 360
const PANEL_GAP = 8
const VIEWPORT_MARGIN = 12

/**
 * ⓘ button on a chart title. Click opens a BI glossary panel (definition ·
 * formula · GA4 alias · data source · what to act on) rendered in a portal on
 * <body>, so it can never be clipped by a small card's overflow-hidden. The
 * panel is anchored to the button, clamped to the viewport (opens above the
 * button when there's no room below), re-anchors on scroll/resize, and closes
 * on outside click or Escape.
 */
export default function MetricInfo({
  metric,
  definition,
  formula,
  ga4Alias,
  dataSource,
  action,
  componentLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const computePos = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(PANEL_W, vw - VIEWPORT_MARGIN * 2)
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), vw - width - VIEWPORT_MARGIN)
    // Estimate panel height so it opens below when it fits, otherwise above.
    const estHeight = Math.min(420, vh - VIEWPORT_MARGIN * 2)
    let top = rect.bottom + PANEL_GAP
    if (top + estHeight > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - estHeight - PANEL_GAP)
    }
    setPos({ top, left, width })
  }, [])

  // Re-anchor while open (scrolling inside the dashboard moves the button).
  useEffect(() => {
    if (!open) return
    computePos()
    const onMove = () => computePos()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, computePos])

  // Close on Escape or on click outside the button / panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      const panel = document.getElementById('metric-info-panel')
      if (panel && panel.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${componentLabel ?? metric} — metric breakdown`}
        aria-expanded={open}
        onClick={() => {
          if (!open) computePos()
          setOpen((v) => !v)
        }}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/10 ${
          open ? 'text-brand-primary' : 'text-muted-foreground'
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="metric-info-panel"
            role="dialog"
            aria-label={metric}
            className="fixed z-[1000] max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-card p-4 text-left shadow-xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <p className="text-sm font-semibold text-foreground">{metric}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition}</p>
            {formula && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Formula: </span>
                <code className="mt-0.5 block rounded bg-foreground/5 px-1 py-0.5 font-mono text-[10px] leading-relaxed">
                  {formula}
                </code>
              </p>
            )}
            {ga4Alias && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">GA4 alias: </span>
                {ga4Alias}
              </p>
            )}
            {dataSource && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Data source: </span>
                {dataSource}
              </p>
            )}
            {action && (
              <p className="mt-2 rounded-md bg-brand-primary/10 px-2 py-1.5 text-xs leading-relaxed text-foreground">
                <span className="font-semibold">Action: </span>
                {action}
              </p>
            )}
            {componentLabel && <p className="mt-2 text-[10px] text-muted-foreground/80">{componentLabel}</p>}
          </div>,
          document.body,
        )}
    </>
  )
}