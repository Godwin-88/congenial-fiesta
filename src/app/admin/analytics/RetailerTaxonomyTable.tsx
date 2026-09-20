// Retailer taxonomy reconciliation — do the three registries agree?
//
// A click only becomes commission when the catalog (buy_links[].retailer), the
// click log (affiliate_clicks.retailer) and the rate sheet
// (affiliate_commission_rates.retailer) all speak the same name — and the buy
// box only renders the five known keys, everything else falls through to
// "Other". This table makes any disagreement visible instead of silent.

type Row = {
  retailer: string
  label: string
  inCatalog: boolean
  inClicks: boolean
  inCommission: boolean
  buyBoxRenders: boolean
  clicks: number
  mismatch: boolean
  note: string
}

type Props = { rows: Row[] }

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400/70'}`}
      aria-hidden="true"
    />
  )
}

export default function RetailerTaxonomyTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No retailers configured yet.</p>
  }

  const mismatches = rows.filter((r) => r.mismatch).length

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {mismatches === 0 ? (
          <span className="text-emerald-400">All {rows.length} registries agree — every recorded click can be priced.</span>
        ) : (
          <>
            <span className="font-semibold text-amber-400">{mismatches}</span> of {rows.length} retailer keys disagree
            across registries — those clicks are either unrendered in the buy box or unpriced in the revenue proxy.
          </>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Retailer key</th>
              <th className="py-2 pr-3 text-center font-medium">Catalog</th>
              <th className="py-2 pr-3 text-center font-medium">Clicks</th>
              <th className="py-2 pr-3 text-center font-medium">Rate sheet</th>
              <th className="py-2 pr-3 text-center font-medium">Buy box</th>
              <th className="py-2 pr-3 text-right font-medium">Clicks (period)</th>
              <th className="py-2 text-left font-medium">Finding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.retailer} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-3">
                  <span className="text-foreground">{row.label}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{row.retailer}</span>
                </td>
                <td className="py-2 pr-3 text-center">
                  <Dot ok={row.inCatalog} />
                </td>
                <td className="py-2 pr-3 text-center">
                  <Dot ok={row.inClicks} />
                </td>
                <td className="py-2 pr-3 text-center">
                  <Dot ok={row.inCommission} />
                </td>
                <td className="py-2 pr-3 text-center">
                  <Dot ok={row.buyBoxRenders} />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.clicks.toLocaleString()}</td>
                <td className={`py-2 text-xs ${row.mismatch ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {row.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Green dot</span> = key present in that registry · retailer keys are
        matched case-sensitively by <span className="font-mono">/api/out/[device]/[retailer]</span>, so a stray capital
        letter means the click never reaches the outbound redirect.
      </p>
    </div>
  )
}
