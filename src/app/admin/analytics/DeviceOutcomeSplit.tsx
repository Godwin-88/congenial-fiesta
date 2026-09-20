// Outcome split ribbon — "where every device-page view ended up".
//
// A single 100%-wide stacked ribbon (hand-rolled so the segments stay crisp at
// small widths) plus a legend. This is the one-number answer to "how much of
// our catalog demand can actually earn?", and it sits directly above the fix
// queue so the same four categories read straight down the page.

import {
  DEVICE_OUTCOME_COLORS,
  DEVICE_OUTCOME_DESCRIPTIONS,
  DEVICE_OUTCOME_LABELS,
  DEVICE_OUTCOME_ORDER,
  type DeviceOutcome,
} from '@/lib/analytics/deviceOutcome'

type Props = {
  outcomes: Array<{ outcome: DeviceOutcome; label: string; views: number; sharePct: number }>
  totalViews: number
}

export default function DeviceOutcomeSplit({ outcomes, totalViews }: Props) {
  const byOutcome = new Map(outcomes.map((o) => [o.outcome, o]))
  const ordered = DEVICE_OUTCOME_ORDER.map((outcome) => {
    const row = byOutcome.get(outcome)
    return {
      outcome,
      label: DEVICE_OUTCOME_LABELS[outcome],
      views: row?.views ?? 0,
      sharePct: row?.sharePct ?? 0,
    }
  })
  const visible = ordered.filter((o) => o.views > 0)

  if (totalViews <= 0 || visible.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No device-page views in this period.</p>
  }

  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-lg border border-border">
        {visible.map((row) => (
          <div
            key={row.outcome}
            title={`${row.label}: ${row.views.toLocaleString()} views (${row.sharePct}%)`}
            className="flex items-center justify-center text-[11px] font-semibold text-white/95"
            style={{ width: `${row.sharePct}%`, backgroundColor: DEVICE_OUTCOME_COLORS[row.outcome] }}
          >
            {row.sharePct >= 7 ? `${row.sharePct}%` : ''}
          </div>
        ))}
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {visible.map((row) => (
          <li key={row.outcome} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: DEVICE_OUTCOME_COLORS[row.outcome] }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {row.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {row.views.toLocaleString()} views · {row.sharePct}%
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">{DEVICE_OUTCOME_DESCRIPTIONS[row.outcome]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
