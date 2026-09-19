// Chipset benchmark aggregation (Ranking §15).
// ============================================================================
// The same SoC can have many benchmark rows from different sources/devices.
// The engine uses a consistent representative value — the MEDIAN of active
// rows per metric — never the max, never cherry-picked (§15).

export interface RawBenchmarkRow {
  benchmark_name: string
  single_core: number | null
  multi_core: number | null
  gpu_score: number | null
  active?: boolean
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface AggregatedChipsetBenchmarks {
  single_core: number | null
  multi_core: number | null
  gpu_score: number | null
  sampleCounts: { geekbench6: number; gpu: number }
}

/**
 * Aggregate raw benchmark rows for ONE chipset into a single representative
 * triple. Geekbench 6 single/multi medians are preferred; GPU median across
 * any benchmark that reports one.
 */
export function aggregateChipsetBenchmarks(
  rows: RawBenchmarkRow[],
): AggregatedChipsetBenchmarks {
  const gbRows = rows.filter((r) => r.benchmark_name === 'geekbench6' && r.active !== false)
  const single = median(
    gbRows.map((r) => r.single_core).filter((v): v is number => v != null && v > 0),
  )
  const multi = median(
    gbRows.map((r) => r.multi_core).filter((v): v is number => v != null && v > 0),
  )
  const gpu = median(
    rows
      .filter((r) => r.active !== false)
      .map((r) => r.gpu_score)
      .filter((v): v is number => v != null && v > 0),
  )
  return {
    single_core: single,
    multi_core: multi,
    gpu_score: gpu,
    sampleCounts: { geekbench6: gbRows.length, gpu: rows.filter((r) => r.gpu_score != null).length },
  }
}

