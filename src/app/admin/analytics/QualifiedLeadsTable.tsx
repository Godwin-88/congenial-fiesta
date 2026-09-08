import type { QualifiedLead } from '@/lib/analytics/queries'

type Props = {
  data: QualifiedLead[]
}

function bucketBadge(bucket: QualifiedLead['bucket']): string {
  switch (bucket) {
    case 'hot':
      return 'bg-red-500/15 text-red-400'
    case 'warm':
      return 'bg-amber-500/15 text-amber-400'
    default:
      return 'bg-foreground/10 text-muted-foreground'
  }
}

export default function QualifiedLeadsTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center">
        No intent events yet — as users save, compare and watch reviews, high-intent visitors appear here.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-2 pr-4 font-medium">Visitor</th>
            <th className="text-left py-2 pr-4 font-medium">Tier</th>
            <th className="text-right py-2 pr-4 font-medium">Intent score</th>
            <th className="text-right py-2 pr-4 font-medium">Signals</th>
            <th className="text-right py-2 pr-4 font-medium">Affiliate clicks</th>
            <th className="text-right py-2 font-medium">Last active</th>
          </tr>
        </thead>
        <tbody>
          {data.map((lead) => (
            <tr key={lead.fpId} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                {lead.fpId.slice(0, 12)}…
                {lead.signedIn && <span className="ml-1 text-brand-primary" title="Signed-in visitor">✓</span>}
              </td>
              <td className="py-2 pr-4">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${bucketBadge(lead.bucket)}`}>
                  {lead.bucket}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-semibold text-foreground">{lead.score}</td>
              <td className="py-2 pr-4 text-right text-muted-foreground">
                {lead.compares}C · {lead.saves}S · {lead.watches}W · {lead.relatedClicks}R
              </td>
              <td className="py-2 pr-4 text-right">{lead.affiliateClicks}</td>
              <td className="py-2 text-right text-muted-foreground text-xs">
                {lead.lastSeenAt ? new Date(lead.lastSeenAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}