// Campaign landing table — where each campaign's click is actually spent.
//
// A campaign is only as good as the page it points at. This table pairs every
// campaign tuple with the landing mix it produced and the depth of that mix:
// device page / comparison / article count as DEEP (the visitor can act
// immediately), homepage / hub / video / search count as SHALLOW (the visitor
// still has to navigate, and most will not).
//
// It is the row-level companion to the Efficiency matrix: the matrix says which
// campaigns earn, this says why the ones that don't fail.

import type { CampaignTagRow } from '@/lib/analytics/queries'
import { VERDICT_COLORS, VERDICT_LABELS, TAG_COMPLIANCE_COLORS } from '@/lib/analytics/campaigns'

type Props = {
  campaigns: CampaignTagRow[]
  limit?: number
}

export default function CampaignLandingTable({ campaigns, limit = 12 }: Props) {
  if (campaigns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No campaign-tagged traffic in this period — there is no landing mix to read until a link ships with utm
        parameters.
      </p>
    )
  }

  const rows = campaigns.slice(0, limit)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 text-left font-medium">Campaign</th>
            <th className="py-2 pr-3 text-left font-medium">Source / medium</th>
            <th className="py-2 pr-3 text-right font-medium">Views</th>
            <th className="py-2 pr-3 text-right font-medium">Visitors</th>
            <th className="py-2 pr-3 text-left font-medium">Top landing</th>
            <th className="py-2 pr-3 text-right font-medium">Deep</th>
            <th className="py-2 text-right font-medium">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr
              key={`${c.source}|${c.medium}|${c.campaign}|${i}`}
              className="border-b border-border last:border-0 hover:bg-foreground/5"
            >
              <td className="max-w-[14rem] py-2 pr-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TAG_COMPLIANCE_COLORS[c.compliance] }}
                    title={`Tag compliance: ${c.complianceLabel}`}
                  />
                  <span className="truncate font-medium text-foreground" title={c.campaign}>
                    {c.campaign || '(campaign not set)'}
                  </span>
                </span>
              </td>
              <td className="py-2 pr-3 text-xs text-muted-foreground">
                {c.source || '(source not set)'} / {c.medium || '(medium not set)'}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-foreground">{c.views.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{c.visitors}</td>
              <td className="max-w-[16rem] py-2 pr-3">
                {c.topLanding ? (
                  <a
                    href={c.topLanding.path}
                    className="block truncate font-mono text-xs text-brand-primary hover:underline"
                    title={`${c.topLanding.path} · ${c.topLanding.kindLabel} · ${c.topLanding.views} views`}
                  >
                    {c.topLanding.kindLabel}: {c.topLanding.path}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right">
                <span
                  className={
                    c.deepLandingPct >= 50
                      ? 'font-semibold tabular-nums text-emerald-400'
                      : 'font-semibold tabular-nums text-amber-400'
                  }
                  title="Share of this campaign's views that landed on a device page, comparison or article."
                >
                  {c.deepLandingPct}%
                </span>
              </td>
              <td className="whitespace-nowrap py-2 text-right">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${VERDICT_COLORS[c.verdict]}22`, color: VERDICT_COLORS[c.verdict] }}
                >
                  {VERDICT_LABELS[c.verdict]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        One row per raw tag tuple. &ldquo;Deep&rdquo; counts views landing on a device page, a comparison or an article —
        the three places a visitor can act without further navigation.
      </p>
    </div>
  )
}
