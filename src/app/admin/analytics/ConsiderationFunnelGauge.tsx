// Funnel gauge — how far the consideration stages shrink.
//
// Hand-rolled SVG (server component, zero client JS): each stage is a bar
// scaled to the widest stage, with the step conversion stamped on it. Width is
// the message — the funnel reads top-down in one glance, no axis decoding.

import { FUNNEL_COLORS, FUNNEL_DESCRIPTIONS, type FunnelStage } from '@/lib/analytics/consideration'

type Props = {
  stages: Array<{
    stage: FunnelStage
    label: string
    visitors: number
    shareOfBrowsersPct: number
    stepConversionPct: number | null
  }>
  browserToBuyerPct: number
}

export default function ConsiderationFunnelGauge({ stages, browserToBuyerPct }: Props) {
  const maxVisitors = Math.max(1, ...stages.map((s) => s.visitors))
  const totalVisitors = stages.reduce((s, stage) => s + stage.visitors, 0)

  if (totalVisitors === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No funnel traffic yet — device-page views will open the top of the funnel automatically.
      </p>
    )
  }

  return (
    <div>
      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const width = stage.visitors > 0 ? Math.max(4, (stage.visitors / maxVisitors) * 100) : 0
          return (
            <div key={stage.stage}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}</span>
                  {stage.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{stage.visitors.toLocaleString()}</span>
                  {' · '}
                  {stage.shareOfBrowsersPct}%
                </span>
              </div>
              <div
                className="mt-1 flex h-7 items-center overflow-hidden rounded-lg bg-foreground/5"
                title={`${stage.label}: ${stage.visitors.toLocaleString()} visitors — ${FUNNEL_DESCRIPTIONS[stage.stage]}`}
              >
                {stage.visitors > 0 ? (
                  <div
                    className="flex h-full items-center justify-end rounded-lg px-2 text-[11px] font-semibold text-white"
                    style={{ width: `${width}%`, backgroundColor: FUNNEL_COLORS[stage.stage] }}
                  >
                    {stage.stepConversionPct !== null ? `${stage.stepConversionPct}% of prev` : 'top'}
                  </div>
                ) : null}
              </div>
              {i === 0 ? null : (
                <p className="mt-1 text-[11px] text-muted-foreground">{FUNNEL_DESCRIPTIONS[stage.stage]}</p>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">End-to-end:</span> {browserToBuyerPct}% of device-page browsers
        clicked a buy link this period. The stages count distinct visitors, so a visitor who saves <em>and</em>{' '}
        compares appears in both — the story is the shrinkage, and which bar shrinks fastest.
      </p>
    </div>
  )
}
