'use client'

import { Treemap, Tooltip, ResponsiveContainer } from 'recharts'
import { SOURCE_COLORS, SOURCE_LABELS, tint } from './chartFormat'

type TreeLeaf = { name: string; value: number; source?: string }
type TreeNode = { name: string; value: number; children?: TreeLeaf[] }

type Props = { data: TreeNode[] }

// Cells: depth 1 = source (soft colour wash), depth 2 = platform (tinted block
// with label). Source hue = channel; the legend below ties colour to channel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreemapCell(props: any) {
  const { x, y, width, height, depth, name, source } = props
  if (depth === 0) return null
  const base = depth === 1 ? SOURCE_COLORS[name] : SOURCE_COLORS[source ?? name] ?? '#64748B'
  const fill = depth === 1 ? base : tint(base, '#FFFFFF', 0.3)
  const showText = depth === 2 && width > 26 && height > 18
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={Math.max(width, 0)}
        height={Math.max(height, 0)}
        fill={fill}
        fillOpacity={depth === 1 ? 0.22 : 0.92}
        stroke="#0B1120"
        strokeOpacity={0.55}
        strokeWidth={1}
        rx={3}
      />
      {showText && (
        <text
          x={x + 5}
          y={y + height / 2 + 4}
          fontSize={11}
          fontWeight={500}
          fill="#FFFFFF"
        >
          {name}
        </text>
      )}
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const node = payload[0].payload
  if (!node || !node.depth) return null
  const isSource = node.depth === 1
  const label = isSource
    ? SOURCE_LABELS[node.name] ?? node.name
    : `${node.name} · via ${SOURCE_LABELS[node.source] ?? node.source}`
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {Number(node.value ?? 0).toLocaleString()} views
      </p>
    </div>
  )
}

export default function TrafficSourceTreeChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No source data available</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <Treemap
          data={data}
          dataKey="value"
          nameKey="name"
          type="flat"
          nodeInset={2}
          nodeGap={2}
          aspectRatio={1.4}
          isUpdateAnimationActive={false}
          content={<TreemapCell />}
        >
          <Tooltip content={<TreeTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {data.map((node) => (
          <span key={node.name} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SOURCE_COLORS[node.name] }} />
            {SOURCE_LABELS[node.name] ?? node.name}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Area</span> = share of period views · <span className="font-medium text-foreground">blocks</span> = platforms per channel
      </p>
    </div>
  )
}