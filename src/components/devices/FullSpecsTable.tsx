'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SpecRow {
  label: string
  value?: string | number | null
}

interface SpecGroup {
  title: string
  rows: SpecRow[]
}

/**
 * Lightweight client accordion for the device "Full Specifications".
 * Each category is a disclosure: header (touch target >=44px) + expandable rows.
 * Mobile-friendly; no horizontal scrolling needed vs the old wide table.
 */
export default function FullSpecsTable({
  groups,
}: {
  groups: SpecGroup[]
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of groups) {
      // Keep the decision-maker categories open by default; rest collapsed.
      init[g.title] = g.title === 'Display' || g.title === 'Processor'
    }
    return init
  })

  const visible = groups.filter((g) => g.rows.some((r) => r.value != null && r.value !== ''))

  if (visible.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Full Specifications</h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {visible.map((g) => {
          const isOpen = !!open[g.title]
          return (
            <div key={g.title} id={`specs-${g.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((prev) => ({ ...prev, [g.title]: !isOpen }))}
                className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
              >
                <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {g.title}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border/60 px-4 pb-2">
                  {g.rows.map((r, i) =>
                    r.value == null || r.value === '' ? null : (
                      <div
                        key={`${r.label}-${i}`}
                        className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2.5 last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        <span className="text-right text-sm font-medium text-foreground">{r.value}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
