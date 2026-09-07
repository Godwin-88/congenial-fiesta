import Link from 'next/link'

export type ZeroReportItem = {
  deviceSlug: string
  brandSlug: string
  views: number
}

type Props = {
  data: ZeroReportItem[]
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function ZeroReportTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center">
        No devices with zero affiliate clicks in this period — keep it up! 🎉
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-2 pr-4 font-medium">Rank</th>
            <th className="text-left py-2 pr-4 font-medium">Device</th>
            <th className="text-right py-2 pr-4 font-medium">Views</th>
            <th className="text-right py-2 font-medium">Review</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={item.deviceSlug} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-4">
                <span className="text-brand-primary">{titleCase(item.deviceSlug)}</span>
                <span className="text-xs text-muted-foreground ml-2">{titleCase(item.brandSlug)}</span>
              </td>
              <td className="py-2 pr-4 text-right text-foreground">{item.views.toLocaleString()}</td>
              <td className="py-2 text-right">
                <Link
                  href={`/devices/${item.brandSlug}/${item.deviceSlug}`}
                  className="text-brand-primary text-xs hover:underline"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}