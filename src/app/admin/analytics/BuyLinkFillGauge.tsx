// Buy-link fill-rate gauge — kpi_buy_fill as an instrument.
//
// Deliberately hand-rolled SVG (not a chart library): a gauge is a single arc
// plus a target marker, so it stays a server component with zero client JS and
// inherits the theme through CSS variables. Underneath sits the link-count
// distribution, because "0% covered" and "covered once" are different risks.

type Props = {
  fillRatePct: number
  targetPct?: number
  published: number
  withBuyLink: number
  withoutBuyLink: number
  buckets: Array<{ label: string; devices: number }>
}

const SIZE = 200
const CENTRE = SIZE / 2
const RADIUS = 72
const STROKE = 15
const SWEEP_FRACTION = 0.75 // 270° of arc, opening at the bottom
const START_ANGLE = 135 // rotate the arc so the gap sits at the bottom
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const BUCKET_COLORS: Record<string, string> = {
  'No link': '#EF4444',
  '1 link': '#F59E0B',
  '2–3 links': '#10B981',
  '4+ links': '#3B82F6',
}

function gaugeColor(value: number, target: number): string {
  if (value >= target) return '#10B981'
  if (value >= target / 2) return '#F59E0B'
  return '#EF4444'
}

export default function BuyLinkFillGauge({
  fillRatePct,
  targetPct = 80,
  published,
  withBuyLink,
  withoutBuyLink,
  buckets,
}: Props) {
  const value = Math.max(0, Math.min(100, fillRatePct))
  const arc = CIRCUMFERENCE * SWEEP_FRACTION
  const filled = (arc * value) / 100
  const color = gaugeColor(value, targetPct)
  const targetAngle = START_ANGLE + SWEEP_FRACTION * 360 * (targetPct / 100)
  const maxBucket = Math.max(1, ...buckets.map((b) => b.devices))

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-48 w-48" role="img"
          aria-label={`Buy-link fill rate ${value}% against a ${targetPct}% target`}>
          <g transform={`rotate(${START_ANGLE} ${CENTRE} ${CENTRE})`}>
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.09}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
            />
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            />
          </g>
          {/* Target marker — a radial tick at the goal so the gap is visible. */}
          <g transform={`rotate(${targetAngle} ${CENTRE} ${CENTRE})`}>
            <line
              x1={CENTRE}
              y1={CENTRE - RADIUS + STROKE / 2 + 3}
              x2={CENTRE}
              y2={CENTRE - RADIUS - STROKE / 2 - 3}
              stroke="var(--foreground)"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
          <text x={CENTRE} y={CENTRE - 4} textAnchor="middle" fontSize={34} fontWeight={700} fill="var(--foreground)">
            {value}%
          </text>
          <text x={CENTRE} y={CENTRE + 20} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
            buy-link fill rate
          </text>
          <text x={CENTRE} y={CENTRE + 40} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
            {withBuyLink}/{published} devices monetised
          </text>
        </svg>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          target {targetPct}% · <span className="font-medium text-foreground">{withoutBuyLink}</span> devices short
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Buy links per published device
        </p>
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{bucket.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="flex h-full items-center justify-end rounded-full px-2 text-[10px] font-medium text-white"
                  style={{
                    width: `${(bucket.devices / maxBucket) * 100}%`,
                    minWidth: bucket.devices > 0 ? 18 : 0,
                    backgroundColor: BUCKET_COLORS[bucket.label] ?? 'var(--brand-primary)',
                  }}
                >
                  {bucket.devices > 0 ? bucket.devices : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Arc</span> = share of published devices with ≥1 working buy
          link · <span className="font-medium text-foreground">tick</span> = {targetPct}% target · one working link is
          the minimum, 2–3 gives the buy box price competition.
        </p>
      </div>
    </div>
  )
}
