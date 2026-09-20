'use client'

// Ghost-demand flow — brand → what the page view actually lands on.
//
// Same Sankey idiom as the Traffic tab's source→section flow (kept consistent
// on purpose) but the story is different: the ribbon width that lands on
// "Monetised" is earned attention, and everything else is leakage you can fix
// in the catalog. Colour is keyed to the OUTCOME node, not the brand, so the
// red/amber ribbons stand out no matter which brands are on the left.

import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'

import {
  DEVICE_OUTCOME_COLORS,
  DEVICE_OUTCOME_DESCRIPTIONS,
  deviceOutcomeFromLabel,
  type DeviceOutcome,
} from '@/lib/analytics/deviceOutcome'

type FlowNode = { name: string }
type FlowLink = { source: number; target: number; value: number }

type Props = {
  data: { nodes: FlowNode[]; links: FlowLink[] }
  outcomes: Array<{ outcome: DeviceOutcome; label: string; views: number; sharePct: number }>
}

const BRAND_COLOR = '#3B82F6'

function nodeColor(name: string): string {
  const outcome = deviceOutcomeFromLabel(name)
  return outcome ? DEVICE_OUTCOME_COLORS[outcome] : BRAND_COLOR
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutcomeNodeCell(props: any) {
  const { x, y, width, height, index, payload } = props
  const name = String(payload?.name ?? '')
  const isOutcome = deviceOutcomeFromLabel(name) !== null
  return (
    <g key={`node-${index}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={nodeColor(name)}
        fillOpacity={isOutcome ? 0.95 : 0.75}
        rx={3}
        stroke="#0B1120"
        strokeOpacity={0.35}
      />
      {isOutcome ? (
        <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fill="var(--muted-foreground)">
          {name}
        </text>
      ) : (
        <text x={x - 6} y={y + height / 2 + 4} fontSize={11} textAnchor="end" fill="var(--muted-foreground)">
          {name.length > 16 ? `${name.slice(0, 16)}…` : name}
        </text>
      )}
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutcomeLinkPath(props: any) {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props
  const targetName = String(payload?.target?.name ?? '')
  const color = nodeColor(targetName)
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  return (
    <path
      key={`link-${index}`}
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={0.3}
      strokeWidth={Math.max(linkWidth, 0.5)}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutcomeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const raw = String(item.name ?? '')
  const parts = raw.includes(' - ') ? raw.split(' - ') : [raw]
  const outcome = parts.length > 1 ? parts[1] : ''
  const outcomeKey = outcome ? deviceOutcomeFromLabel(outcome) : null
  const note = outcomeKey ? DEVICE_OUTCOME_DESCRIPTIONS[outcomeKey] : null
  return (
    <div className="max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{parts.join(' → ')}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{Number(item.value ?? 0).toLocaleString()} views</p>
      {note ? <p className="mt-1 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  )
}

export default function DeviceDemandFlowChart({ data, outcomes }: Props) {
  const leaned = outcomes.filter((o) => o.outcome !== 'monetised' && o.views > 0)

  if (!data.nodes.length || !data.links.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No device-page views in this period.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <Sankey
          data={data}
          nodePadding={20}
          nodeWidth={12}
          linkCurvature={0.6}
          margin={{ top: 8, right: 150, bottom: 8, left: 8 }}
          node={OutcomeNodeCell}
          link={OutcomeLinkPath}
        >
          <Tooltip content={<OutcomeTooltip />} />
        </Sankey>
      </ResponsiveContainer>
      <div className="mt-1 space-y-1">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Left:</span> brand whose pages were viewed ·{' '}
          <span className="font-medium text-foreground">Right:</span> what the view actually landed on · ribbon width =
          views. Follow a widening red or amber ribbon back to the left to find the brand carrying the leak.
        </p>
        {leaned.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Current leak:{' '}
            {leaned
              .map((o) => `${o.label.toLowerCase()} ${o.sharePct}%`)
              .join(' · ')}
          </p>
        ) : (
          <p className="text-[11px] text-emerald-400">Every device-page view in this period landed on a monetised page.</p>
        )}
      </div>
    </div>
  )
}
