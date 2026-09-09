'use client'

import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { SOURCE_COLORS, SOURCE_LABELS, sectionLabel } from './chartFormat'

type FlowNode = { name: string }
type FlowLink = { source: number; target: number; value: number }

type Props = {
  data: { nodes: FlowNode[]; links: FlowLink[] }
}

function nodeColor(name: string): string {
  return SOURCE_COLORS[name] ?? '#64748B'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowNodeCell(props: any) {
  const { x, y, width, height, index, payload } = props
  const name = payload?.name ?? ''
  const isSource = SOURCE_LABELS[name] !== undefined
  const label = isSource ? SOURCE_LABELS[name] : sectionLabel(name)
  return (
    <g key={`node-${index}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={nodeColor(name)}
        fillOpacity={0.9}
        rx={3}
        stroke="#0B1120"
        strokeOpacity={0.4}
      />
      {isSource ? (
        <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fill="var(--muted-foreground)">
          {label}
        </text>
      ) : (
        <text x={x - 6} y={y + height / 2 + 4} fontSize={11} textAnchor="end" fill="var(--muted-foreground)">
          {label}
        </text>
      )}
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowLinkPath(props: any) {
  const {
    sourceX, targetX, sourceY, targetY,
    sourceControlX, targetControlX, linkWidth, index, payload,
  } = props
  const sourceName = payload?.source?.name ?? ''
  const color = SOURCE_COLORS[sourceName] ?? '#64748B'
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  return (
    <path
      key={`link-${index}`}
      d={d}
      fill="none"
      stroke={color}
      strokeOpacity={0.32}
      strokeWidth={Math.max(linkWidth, 0.5)}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const raw = String(item.name ?? '')
  const friendly = raw.includes(' - ')
    ? raw.split(' - ').map((part) => SOURCE_LABELS[part] ?? sectionLabel(part)).join(' → ')
    : SOURCE_LABELS[raw] ?? sectionLabel(raw)
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{friendly}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(item.value ?? 0).toLocaleString()} views
      </p>
    </div>
  )
}

export default function TrafficFlowChart({ data }: Props) {
  if (!data.nodes.length || !data.links.length) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No flow data available</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <Sankey
          data={data}
          nodePadding={22}
          nodeWidth={12}
          linkCurvature={0.6}
          margin={{ top: 8, right: 132, bottom: 8, left: 8 }}
          node={FlowNodeCell}
          link={FlowLinkPath}
        >
          <Tooltip content={<FlowTooltip />} />
        </Sankey>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Left:</span> traffic source · <span className="font-medium text-foreground">Right:</span> content section · ribbon width = views
      </p>
    </div>
  )
}