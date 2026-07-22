'use client'

type CTRItem = {
  deviceSlug: string
  clicks: number
  views: number
  ctr: number
}

type Props = {
  data: CTRItem[]
}

export default function AffiliateTable({ data }: Props) {
  if (data.length === 0) {
    return <tr><td colSpan={6} className="py-4 text-center text-gray-500">No affiliate data</td></tr>
  }

  return (
    <>
      {data.map((item, i) => {
        const ctrColor = item.ctr >= 5 ? 'text-green-500' : item.ctr >= 2 ? 'text-amber-400' : 'text-red-500'
        return (
          <tr key={item.deviceSlug} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
            <td className="py-2 pr-4 text-[#0066FF]">{item.deviceSlug}</td>
            <td className="py-2 pr-4 text-gray-300">All retailers</td>
            <td className="py-2 pr-4 text-right">{item.clicks.toLocaleString()}</td>
            <td className="py-2 pr-4 text-right">{item.views.toLocaleString()}</td>
            <td className={`py-2 text-right font-semibold ${ctrColor}`}>{item.ctr}%</td>
          </tr>
        )
      })}
    </>
  )
}