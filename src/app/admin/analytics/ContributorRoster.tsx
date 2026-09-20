// Contributor roster — who carries the community, graded by effort.
//
// Admin-only surface: contributors are keyed by user id (no PII leaves the
// database). The grade mix tells the nurture story — advocates are an asset,
// newcomers are the pipeline — and the roster names the top hands by helpful
// votes received (value) before raw volume (effort).

import { CONTRIBUTOR_GRADE_COLORS, CONTRIBUTOR_GRADE_LABELS, type ContributorGrade } from '@/lib/analytics/community'
import type { CommunityContributorRow } from '@/lib/analytics/queries'

type Props = {
  contributors: CommunityContributorRow[]
  gradeMix: Array<{ grade: string; label: string; contributors: number; sharePct: number }>
  total: number
}

const GRADE_BADGE: Record<ContributorGrade, string> = {
  advocate: 'bg-purple-500/15 text-purple-400',
  regular: 'bg-blue-500/15 text-blue-400',
  newcomer: 'bg-emerald-500/15 text-emerald-400',
}

export default function ContributorRoster({ contributors, gradeMix, total }: Props) {
  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No contributing users in this period — the roster fills with the first rating or comment from a signed-in user.
      </p>
    )
  }

  const visible = contributors.slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {gradeMix.map((g) => (
          <span
            key={g.grade}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CONTRIBUTOR_GRADE_COLORS[g.grade as ContributorGrade] ?? '#94A3B8' }}
            />
            <span className="text-muted-foreground">{g.label}:</span>
            <span className="font-semibold text-foreground">
              {g.contributors.toLocaleString()} · {g.sharePct}%
            </span>
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">#</th>
              <th className="py-2 pr-3 text-left font-medium">Contributor</th>
              <th className="py-2 pr-3 text-left font-medium">Grade</th>
              <th className="py-2 pr-3 text-right font-medium">Ratings</th>
              <th className="py-2 pr-3 text-right font-medium">Comments</th>
              <th className="py-2 pr-3 text-right font-medium">Helpful received</th>
              <th className="py-2 pr-3 text-right font-medium">Votes cast</th>
              <th className="py-2 text-right font-medium">Devices</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, i) => (
              <tr key={c.userId} className="border-b border-border last:border-0 hover:bg-foreground/5">
                <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-3">
                  <span className="font-mono text-[11px] text-foreground" title={c.userId}>
                    {c.userId.slice(0, 8)}…
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    last {c.lastContributionAt ? new Date(c.lastContributionAt).toISOString().split('T')[0] : '—'}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${GRADE_BADGE[c.grade]}`}
                  >
                    {CONTRIBUTOR_GRADE_LABELS[c.grade]}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">{c.ratings}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">{c.comments}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold text-foreground">{c.helpfulReceived}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{c.votesCast}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{c.devices}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Ranked by helpful votes received (value) then contributions (effort) — user ids are shown truncated; this
        roster is admin-only. {total > visible.length ? `Top ${visible.length} of ${total}.` : ''}
      </p>
    </div>
  )
}
