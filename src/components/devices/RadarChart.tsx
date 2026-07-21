'use client'

import { useEffect, useRef } from 'react'

interface RadarChartProps {
  scores: {
    display: number
    performance: number
    camera: number
    battery: number
    value: number
  }
}

const LABELS = ['Display', 'Performance', 'Camera', 'Battery', 'Value']
const AXES = 5
const ANGLE_STEP = (2 * Math.PI) / AXES
const RADIUS = 100
const CENTER = 120
const LABEL_OFFSET = 20

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  }
}

export function RadarChart({ scores }: RadarChartProps) {
  const polygonRef = useRef<SVGPolygonElement>(null)
  const values = [scores.display, scores.performance, scores.camera, scores.battery, scores.value]

  useEffect(() => {
    const el = polygonRef.current
    if (el) {
      const length = el.getTotalLength?.() ?? 0
      el.style.strokeDasharray = `${length}`
      el.style.strokeDashoffset = `${length}`
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1s ease-in-out'
        el.style.strokeDashoffset = '0'
      })
    }
  }, [scores])

  const gridPoints: { x: number; y: number }[][] = []
  for (let level = 1; level <= 5; level++) {
    const r = (RADIUS / 5) * level
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < AXES; i++) {
      pts.push(polarToCartesian(CENTER, CENTER, r, ANGLE_STEP * i))
    }
    gridPoints.push(pts)
  }

  const dataPoints = values.map((v, i) =>
    polarToCartesian(CENTER, CENTER, (v / 10) * RADIUS, ANGLE_STEP * i),
  )
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  const axisEndpoints = Array.from({ length: AXES }, (_, i) =>
    polarToCartesian(CENTER, CENTER, RADIUS, ANGLE_STEP * i),
  )

  const labelPositions = Array.from({ length: AXES }, (_, i) =>
    polarToCartesian(CENTER, CENTER, RADIUS + LABEL_OFFSET, ANGLE_STEP * i),
  )

  return (
    <svg
      viewBox="0 0 240 240"
      className="h-60 w-60"
      role="img"
      aria-label="Fweezy Score radar chart"
    >
      {/* Grid levels */}
      {gridPoints.map((pts, level) => (
        <polygon
          key={level}
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axisEndpoints.map((ep, i) => (
        <line
          key={i}
          x1={CENTER}
          y1={CENTER}
          x2={ep.x}
          y2={ep.y}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Data polygon */}
      <polygon
        ref={polygonRef}
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="var(--brand-primary)"
        fillOpacity={0.3}
        stroke="var(--brand-primary)"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--brand-primary)"
        />
      ))}

      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <text
          key={i}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-[10px]"
        >
          {LABELS[i]}
        </text>
      ))}
    </svg>
  )
}