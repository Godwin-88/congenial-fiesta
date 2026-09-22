// Lead scoreboard — the self-serve audience as CRM-handoff rows.
//
// Every row is one fp_id with its intent score and the raw signals that built
// it. This is the bench a salesperson would want if there were a salesperson:
// the visitor never filled a form, but they compared, saved, watched and
// clicked, and the score says how hard.
//
// Same model as the Compare tab's qualified-lead table (shared weights in
// consideration.ts) — this is the outreach-facing cut of it, capped and ranked
// by score so the top of the table is the top of the funnel.

import type { QualifiedLead } from '@/lib/analytics/queries'
import { LEAD_TEMPERATURE_COLORS, LEAD_TEMPERATURE_LABELS, isQuietLead } from '@/lib/analytics/outreach'

type Props = {
  leads: QualifiedLead[]
  limit?: number
}

export default function OutreachLeadScoreboard({ leads, limit = 20 }: Props) {
  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scored leads in this window — the scoreboard starts with the first save, compare, watch or click.
      </p>
    )
  }

  const rows = leads.slice(0, limit)
  const hidden = leads.length - rows.length

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Visitor</th>
              <th className="py-2 pr-3 text-left font-medium">Tier</th>
              <th className="py-2 pr-3 text-right font-medium">Score</th>
              <th className="py-2 pr-3 text-right font-medium">Signals (C·S·W·R)</th>
              <th className="py-2 pr-3 text-right font-medium">Clicks</th>
              <th className="py-2 text-right font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const quiet = isQuietLead(lead)
              return (
                <tr
                  key={lead.fpId}
                  className="border-b border-border last:border-0 hover:bg-foreground/5"
                  title={quiet ? 'Not seen in the last week of the window — cooling off' : undefined}
                >
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {lead.fpId.slice(0, 12)}…
                    {lead.signedIn && (
                      <span className="ml-1 text-brand-primary" title="Signed-in visitor">
                        ✓
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: `${LEAD_TEMPERATURE_COLORS[lead.bucket]}1F`,
                        color: LEAD_TEMPERATURE_COLORS[lead.bucket],
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: LEAD_TEMPERATURE_COLORS[lead.bucket] }}
                      />
                      {LEAD_TEMPERATURE_LABELS[lead.bucket]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-foreground">{lead.score}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right text-xs tabular-nums text-muted-foreground">
                    {lead.compares}·{lead.saves}·{lead.watches}·{lead.relatedClicks}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">{lead.affiliateClicks}</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">
                    {lead.lastSeenAt ? new Date(lead.lastSeenAt).toLocaleDateString() : '—'}
                    {quiet && <span className="ml-1 text-amber-400" title="Cooling off">▾</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {hidden} more scored visitor{hidden === 1 ? '' : 's'} below the cut — export the qualified-leads CSV for the
          full bench.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Score = compares×3 + saves×2 + watches + related-clicks + affiliate-clicks×2 (+ signed-in bonus) · hot ≥ 8 · warm ≥ 4.
        There is no email address behind an fp_id — these rows are for retargeting surfaces and on-site recovery, not
        outbound.
      </p>
    </div>
  )
}
