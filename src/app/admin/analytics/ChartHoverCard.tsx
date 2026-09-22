// Shared hover card for every analytics chart tooltip.
//
// One markup contract — title (the date, already formatted by the caller via
// formatHoverDate/formatAxisDate), one row per metric (colour dot + label +
// value), optional footer line — so a hover on the Campaigns tab reads exactly
// like a hover on Content or Traffic. Pure markup (no 'use client' needed), so
// it works inside both recharts custom tooltips and hand-rolled charts.
//
// Sizing contract (the truncation fix): a card that only ever grows in-flow
// can never be clipped by the bordered `Card` (overflow-hidden) or by an
// `overflow-x-auto` scroll region — so this card is sized to its content
// (inline-block, max-w-80, wrapping titles/values, truncating labels) and the
// only render rule is: never absolutely positioned, never inside a scroll
// container. Recharts tooltips already float in a portal, so they escape
// clipping; hand-rolled band/strip charts render this card in-flow ABOVE the
// visual (see CampaignReachChart).

type HoverRow = {
  color: string
  label: string
  value: string
}

type Props = {
  title: string
  subtitle?: string
  rows: HoverRow[]
  footer?: string
}

export default function ChartHoverCard({ title, subtitle, rows, footer }: Props) {
  return (
    <div className="inline-block max-w-80 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold break-words text-foreground">{title}</p>
      {subtitle ? <p className="mt-0.5 break-words text-[11px] text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? <p className="mt-1.5 break-words border-t border-border pt-1.5 text-[11px] text-muted-foreground">{footer}</p> : null}
    </div>
  )
}
