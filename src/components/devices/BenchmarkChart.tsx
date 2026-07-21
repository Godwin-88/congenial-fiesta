'use client'

import { useEffect, useRef } from 'react'

interface BenchmarkChartProps {
  benchmarks: {
    geekbenchSingle?: number | null
    geekbenchMulti?: number | null
    antutu?: number | null
    pcmark?: number | null
  } | null
}

const REFERENCE_MAX: Record<string, number> = {
  geekbenchSingle: 3000,
  geekbenchMulti: 9000,
  antutu: 2500000,
  pcmark: 20000,
}

const LABELS: Record<string, string> = {
  geekbenchSingle: 'Geekbench Single',
  geekbenchMulti: 'Geekbench Multi',
  antutu: 'AnTuTu 10',
  pcmark: 'PCMark',
}

function BenchmarkBar({
  label,
  score,
  max,
  index,
}: {
  label: string
  score: number
  max: number
  index: number
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const percent = Math.min((score / max) * 100, 100)
  const topPercent = Math.round((1 - score / max) * 100)

  useEffect(() => {
    const el = barRef.current
    if (el) {
      el.style.width = '0%'
      requestAnimationFrame(() => {
        el.style.transition = `width 0.8s ease-out ${index * 0.15}s`
        el.style.width = `${percent}%`
      })
    }
  }, [percent, index])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">
          {score.toLocaleString()}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Top {topPercent}% of reviewed devices
      </p>
    </div>
  )
}

export function BenchmarkChart({ benchmarks }: BenchmarkChartProps) {
  if (!benchmarks) return null

  const entries = Object.entries(REFERENCE_MAX)
    .filter(([key]) => {
      const val = benchmarks[key as keyof typeof benchmarks]
      return val !== null && val !== undefined && val > 0
    })
    .map(([key, max]) => ({
      key,
      label: LABELS[key],
      score: benchmarks[key as keyof typeof benchmarks] as number,
      max,
    }))

  if (entries.length === 0) return null

  return (
    <div className="space-y-5">
      {entries.map((entry, i) => (
        <BenchmarkBar
          key={entry.key}
          label={entry.label}
          score={entry.score}
          max={entry.max}
          index={i}
        />
      ))}
    </div>
  )
}