'use client'

// Catalog performance grid — every catalog row with audience + monetisation.
//
// The "long tail" workbench: search, filter by outcome, sort by any column and
// change the page size, all client-side from one payload (the aggregator has
// already joined catalog + views + clicks, so no refetch is needed). This is
// the Devices-tab equivalent of the Explore panel: the drill-down after the
// story charts.

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Search } from 'lucide-react'

import {
  DEVICE_OUTCOME_COLORS,
  DEVICE_OUTCOME_LABELS,
  DEVICE_OUTCOME_ORDER,
  type DeviceOutcome,
} from '@/lib/analytics/deviceOutcome'

export type CatalogPerformanceRow = {
  slug: string
  name: string
  brandSlug: string
  brandName: string
  priceTier: string
  majorCategory: string
  deviceType: string
  status: string
  views: number
  clicks: number
  ctr: number
  buyLinkCount: number
  intentEvents: number
  outcome: DeviceOutcome
  href: string
}

type SortKey = 'views' | 'clicks' | 'ctr' | 'buyLinkTier' | 'intentEvents' | 'name'

type Props = { rows: CatalogPerformanceRow[] }

const PAGE_SIZES = [25, 50, 100]

const TIER_SHORT: Record<string, string> = {
  'ultra-premium': 'Ultra',
  flagship: 'Flagship',
  'mid-range': 'Mid',
  budget: 'Budget',
  unspecified: '—',
}

function sortValue(row: CatalogPerformanceRow, key: SortKey): number | string {
  if (key === 'name') return row.name.toLowerCase()
  // Zero links sorts below "one link" so the broken end of the catalog groups first.
  if (key === 'buyLinkTier') return row.buyLinkCount === 0 ? -1 : row.buyLinkCount
  if (key === 'intentEvents') return row.intentEvents
  return row[key]
}

export default function CatalogPerformanceTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<'all' | DeviceOutcome>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'views', dir: 'desc' })
  const [size, setSize] = useState(50)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (outcome !== 'all' && row.outcome !== outcome) return false
      if (!needle) return true
      return (
        row.name.toLowerCase().includes(needle) ||
        row.brandName.toLowerCase().includes(needle) ||
        row.slug.includes(needle) ||
        row.deviceType.toLowerCase().includes(needle) ||
        row.majorCategory.toLowerCase().includes(needle)
      )
    })
  }, [rows, query, outcome])

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * factor
      return (av - bv) * factor
    })
  }, [filtered, sort])

  const visible = sorted.slice(0, size)
  const outcomeCounts = DEVICE_OUTCOME_ORDER.map((o) => ({
    outcome: o,
    count: rows.filter((r) => r.outcome === o).length,
  })).filter((o) => o.count > 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search device, brand, slug…"
            className="w-64 rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setOutcome('all')}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              outcome === 'all'
                ? 'border-transparent bg-brand-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-foreground/5'
            }`}
          >
            All {rows.length}
          </button>
          {outcomeCounts.map(({ outcome: o, count }) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                outcome === o
                  ? 'border-transparent bg-brand-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-foreground/5'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEVICE_OUTCOME_COLORS[o] }} />
              {DEVICE_OUTCOME_LABELS[o]} {count}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <label htmlFor="catalog-rows" className="sr-only">
            Rows per page
          </label>
          <span>Rows</span>
          <select
            id="catalog-rows"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-brand-primary focus:outline-none"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>
            {visible.length} of {sorted.length}
          </span>
        </div>
      </div>

      <CatalogTableBody rows={visible} sort={sort} onSort={setSort} />
    </div>
  )
}

function CatalogTableBody({
  rows,
  sort,
  onSort,
}: {
  rows: CatalogPerformanceRow[]
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (next: { key: SortKey; dir: 'asc' | 'desc' }) => void
}) {
  const toggle = (key: SortKey) => {
    onSort(
      sort.key === key
        ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    )
  }

  const header = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th className={`py-2 pr-3 font-medium ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button
        type="button"
        onClick={() => toggle(key)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          sort.key === key ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
        {sort.key === key ? (
          sort.dir === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {header('Device', 'name', 'left')}
            <th className="py-2 pr-3 text-left font-medium text-muted-foreground">Tier</th>
            {header('Views', 'views')}
            {header('Clicks', 'clicks')}
            {header('CTR', 'ctr')}
            {header('Links', 'buyLinkTier')}
            {header('Intent', 'intentEvents')}
            <th className="py-2 text-left font-medium text-muted-foreground">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slug} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="max-w-[18rem] py-2 pr-3">
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-brand-primary hover:underline"
                  title={row.name}
                >
                  <span className="truncate">{row.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {row.brandName} · {row.deviceType}
                  {row.status !== 'published' ? ` · ${row.status}` : ''}
                </span>
              </td>
              <td className="py-2 pr-3 text-left text-xs text-muted-foreground">
                {TIER_SHORT[row.priceTier] ?? row.priceTier}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.views.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.clicks.toLocaleString()}</td>
              <td
                className={`py-2 pr-3 text-right tabular-nums ${
                  row.ctr >= 3 ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                {row.ctr}%
              </td>
              <td
                className={`py-2 pr-3 text-right tabular-nums ${
                  row.buyLinkCount === 0 ? 'text-red-400' : 'text-muted-foreground'
                }`}
              >
                {row.buyLinkCount}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                {row.intentEvents.toLocaleString()}
              </td>
              <td className="py-2">
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: `${DEVICE_OUTCOME_COLORS[row.outcome]}1F`,
                    color: DEVICE_OUTCOME_COLORS[row.outcome],
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: DEVICE_OUTCOME_COLORS[row.outcome] }}
                  />
                  {DEVICE_OUTCOME_LABELS[row.outcome]}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-muted-foreground">
                No devices match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground">
        All columns sortable, outcomes filterable · <span className="font-medium text-foreground">Intent</span> = save /
        compare / watch events — the strongest leading indicator that a page will convert once it has a buy link.
      </p>
    </div>
  )
}
