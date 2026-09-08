import Link from 'next/link'
import type { LinkHealthSummary, LinkHealthItem } from '@/lib/analytics/queries'

type Props = {
  summary: LinkHealthSummary
  brokenLinks: LinkHealthItem[]
}

export default function LinkHealthTable({ summary, brokenLinks }: Props) {
  const cards = [
    { label: 'Total buy links', value: summary.total.toLocaleString(), tone: 'text-foreground' },
    { label: 'Healthy', value: summary.ok.toLocaleString(), tone: 'text-emerald-400' },
    { label: 'Broken / flag', value: summary.broken.toLocaleString(), tone: summary.broken > 0 ? 'text-red-400' : 'text-foreground' },
  ]

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {summary.lastCheckedAt && (
        <p className="text-xs text-muted-foreground mb-3">
          Last checked: {new Date(summary.lastCheckedAt).toLocaleString()}
        </p>
      )}

      {brokenLinks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4 font-medium">Device</th>
                <th className="text-left py-2 pr-4 font-medium">Retailer</th>
                <th className="text-left py-2 pr-4 font-medium">URL</th>
                <th className="text-right py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {brokenLinks.map((link) => (
                <tr key={`${link.deviceSlug}-${link.retailer}`} className="border-b border-border last:border-0 hover:bg-foreground/5">
                  <td className="py-2 pr-4 text-brand-primary">{link.deviceSlug}</td>
                  <td className="py-2 pr-4 text-muted-foreground capitalize">{link.retailer}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline truncate inline-block max-w-[220px]"
                    >
                      {link.url}
                    </Link>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${link.statusCode === null ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                      {link.statusCode ?? 'unreachable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-4 text-center">
          No broken buy links — or the link-health cron hasn't run yet.
        </p>
      )}
    </div>
  )
}