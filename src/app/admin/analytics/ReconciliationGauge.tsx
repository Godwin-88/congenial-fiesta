// Reconciliation gauge — proxy vs actual as a paired bar, not a vanity number.
//
// Server-rendered. The bar pair makes the question physical: the proxy bar is
// what the site promises, the actual bar is what networks paid. Blind (no
// actuals) renders the actual bar as a dashed outline — absence you can see.

import { RECON_COLORS, RECON_DESCRIPTIONS, RECON_LABELS, type ReconState } from '@/lib/analytics/revenue'

type Props = {
  proxy: number
  actual: number
  variance: number
  variancePct: number
  state: ReconState
}

export default function ReconciliationGauge({ proxy, actual, variance, variancePct, state }: Props) {
  const max = Math.max(proxy, actual, 0.0001)
  const proxyPct = Math.max((proxy / max) * 100, proxy > 0 ? 2 : 0)
  const actualPct = Math.max((actual / max) * 100, actual > 0 ? 2 : 0)

  return (
    <div>
      <div className="space-y-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Proxy (clicks × rate)</span>
            <span className="font-semibold tabular-nums text-foreground">KES {proxy.toLocaleString()}</span>
          </div>
          <div className="h-5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${proxyPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Actual (imported earnings)</span>
            <span className="font-semibold tabular-nums text-foreground">
              {actual > 0 ? `KES ${actual.toLocaleString()}` : '— none imported'}
            </span>
          </div>
          <div
            className="h-5 w-full overflow-hidden rounded-full border border-dashed"
            style={{
              borderColor: actual > 0 ? 'transparent' : 'var(--border)',
              backgroundColor: actual > 0 ? 'var(--muted)' : 'transparent',
            }}
          >
            {actual > 0 && (
              <div className="h-full rounded-full" style={{ width: `${actualPct}%`, backgroundColor: RECON_COLORS[state] }} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ backgroundColor: `${RECON_COLORS[state]}22`, color: RECON_COLORS[state] }}
        >
          {RECON_LABELS[state]}
        </span>
        <span className="tabular-nums text-muted-foreground">
          variance {variance >= 0 ? '+' : ''}
          {variance.toLocaleString()} KES ({variancePct >= 0 ? '+' : ''}
          {variancePct}%)
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{RECON_DESCRIPTIONS[state]}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Tolerance ±10% — inside the band the rate sheet reads honest and the numbers are board-exportable.
      </p>
    </div>
  )
}
