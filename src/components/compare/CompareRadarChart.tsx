'use client'

import { useEffect, useRef } from 'react'

const LABELS = ['Display', 'Performance', 'Camera', 'Battery', 'Value']
const AXES = 5
const ANGLE_STEP = (2 * Math.PI) / AXES
const RADIUS = 100
const CENTER = 120
const LABEL_OFFSET = 20

const COLORS = ['#0066FF', '#F59E0B', '#22C55E']

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  }
}

interface DeviceData {
  name: string
  scores: {
    display: number
    performance: number
    camera: number
    battery: number
    value: number
  }
}

interface CompareRadarChartProps {
  devices: DeviceData[]
  className?: string
}

export default function CompareRadarChart({ devices, className }: CompareRadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const polygonRefs = useRef<(SVGPolygonElement | null)[]>([])

  useEffect(() => {
    polygonRefs.current.forEach((el) => {
      if (el) {
        const length = el.getTotalLength?.() ?? 0
        el.style.strokeDasharray = `${length}`
        el.style.strokeDashoffset = `${length}`
        requestAnimationFrame(() => {
          el.style.transition = 'stroke-dashoffset 1s ease-in-out'
          el.style.strokeDashoffset = '0'
        })
      }
    })
  }, [devices])

  const gridPoints: { x: number; y: number }[][] = []
  for (let level = 1; level <= 5; level++) {
    const r = (RADIUS / 5) * level
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < AXES; i++) {
      pts.push(polarToCartesian(CENTER, CENTER, r, ANGLE_STEP * i))
    }
    gridPoints.push(pts)
  }

  const axisEndpoints = Array.from({ length: AXES }, (_, i) =>
    polarToCartesian(CENTER, CENTER, RADIUS, ANGLE_STEP * i),
  )

  const labelPositions = Array.from({ length: AXES }, (_, i) =>
    polarToCartesian(CENTER, CENTER, RADIUS + LABEL_OFFSET, ANGLE_STEP * i),
  )

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox="0 0 240 240"
        className="h-60 w-60 mx-auto"
        role="img"
        aria-label="Comparison radar chart"
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

        {/* Data polygons */}
        {devices.map((device, idx) => {
          const values = [
            device.scores.display,
            device.scores.performance,
            device.scores.camera,
            device.scores.battery,
            device.scores.value,
          ]
          const dataPoints = values.map((v, i) =>
            polarToCartesian(CENTER, CENTER, (v / 10) * RADIUS, ANGLE_STEP * i),
          )

          return (
            <g key={device.name}>
              <polygon
                ref={(el) => {
                  polygonRefs.current[idx] = el
                }}
                points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.2}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
              />
              {dataPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </g>
          )
        })}

        {/* Labels */}
        {labelPositions.map((lp, i) => (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-[9px]"
          >
            {LABELS[i]}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {devices.map((device, idx) => (
          <div key={device.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-sm text-foreground">{device.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
