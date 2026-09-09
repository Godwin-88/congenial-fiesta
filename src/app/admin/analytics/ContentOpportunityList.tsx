'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'

type Props = {
  data: Array<{ query: string; count: number }>
  total: number
}

export default function ContentOpportunityList({ data, total }: Props) {
  if (!data.length) {
    return (
      <p className="text-muted-foreground text-center py-8 text-sm">
        No zero-result searches in the period — the catalog is matching demand.
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-4 font-medium">#</th>
              <th className="text-left py-2 pr-4 font-medium">Search query</th>
              <th className="text-right py-2 pr-4 font-medium">Misses</th>
              <th className="text-right py-2 font-medium">Idea</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((q, i) => (
              <tr key={q.query} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-4 text-foreground font-medium">&quot;{q.query}&quot;</td>
                <td className="py-2 pr-4 text-right">{q.count.toLocaleString()}</td>
                <td className="py-2 text-right">
                  <Link
                    href={`/search?q=${encodeURIComponent(q.query)}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                  >
                    <Search className="h-3 w-3" /> finds nothing
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {total.toLocaleString()} missed searches this period — every row is a content gap (guide, device
        page, or comparison) that search demand proves people want.
      </p>
    </div>
  )
}