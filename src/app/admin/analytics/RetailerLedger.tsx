// Retailer ledger — every channel as a line in the money ledger.
//
// Server-rendered. One row per retailer key seen in the click stream (plus
// idle rates below), with the channel state: priced, taxonomy-mismatched
// (case/spacing drift prices clicks at zero), unpriced (no rate at all) or
// idle (rate configured, no clicks). Actuals are joined from the imported
// earnings ledger so each channel carries its own reconciliation delta.

import { CHANNEL_COLORS, CHANNEL_LABELS, type ChannelState } from '@/lib/analytics/revenue'

export type LedgerRow = {
  retailer: string
  clicks: number
  rate: number
  proxy: number
  state: ChannelState
  sharePct: number
  actual: number
  variance: number
}

type Props = {
  rows: LedgerRow[]
  idleRates: string[]
}

const STATE_TINT: Record<ChannelState, string> = {
  priced: CHANNEL_COLORS.priced,
  'tax_mismatch': CHANNEL_COLORS['tax_mismatch'],
  unpriced: CHANNEL_COLORS.unpriced,
  idle: CHANNEL_COLORS.idle,
}

export default function RetailerLedger({ rows, idleRates }: Props) {
  if (rows.length === 0 && idleRates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No channels yet — the ledger opens when clicks arrive or a rate is configured.
      </p>
    )
  }

  return (
    <div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium">Channel</th>
                <th className="py-2 pr-3 text-left font-medium">State</th>
                <th className="py-2 pr-3 text-right font-medium">Clicks</th>
                <th className="py-2 pr-3 text-right font-medium">Share</th>
                <th className="py-2 pr-3 text-right font-medium">Rate</th>
                <th className="py-2 pr-3 text-right font-medium">Proxy</th>
                <th className="py-2 pr-3 text-right font-medium">Actual</th>
                <th className="py-2 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.retailer} className="border-b border-border last:border-0 hover:bg-foreground/5">
                  <td className="py-2 pr-3 font-medium capitalize text-foreground">{row.retailer}</td>
                  <td className="py-2 pr-3">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: `${STATE_TINT[row.state]}22`, color: STATE_TINT[row.state] }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATE_TINT[row.state] }} />
                      {CHANNEL_LABELS[row.state]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.clicks.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.sharePct}%</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                    {row.rate > 0 ? `${Math.round(row.rate * 100 * 100) / 100}%` : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">KES {row.proxy.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                    {row.actual > 0 ? `KES ${row.actual.toLocaleString()}` : '—'}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${row.variance > 0 ? 'text-amber-400' : row.variance < 0 ? 'text-brand-primary' : 'text-muted-foreground'}`}
                  >
                    {row.actual > 0 || row.proxy > 0
                      ? `${row.variance >= 0 ? '+' : ''}${Math.round(row.variance * 100) / 100}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">No clicks in this period.</p>
      )}

      {idleRates.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Idle rates (configured, clickless): {idleRates.map((r) => r).join(' · ')} — either the catalog stopped
          linking to these retailers or the rate keys no longer match the buy-box labels.
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Δ = proxy − actual per channel. A mismatch state means the recorded retailer name does not literally match
        the rate-sheet key (casing/spacing) — the join is the taxonomy check, and the queue carries the fix.
      </p>
    </div>
  )
}
