// Budget ladder — what prospects say they can spend, in ladder order.
//
// The advertise form only offers a fixed ladder, so free text is impossible
// here and the row order is meaningful: lowest band at the top (matching the
// form), climbing to $10,000+ and custom. Width is share of window inquiries,
// and each row carries its tier rollup (Entry / Mid / Top) so the commercial
// mix reads without arithmetic.
//
// Press rows ride separately — a coverage request is not a budget, and mixing
// it into the ladder is the classic way a sponsorship report lies to itself.
//
// Server component: static bars with title hints (same idiom as the Content
// tab's ContentAgeChart); no dates on the axis, so no hover card is required.

import type { OutreachInsights } from '@/lib/analytics/queries'
import { BUDGET_LADDER_LABELS, PRESS_BUDGET_LABEL, rankToTier } from '@/lib/analytics/outreach'

type Props = {
  budgets: OutreachInsights['demand']['budgets']
  total: number
}

const TIER_COLORS: Record<string, string> = {
  Entry: '#94A3B8',
  Mid: '#10B981',
  Top: '#F59E0B',
  Press: '#8B5CF6',
  Other: '#EF4444',
}

export default function OutreachBudgetLadder({ budgets, total }: Props) {
  if (budgets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No budgets stated in this window — the ladder fills with the first inquiry.
      </p>
    )
  }

  const max = Math.max(1, ...budgets.map((b) => b.count))
  const commercial = budgets.filter((b) => !b.isPress)
  const offLadder = budgets.filter((b) => !b.isPress && b.rank < 0)
  const offLadderAsks = offLadder.reduce((s, b) => s + b.count, 0)
  const tiers = ['Entry', 'Mid', 'Top'] as const
  const tierRows = tiers
    .map((tier) => ({
      tier,
      label: BUDGET_LADDER_LABELS[tier],
      count: commercial.filter((b) => rankToTier(b.budgetRange) === tier).reduce((s, b) => s + b.count, 0),
    }))
    .filter((row) => row.count > 0)

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {budgets.map((row) => {
          const tier = rankToTier(row.budgetRange)
          return (
            <div
              key={row.budgetRange}
              title={
                row.isPress
                  ? `${PRESS_BUDGET_LABEL} — ${row.count} of ${total} inquiries (${row.sharePct}%)`
                  : `${row.budgetRange} · ${tier} tier — ${row.count} of ${total} inquiries (${row.sharePct}%)`
              }
            >
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[tier] ?? '#94A3B8' }}
                  />
                  <span className="truncate font-medium text-foreground">
                    {row.isPress ? 'Press — no budget' : row.budgetRange}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {row.count.toLocaleString()} · {row.sharePct}%
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (row.count / max) * 100)}%`,
                    backgroundColor: TIER_COLORS[tier] ?? '#94A3B8',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {tierRows.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Commercial tier rollup
          </p>
          <div className="flex flex-wrap gap-2">
            {tierRows.map((row) => (
              <span
                key={row.tier}
                title={row.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_COLORS[row.tier] }} />
                <span className="font-medium text-foreground">{row.tier}</span>
                <span className="tabular-nums text-muted-foreground">{row.count.toLocaleString()}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Form order, lowest → highest. A ladder heavy at Entry with a mid/top-heavy catalog is a packaging problem —
            the prospects are qualifying themselves down before they ever talk to you.
          </p>
          {offLadder.length > 0 && (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {offLadderAsks} inquir{offLadderAsks === 1 ? 'y' : 'ies'}
              </span>{' '}
              used a band that is not on the form&apos;s ladder ({offLadder.map((b) => `“${b.budgetRange}”`).join(', ')}) —
              counted here but excluded from the tier rollup. Form and catalog have drifted apart: reconcile the ladder
              options before reading the mix as a pricing signal.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
