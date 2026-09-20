// Campaign tag registry — the UTM lifecycle discipline, as a table.
//
// This is the tab's governance artifact and nothing else on the dashboard does
// it: every raw tag tuple that arrived in the period, graded against the house
// convention (lowercase · hyphenated · no whitespace · no date/version noise ·
// source and medium always, medium from the shared vocabulary).
//
// The rows are keyed on the RAW values on purpose. `Ramadan Sale` and
// `ramadan-sale` are two rows here and two lines in every downstream report —
// which is precisely the cost the registry exists to make visible.

import type { CampaignTagRow } from '@/lib/analytics/queries'
import {
  TAG_COMPLIANCE_COLORS,
  TAG_ISSUE_META,
  VERDICT_COLORS,
  VERDICT_LABELS,
} from '@/lib/analytics/campaigns'

type Props = {
  campaigns: CampaignTagRow[]
  cleanSharePct: number
  limit?: number
}

export default function CampaignTagRegistry({ campaigns, cleanSharePct, limit = 20 }: Props) {
  if (campaigns.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        The registry is empty — no campaign tag has been recorded in this period, so there is no tag convention to
        police yet.
      </p>
    )
  }

  const rows = campaigns.slice(0, limit)
  const hidden = campaigns.length - rows.length
  const broken = campaigns.filter((c) => c.compliance === 'broken').length
  const warn = campaigns.filter((c) => c.compliance === 'warn').length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Tag tuples:</span>
          <span className="font-semibold text-foreground">{campaigns.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
          <span className="text-muted-foreground">Clean:</span>
          <span className="font-semibold text-foreground">
            {campaigns.length - broken - warn} of {campaigns.length}
          </span>
        </span>
        {warn > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">
            <span className="text-muted-foreground">Needs cleanup:</span>
            <span className="font-semibold text-foreground">{warn}</span>
          </span>
        )}
        {broken > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1">
            <span className="text-muted-foreground">Broken convention:</span>
            <span className="font-semibold text-foreground">{broken}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
          <span className="text-muted-foreground">Tagged views on clean tags:</span>
          <span className="font-semibold text-foreground">{cleanSharePct}%</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">#</th>
              <th className="py-2 pr-3 text-left font-medium">Campaign</th>
              <th className="py-2 pr-3 text-left font-medium">Source</th>
              <th className="py-2 pr-3 text-left font-medium">Medium</th>
              <th className="py-2 pr-3 text-left font-medium">Channel</th>
              <th className="py-2 pr-3 text-right font-medium">Views</th>
              <th className="py-2 pr-3 text-right font-medium">Clicks</th>
              <th className="py-2 pr-3 text-right font-medium">/1k</th>
              <th className="py-2 pr-3 text-left font-medium">Compliance</th>
              <th className="py-2 text-right font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={`${c.source}|${c.medium}|${c.campaign}|${i}`}
                className="border-b border-border last:border-0 hover:bg-foreground/5"
              >
                <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="max-w-[12rem] py-2 pr-3">
                  <span className="block truncate font-mono text-xs text-foreground" title={c.campaign || '(not set)'}>
                    {c.campaign || '(campaign not set)'}
                  </span>
                  {c.lastSeen && (
                    <span className="text-[10px] text-muted-foreground">
                      last seen {c.lastSeen.slice(0, 10)}
                      {c.stale ? ' · gone quiet' : ''}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-muted-foreground">{c.source || '—'}</td>
                <td className="py-2 pr-3 text-xs text-muted-foreground">{c.medium || '—'}</td>
                <td className="py-2 pr-3 text-xs text-muted-foreground">{c.channelLabel}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">{c.views.toLocaleString()}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                  {c.clicks.toLocaleString()}
                  {c.outboundTaggedClicks > 0 && (
                    <span
                      className="ml-1 text-[10px] text-muted-foreground"
                      title={`${c.outboundTaggedClicks} clicks whose OUTBOUND buy link carried this campaign value (retailer-side tagging) — context, not visit attribution`}
                    >
                      ({c.outboundTaggedClicks} out)
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{c.clickRatePer1k}</td>
                <td className="py-2 pr-3">
                  {c.issues.length === 0 ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: `${TAG_COMPLIANCE_COLORS.clean}22`, color: TAG_COMPLIANCE_COLORS.clean }}
                    >
                      Clean
                    </span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {c.issues.map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${TAG_COMPLIANCE_COLORS[c.compliance]}22`,
                            color: TAG_COMPLIANCE_COLORS[c.compliance],
                          }}
                          title={TAG_ISSUE_META[issue].action}
                        >
                          {TAG_ISSUE_META[issue].label}
                        </span>
                      ))}
                    </span>
                  )}
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
      </div>

      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {hidden} more tag tuple{hidden === 1 ? '' : 's'} below the cut — export the campaign ledger CSV for the full
          registry.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        House convention: lowercase, hyphen-separated, no whitespace, no date or version noise, always a source and a
        medium. Clicks are visit-attributed (the campaign the visitor entered on); values tagged &ldquo;out&rdquo; are
        clicks whose outbound buy link carried the same campaign string and are shown as context only.
      </p>
    </div>
  )
}

