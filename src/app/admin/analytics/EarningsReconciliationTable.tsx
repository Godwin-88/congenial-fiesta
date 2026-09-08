import type { EarningsReconciliation } from '@/lib/analytics/queries'

type Props = {
  data: EarningsReconciliation
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function EarningsReconciliationTable({ data }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-2 pr-4 font-medium">Retailer</th>
            <th className="text-right py-2 pr-4 font-medium">Clicks</th>
            <th className="text-right py-2 pr-4 font-medium">Est. revenue proxy</th>
            <th className="text-right py-2 pr-4 font-medium">Actual earnings</th>
            <th className="text-right py-2 font-medium">Variance</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.retailer} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="py-2 pr-4 text-foreground capitalize">{row.retailer}</td>
              <td className="py-2 pr-4 text-right">{row.clicks.toLocaleString()}</td>
              <td className="py-2 pr-4 text-right">{fmt(row.proxyWeighted)}</td>
              <td className="py-2 pr-4 text-right">{fmt(row.actualEarnings)}</td>
              <td className={`py-2 text-right font-medium ${row.variance === 0 ? 'text-muted-foreground' : row.variance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {row.variance === 0 ? '—' : `${row.variance > 0 ? '' : ''}${fmt(row.variance)}`}
              </td>
            </tr>
          ))}
          {data.rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-muted-foreground">
                No affiliate clicks in this period
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-medium">
            <td className="py-2 pr-4 text-foreground">Total</td>
            <td className="py-2 pr-4 text-right" />
            <td className="py-2 pr-4 text-right text-foreground">{fmt(data.totalProxy)}</td>
            <td className="py-2 pr-4 text-right text-foreground">{fmt(data.totalActual)}</td>
            <td className={`py-2 text-right ${data.totalVariance === 0 ? 'text-muted-foreground' : data.totalVariance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {data.totalVariance === 0 ? '—' : fmt(data.totalVariance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}