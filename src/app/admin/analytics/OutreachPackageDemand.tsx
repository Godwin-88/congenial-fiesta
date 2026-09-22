// Package demand — stated interest (free text) matched against the live catalog.
//
// This is the Outreach tab's governance artifact, the way the UTM registry is
// the Campaigns tab's: the advertise form collects package_interest as free
// text, and the matching outcome decides whether a quote can be sent at all.
//
// Four verdicts, from the shared vocabulary:
//   catalog   → token-identical to a live package (quote it as-is)
//   fuzzy     → one side contains the other / shared token (quote after a check)
//   unmatched → the prospect asked for something the catalog does not sell
//   none      → the field was empty (no signal either way)
//
// The unmatched rows are the point. Free text that matches nothing is not a
// data typo — it is demand you cannot quote, and the fix is a rename or a new
// package, not a stricter form.

import type { OutreachInsights } from '@/lib/analytics/queries'
import { PACKAGE_MATCH_LABELS, type PackageMatchKind } from '@/lib/analytics/outreach'

type Props = {
  packages: OutreachInsights['demand']['packages']
  livePackages: OutreachInsights['demand']['livePackages']
  stated: number
  unmatched: number
  total: number
  limit?: number
}

const KIND_COLORS: Record<PackageMatchKind, string> = {
  catalog: '#10B981',
  fuzzy: '#F59E0B',
  unmatched: '#EF4444',
  none: '#94A3B8',
}

export default function OutreachPackageDemand({
  packages,
  livePackages,
  stated,
  unmatched,
  total,
  limit = 12,
}: Props) {
  if (packages.length === 0) {
    return (
      <div className="space-y-3">
        <p className="py-6 text-center text-sm text-muted-foreground">
          {livePackages.length === 0
            ? 'No stated interest to match, and the live catalog is empty — sponsorship_packages has no rows, so nothing can be matched or quoted yet.'
            : 'No prospect stated a package interest in this window, so there is nothing to match. The live catalog is listed below.'}
        </p>
        {livePackages.length > 0 && <SupplyChips livePackages={livePackages} />}
      </div>
    )
  }

  const rows = packages.slice(0, limit)
  const hidden = packages.length - rows.length
  const matched = packages.filter((p) => p.kind === 'catalog' || p.kind === 'fuzzy').length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Stated interests:</span>
          <span className="font-semibold text-foreground">{stated.toLocaleString()}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
          <span className="text-muted-foreground">Quotable:</span>
          <span className="font-semibold text-foreground">
            {matched} of {packages.length} kinds
          </span>
        </span>
        {unmatched > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1">
            <span className="text-muted-foreground">Unquotable asks:</span>
            <span className="font-semibold text-foreground">{unmatched.toLocaleString()}</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Stated interest</th>
              <th className="py-2 pr-3 text-left font-medium">Verdict</th>
              <th className="py-2 pr-3 text-left font-medium">Live package</th>
              <th className="py-2 text-right font-medium">Asks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.interest} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="max-w-[15rem] py-2 pr-3">
                  <span className="block truncate text-foreground" title={row.interest}>
                    &ldquo;{row.interest}&rdquo;
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${KIND_COLORS[row.kind]}22`, color: KIND_COLORS[row.kind] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: KIND_COLORS[row.kind] }} />
                    {PACKAGE_MATCH_LABELS[row.kind]}
                  </span>
                </td>
                <td className="max-w-[12rem] py-2 pr-3">
                  {row.matched ? (
                    <span className="block truncate text-xs text-emerald-400" title={row.matched}>
                      {row.matched}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {row.kind === 'unmatched' ? 'nothing — quote manually' : '—'}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-foreground">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {hidden} more stated kind{hidden === 1 ? '' : 's'} below the cut — export the outreach demand CSV for the full
          list.
        </p>
      )}

      {livePackages.length > 0 && <SupplySide livePackages={livePackages} total={total} />}
    </div>
  )
}

function SupplyChips({ livePackages }: { livePackages: Props['livePackages'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {livePackages.map((pkg) => (
        <span
          key={pkg.name}
          title={`${pkg.tier}${pkg.highlighted ? ' · highlighted on the advertise page' : ''} — ${pkg.inquiries} inquiries matched this package`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            pkg.inquiries > 0 ? 'border-border bg-background' : 'border-dashed border-border bg-transparent'
          }`}
        >
          <span className={pkg.inquiries > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>{pkg.name}</span>
          <span className="tabular-nums text-muted-foreground">{pkg.inquiries}</span>
          {pkg.highlighted && (
            <span className="text-[10px] text-brand-primary" title="Highlighted as most popular">
              ★
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

function SupplySide({ livePackages, total }: { livePackages: Props['livePackages']; total: number }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Supply side — inquiries landed per live package
      </p>
      <SupplyChips livePackages={livePackages} />
      <p className="mt-2 text-[11px] text-muted-foreground">
        A dashed chip is a package nobody asked for by name this window ({total.toLocaleString()} inquiries in total). That
        is a positioning question, not an inventory one.
      </p>
    </div>
  )
}
