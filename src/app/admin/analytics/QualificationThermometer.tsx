// Qualification thermometer — hot / warm / cold as horizontal bands.
//
// Three bands because the audience question is a trichotomy: who can buy now,
// who is one nudge away, who is browsing. The bands are proportional to visitor
// counts, stamped with the tier's average score, and carry the tier meaning in
// a legend — the cold band is deliberately pale so a fat cold tail reads as a
// content problem, not a number.

import {
  QUALIFICATION_COLORS,
  QUALIFICATION_DESCRIPTIONS,
  type QualificationTier,
} from '@/lib/analytics/consideration'

type Props = {
  tiers: Array<{ tier: QualificationTier; label: string; visitors: number; sharePct: number; avgScore: number }>
  total: number
  avgScore: number
}

export default function QualificationThermometer({ tiers, total, avgScore }: Props) {
  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scored visitors yet — the thermometer fills as intent and click events arrive.
      </p>
    )
  }

  const visible = tiers.filter((t) => t.visitors > 0)

  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
        {visible.map((row) => (
          <div
            key={row.tier}
            title={`${row.label}: ${row.visitors.toLocaleString()} visitors (${row.sharePct}%) · avg score ${row.avgScore}`}
            className="flex items-center justify-center text-[11px] font-semibold text-white/95"
            style={{ width: `${row.sharePct}%`, backgroundColor: QUALIFICATION_COLORS[row.tier] }}
          >
            {row.sharePct >= 8 ? `${row.label} ${row.sharePct}%` : ''}
          </div>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {tiers.map((row) => (
          <li key={row.tier} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: QUALIFICATION_COLORS[row.tier] }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {row.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {row.visitors.toLocaleString()} visitors · {row.sharePct}% · avg {row.avgScore}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">{QUALIFICATION_DESCRIPTIONS[row.tier]}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> scored visitors · average score{' '}
        <span className="font-medium text-foreground">{avgScore}</span> · compare=3 · save=2 · watch=1 · related=1 ·
        click=2 · signed-in +2.
      </p>
    </div>
  )
}
