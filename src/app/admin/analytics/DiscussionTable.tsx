// Discussion table — where dialogue lives, read two ways.
//
// Same rows, two lenses: by comment volume (most discussed) or by helpful
// votes (most useful). helpfulMode switches the ranking column and the
// highlighted metric, so one component serves both leaderboards.

import type { CommunityDeviceRow } from '@/lib/analytics/queries'

type Props = {
  rows: CommunityDeviceRow[]
  helpfulMode?: boolean
  limit?: number
}

export default function DiscussionTable({ rows, helpfulMode = false, limit = 8 }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {helpfulMode
          ? 'No helpful votes cast yet — votes arrive after the first threads mature.'
          : 'No device comments in this period — dialogue starts with the first question.'}
      </p>
    )
  }

  const visible = rows.slice(0, limit)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">Device</th>
            <th className="py-2 pr-3 text-right font-medium">{helpfulMode ? 'Helpful votes' : 'Comments'}</th>
            <th className="py-2 pr-3 text-right font-medium">{helpfulMode ? 'Comments' : 'Helpful votes'}</th>
            <th className="py-2 pr-3 text-right font-medium">Views</th>
            <th className="py-2 text-right font-medium">Avg</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.slug} className="border-b border-border last:border-0 hover:bg-foreground/5">
              <td className="max-w-[13rem] py-2 pr-3">
                <span className="block truncate text-foreground" title={row.name}>
                  {row.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{row.brandName}</span>
              </td>
              <td className="py-2 pr-3 text-right font-semibold tabular-nums text-foreground">
                {helpfulMode ? row.helpfulVotes : row.comments}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                {helpfulMode ? row.comments : row.helpfulVotes}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                {row.views.toLocaleString()}
              </td>
              <td className="py-2 text-right tabular-nums text-muted-foreground">{row.avgRating ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {helpfulMode
          ? 'Ranked by helpful votes received — the community answering the community.'
          : 'Ranked by comment volume — cross-check traffic: dialogue without views is orphaned proof.'}
      </p>
    </div>
  )
}
