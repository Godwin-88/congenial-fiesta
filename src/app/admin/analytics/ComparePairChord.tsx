// Compare-pair chord — which rivalries the audience actually runs.
//
// A pair is two device slugs sorted alphabetically (the canonical /compare URL
// shape). The chord reads as arcs: the thickest arcs are the rivalries worth
// editorial love — a full H2H review, a video, or a price-drop alert that
// names both devices.

'use client'

import { useMemo } from 'react'

type Props = {
  pairs: Array<{ pair: string[]; label: string; names: string[]; runs: number; sharePct: number; href: string }>
  totalRuns: number
}

const ARC_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16']

function PairChordSvg({ pairs, total }: { pairs: Props['pairs']; total: number }) {
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const radius = 84
  const inner = 62

  const devices = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of pairs) for (const slug of p.pair) counts.set(slug, (counts.get(slug) ?? 0) + p.runs)
    const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    const totalWeight = Math.max(1, ordered.reduce((s, [, w]) => s + w, 0))
    let angle = -Math.PI / 2
    return ordered.map(([slug, weight], i) => {
      const span = (weight / totalWeight) * Math.PI * 2
      const node = { slug, start: angle, end: angle + span, color: ARC_COLORS[i % ARC_COLORS.length] }
      angle += span
      return node
    })
  }, [pairs])

  const point = (angle: number, r: number): [number, number] => [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  const arcPath = (start: number, end: number, r: number): string => {
    const [x1, y1] = point(start, r)
    const [x2, y2] = point(end, r)
    const large = end - start > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const indexOf = (slug: string) => devices.findIndex((d) => d.slug === slug)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-60 w-60" role="img" aria-label="Comparison pair chord">
      {devices.map((d) => (
        <path
          key={d.slug}
          d={arcPath(d.start, d.end, radius)}
          fill="none"
          stroke={d.color}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      {pairs.slice(0, 6).map((p, i) => {
        if (p.pair.length !== 2) return null
        const a = indexOf(p.pair[0])
        const b = indexOf(p.pair[1])
        if (a === -1 || b === -1 || a === b) return null
        const midA = (devices[a].start + devices[a].end) / 2
        const midB = (devices[b].start + devices[b].end) / 2
        const [x1, y1] = point(midA, inner)
        const [x2, y2] = point(midB, inner)
        const totalRuns = Math.max(1, total)
        return (
          <g key={p.pair.join('+')}>
            <title>
              {p.label}: {p.runs} runs ({p.sharePct}%)
            </title>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ARC_COLORS[i % ARC_COLORS.length]}
              strokeOpacity={0.35 + 0.5 * (p.runs / totalRuns)}
              strokeWidth={1 + 7 * (p.runs / totalRuns)}
              strokeLinecap="round"
            />
          </g>
        )
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--foreground)">
        {pairs.length}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
        live rivalries
      </text>
    </svg>
  )
}

export default function ComparePairChord({ pairs, totalRuns }: Props) {
  const listed = pairs.slice(0, 6)

  if (pairs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No completed comparisons yet — pair runs appear once visitors open /compare with two or more devices.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="shrink-0">
        <PairChordSvg pairs={listed} total={Math.max(1, listed[0]?.runs ?? 1)} />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{totalRuns.toLocaleString()}</span> total pair runs
        </p>
      </div>
      <ol className="min-w-0 flex-1 space-y-2">
        {listed.map((p, i) => (
          <li key={p.pair.join('+')} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: ARC_COLORS[i % ARC_COLORS.length] }}
            />
            <a href={p.href} className="min-w-0 flex-1 truncate text-xs text-brand-primary hover:underline" title={p.label}>
              {p.label}
            </a>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {p.runs} · {p.sharePct}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
