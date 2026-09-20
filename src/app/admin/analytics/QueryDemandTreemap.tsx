// Query demand treemap — the demand surface in one picture.
//
// The only nested-rectangle visual on the dashboard (every other chart is a
// bar, heatmap, chord, gauge or table). Area is SEARCH VOLUME, so the eye lands
// on what the audience actually asks for; the FILL is the answer state, so the
// same picture answers "does the catalog serve it?". A big red tile is the
// single most expensive hole on the site.
//
// Layout is a squarified strip algorithm in a 100×56 unit box (pure, no deps),
// rendered with percentage widths/heights so it scales to any card width.

import { ANSWER_STATE_COLORS, ANSWER_STATE_LABELS, QUERY_SHAPE_COLORS, type QueryAnswerState, type QueryShape } from '@/lib/analytics/searchStory'

type Tile = {
  query: string
  searches: number
  state: QueryAnswerState
  shape: QueryShape
  sharePct: number
}

type Props = {
  tiles: Tile[]
  maxSearches: number
}

const BOX_W = 100
const BOX_H = 56

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Squarified strip layout: greedy rows that keep tiles as square as possible. */
function squarify(values: number[], width: number, height: number): Rect[] {
  const total = values.reduce((s, v) => s + v, 0)
  if (total <= 0) return []
  const scale = (width * height) / total
  const areas = values.map((v) => v * scale)

  const rects: Rect[] = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let i = 0

  while (i < areas.length) {
    const vertical = w >= h
    const side = vertical ? h : w
    let rowSum = 0
    let bestWorst = Number.POSITIVE_INFINITY
    const row: number[] = []

    while (i < areas.length) {
      const candidateSum = rowSum + areas[i]
      const thickness = candidateSum / side
      if (thickness <= 0) break
      const worst = Math.max(
        ...row.concat(areas[i]).map((a) => {
          const len = a / thickness
          return Math.max(len / thickness, thickness / len)
        }),
      )
      if (row.length === 0 || worst <= bestWorst) {
        row.push(areas[i])
        rowSum = candidateSum
        bestWorst = worst
        i++
      } else break
    }

    const thickness = rowSum / side
    let offset = 0
    for (const a of row) {
      const len = a / thickness
      rects.push(
        vertical
          ? { x, y: y + offset, w: thickness, h: len }
          : { x: x + offset, y, w: len, h: thickness },
      )
      offset += len
    }

    if (vertical) {
      x += thickness
      w -= thickness
    } else {
      y += thickness
      h -= thickness
    }
  }

  return rects
}

export default function QueryDemandTreemap({ tiles, maxSearches }: Props) {
  if (tiles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No searches recorded in this period — the demand surface appears once the /search page is used.
      </p>
    )
  }

  const rects = squarify(
    tiles.map((t) => t.searches),
    BOX_W,
    BOX_H,
  )
  const states = Array.from(new Set(tiles.map((t) => t.state)))

  return (
    <div>
      <div className="relative w-full" style={{ height: `${BOX_H * 4}px`, minHeight: '190px' }}>
        {tiles.map((tile, i) => {
          const r = rects[i]
          if (!r) return null
          // Zero-result tiles keep a solid alarm fill; answered tiles are tinted
          // by their own volume so the biggest demand still reads darkest.
          const alpha = tile.state === 'zero' ? 0.85 : 0.35 + 0.55 * Math.min(1, tile.searches / Math.max(1, maxSearches))
          const showLabel = r.w * r.h > 26
          return (
            <a
              key={tile.query}
              href={`/search?q=${encodeURIComponent(tile.query)}`}
              title={`"${tile.query}" — ${tile.searches} searches (${tile.sharePct}% of demand) · ${ANSWER_STATE_LABELS[tile.state]} · shape: ${tile.shape.replace('_', ' ')}`}
              className="absolute overflow-hidden rounded-sm border border-background/70 p-1 transition-opacity hover:opacity-80"
              style={{
                left: `${r.x}%`,
                top: `${(r.y / BOX_H) * 100}%`,
                width: `${r.w}%`,
                height: `${(r.h / BOX_H) * 100}%`,
                backgroundColor: ANSWER_STATE_COLORS[tile.state],
                opacity: alpha,
              }}
            >
              {showLabel && (
                <span className="block truncate text-[10px] font-medium leading-tight text-white/95">
                  {tile.query}
                </span>
              )}
              {showLabel && r.w * r.h > 60 && (
                <span className="block text-[10px] tabular-nums text-white/80">{tile.searches}</span>
              )}
              {showLabel && r.w * r.h > 60 && (
                <span
                  className="mt-0.5 block h-1 w-5 rounded-full"
                  style={{ backgroundColor: QUERY_SHAPE_COLORS[tile.shape] }}
                  title={`Intent shape: ${tile.shape.replace('_', ' ')}`}
                />
              )}
            </a>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        {states.map((state) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANSWER_STATE_COLORS[state] }} />
            <span className="text-muted-foreground">{ANSWER_STATE_LABELS[state]}</span>
          </span>
        ))}
        <span className="text-muted-foreground">
          · area = search volume · a big red tile is the most expensive hole on the site
        </span>
      </div>
    </div>
  )
}
