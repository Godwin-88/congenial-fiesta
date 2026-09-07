import Link from 'next/link'

export type TopDeviceItem = {
  deviceSlug: string
  brandSlug: string
  views: number
  clicks: number
  ctr: number
}

type Props = {
  data: TopDeviceItem[]
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function TopDevicesTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center">
        No device page views in this period
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
            <th className="text-right py-2 pr-4 font-medium">Clicks</th>
            <th className="text-right py-2 font-medium">CTR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const ctrColor =
              item.ctr >= 5 ? 'text-green-500' : item.ctr >=​ 2 ? 'text-amber-400' : 'text-red-500'
            return (
              <tr key={item.deviceSlug} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/devices/${item.brandSlug}/${item.deviceSlug}`}
                    className="text-brand-primary hover:underline"
                  >
                    {titleCase(item.deviceSlug)}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-2">{titleCase(item.brandSlug)}</span>
                </td>
                <td className="py-2 pr-4 text-right text-foreground">{item.views.toLocaleString()}</td>
                <td className="py-2 pr-4 text-right text-foreground">{item.clicks.toLocaleString()}</td>
                <td className={`py-2 text-right font-semibold ${ctrColor}`}>{item.ctr}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}