// Fair Phone Score engine (Ranking System §26–32, §44).
// ============================================================================
// Reads ONLY verified FweezyTech data (devices.specs_* + chipset_benchmarks +
// ranking_benchmarks). It never queries external sources (Principle 7).
//
//  - computeRanking(): deterministic score for one device (+ breakdown, §36)
//  - recalculateDevice(): compute + persist into device_rankings and mirror
//    the single public number into devices.scores_overall (§26a)
//  - refreshAutoBenchmarks(): move auto-calculated global bests (§30/§44) and
//    recalculate affected devices (§31)

import type { SupabaseClient } from '@supabase/supabase-js'
import { aggregateChipsetBenchmarks, type RawBenchmarkRow } from './benchmarks'
import * as cfg from './config'
import {
  processorScore,
  ramScore,
  storageScore,
  scoreBuild,
  scoreCameras,
  scoreDisplay,
  scoreBattery,
  type ProcessorBenchmarks,
} from './formula'
import { normalizeChipsetName } from '@/lib/devices/canonical-write'

export interface RankingBreakdown {
  scoring_version: string
  benchmark_version: string
  build: { points: number | null; max: number; detail: Record<string, unknown> }
  display: { points: number | null; max: number; detail: Record<string, unknown> }
  performance: {
    points: number | null
    max: number
    processor: { points: number | null; max: number; detail: Record<string, unknown> }
    ram: { points: number | null; max: number; detail: Record<string, unknown> }
    storage: { points: number | null; max: number; detail: Record<string, unknown> }
  }
  cameras: { points: number | null; max: number; detail: Record<string, unknown> }
  battery: { points: number | null; max: number; detail: Record<string, unknown> }
  total: number
  effectiveMax: number
  prorated: boolean
}

export interface DeviceSpecData {
  specs_design: Record<string, unknown> | null
  specs_display: Record<string, unknown> | null
  specs_processor: Record<string, unknown> | null
  specs_memory: Record<string, unknown> | null
  specs_camera: Record<string, unknown> | null
  specs_battery: Record<string, unknown> | null
}

export interface RankingInputs {
  device: DeviceSpecData
  chipsetBenchmarks: ProcessorBenchmarks | null
  best: {
    single_core: number
    multi_core: number
    gpu: number
    sensor_area_mm2: number
    aperture: number
  }
}

/** Deterministic component computation (§33: no randomness, no LLM). */
export function computeRanking(inputs: RankingInputs): RankingBreakdown {
  const build = scoreBuild(inputs.device.specs_design)
  const display = scoreDisplay(inputs.device.specs_display)
  const processor = processorScore(inputs.chipsetBenchmarks, {
    single_core: inputs.best.single_core,
    multi_core: inputs.best.multi_core,
    gpu_score: inputs.best.gpu,
  })
  const ram = ramScore(inputs.device.specs_memory)
  const storage = storageScore(inputs.device.specs_memory)
  const cameras = scoreCameras(inputs.device.specs_camera, {
    sensorArea: inputs.best.sensor_area_mm2,
    aperture: inputs.best.aperture,
  })
  const battery = scoreBattery(inputs.device.specs_battery)

  const perfEarned = (processor.points ?? 0) + (ram.points ?? 0) + (storage.points ?? 0)
  const perfMax = processor.max + ram.max + storage.max
  const earned =
    (build.points ?? 0) + (display.points ?? 0) + perfEarned + (cameras.points ?? 0) + (battery.points ?? 0)
  const effectiveMax = build.max + display.max + perfMax + cameras.max + battery.max

  const prorated = effectiveMax < 100
  const total = effectiveMax >= 20 ? (earned / effectiveMax) * 100 : 0 // guard: too little data

  return {
    scoring_version: cfg.FORMULA_VERSION,
    benchmark_version: cfg.BENCHMARK_VERSION,
    build: { points: build.points, max: build.max, detail: build.detail },
    display: { points: display.points, max: display.max, detail: display.detail },
    performance: {
      points: perfMax === 0 ? null : perfEarned,
      max: perfMax,
      processor: { points: processor.points, max: processor.max, detail: processor.detail },
      ram: { points: ram.points, max: ram.max, detail: ram.detail },
      storage: { points: storage.points, max: storage.max, detail: storage.detail },
    },
    cameras: { points: cameras.points, max: cameras.max, detail: cameras.detail },
    battery: { points: battery.points, max: battery.max, detail: battery.detail },
    total: Math.round(total * 1000) / 1000,
    effectiveMax,
    prorated,
  }
}

// ── Data loading + persistence ───────────────────────────────────────────────

export interface GlobalBenchmarks {
  single_core: number
  multi_core: number
  gpu: number
  sensor_area_mm2: number
  aperture: number
  brightness_nits: number
  battery_mah: number
  wired_w: number
  wireless_w: number
}

export async function loadGlobalBenchmarks(supabase: SupabaseClient): Promise<GlobalBenchmarks> {
  const { data } = await supabase
    .from('ranking_benchmarks')
    .select('key, value')
    .eq('active', true)
  const map = new Map<string, number>()
  for (const row of data ?? []) map.set(row.key, Number(row.value))
  return {
    single_core: map.get('best_single_core') ?? 3850,
    multi_core: map.get('best_multi_core') ?? 11200,
    gpu: map.get('best_gpu') ?? 5000,
    sensor_area_mm2: map.get('best_sensor_area_mm2') ?? 100,
    aperture: map.get('best_aperture') ?? 1.5,
    brightness_nits: map.get('best_brightness_nits') ?? 2500,
    battery_mah: map.get('best_battery_mah') ?? 7500,
    wired_w: map.get('best_wired_w') ?? 150,
    wireless_w: map.get('best_wireless_w') ?? 100,
  }
}

/**
 * Minimum "known" points (out of 100) before an engine score may be persisted
 * into device_rankings or mirrored into devices.scores_overall. Below this the
 * score is noise dominated by what the engine could NOT read — publishing it
 * would stomp editorial scores with garbage (the OnePlus 15 = 9.1 incident).
 */
export const MIN_EFFECTIVE_MAX_TO_PUBLISH = 50

async function loadChipsetForDevice(
  supabase: SupabaseClient,
  device: DeviceSpecData,
): Promise<{ chipsetId: number | null; benchmarks: ProcessorBenchmarks | null }> {
  const chipsetName = device.specs_processor?.chipset_name as string | null
  if (!chipsetName) return { chipsetId: null, benchmarks: null }
  const wanted = normalizeChipsetName(chipsetName) ?? chipsetName
  const { data: chipset } = await supabase
    .from('chipsets')
    .select('id')
    .ilike('name', chipsetName)
    .maybeSingle()
  if (chipset) return resolveChipsetBenchmarks(supabase, chipset.id)

  // Marketing-dialect fallback: compare normalized names (®/™/"Mobile
  // Platform" stripped) against names AND aliases. The chipsets table is
  // small, so a full scan is cheaper than a fuzzy index.
  const { data: candidates } = await supabase.from('chipsets').select('id, name, aliases').limit(2000)
  const match = (candidates ?? []).find((c) => {
    const cName = normalizeChipsetName(c.name)
    if (cName && cName.toLowerCase() === wanted.toLowerCase()) return true
    return (c.aliases ?? []).some((a: string) => {
      const aNorm = normalizeChipsetName(a)
      return aNorm != null && aNorm.toLowerCase() === wanted.toLowerCase()
    })
  })
  if (!match) return { chipsetId: null, benchmarks: null }
  return resolveChipsetBenchmarks(supabase, match.id)
}

/** Load + aggregate active benchmark rows for one chipset id. */
async function resolveChipsetBenchmarks(
  supabase: SupabaseClient,
  chipsetId: number,
): Promise<{ chipsetId: number; benchmarks: ProcessorBenchmarks | null }> {
  const { data: rows } = await supabase
    .from('chipset_benchmarks')
    .select('benchmark_name, single_core, multi_core, gpu_score, active')
    .eq('chipset_id', chipsetId)
    .eq('active', true)
  const agg = aggregateChipsetBenchmarks((rows ?? []) as unknown as RawBenchmarkRow[])
  return {
    chipsetId,
    benchmarks:
      agg.single_core != null || agg.multi_core != null
        ? {
            single_core: agg.single_core ?? 0,
            multi_core: agg.multi_core ?? 0,
            gpu_score: agg.gpu_score ?? 0,
          }
        : null,
  }
}

/**
 * Recalculate + persist the ranking for one device. Mirrors the final score
 * into devices.scores_overall (the number the public site reads). Draft
 * devices CAN have an internal score for admin review (phone spec §31) —
 * public visibility is governed by RLS on device_rankings (published only).
 */
export async function recalculateDevice(
  supabase: SupabaseClient,
  deviceId: number,
): Promise<RankingBreakdown | null> {
  const { data: device } = await supabase
    .from('devices')
    .select(
      'id, specs_design, specs_display, specs_processor, specs_memory, specs_camera, specs_battery',
    )
    .eq('id', deviceId)
    .maybeSingle()
  if (!device) return null

  const { chipsetId, benchmarks } = await loadChipsetForDevice(
    supabase,
    device as unknown as DeviceSpecData,
  )
  const best = await loadGlobalBenchmarks(supabase)
  const breakdown = computeRanking({
    device: device as unknown as DeviceSpecData,
    chipsetBenchmarks: benchmarks,
    best: {
      single_core: best.single_core,
      multi_core: best.multi_core,
      gpu: best.gpu,
      sensor_area_mm2: best.sensor_area_mm2,
      aperture: best.aperture,
    },
  })

  // Only publish a score when there is enough real data to be meaningful.
  // Two tiers (§31b):
  //   - < 20 known points: pure noise, never persisted anywhere.
  //   - < 50 known points (MIN_EFFECTIVE_MAX_TO_PUBLISH): the computation runs
  //     but NOTHING is persisted and devices.scores_overall is left untouched —
  //     a low-coverage total (e.g. 9.1 from one parseable selfie camera) must
  //     never overwrite an editorial score on the field the public site reads.
  if (breakdown.effectiveMax < 20) return breakdown
  if (breakdown.effectiveMax < MIN_EFFECTIVE_MAX_TO_PUBLISH) return breakdown

  await supabase.from('device_rankings').upsert(
    {
      device_id: deviceId,
      scoring_version: breakdown.scoring_version,
      benchmark_version: breakdown.benchmark_version,
      total: breakdown.total,
      breakdown: breakdown as unknown as never,
      chipset_id: chipsetId,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'device_id,scoring_version,benchmark_version' },
  )

  await supabase
    .from('devices')
    .update({
      scores_overall: Math.round(breakdown.total * 10) / 10,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId)

  return breakdown
}

/**
 * Move auto-calculated global benchmarks to the current best values found in
 * the approved dataset (Ranking §30, §44) and recalculate affected devices
 * (§31). Admin-overridden rows (auto_calculated = false) are never touched.
 */
export async function refreshAutoBenchmarks(
  supabase: SupabaseClient,
  options: { recalcAll?: boolean } = {},
): Promise<{ updated: string[]; recalculated: number }> {
  const updated: string[] = []

  // Processor bests from chipset benchmark medians.
  const { data: allChipsets } = await supabase.from('chipsets').select('id').limit(2000)
  if (allChipsets) {
    const singles: number[] = []
    const multis: number[] = []
    const gpus: number[] = []
    for (const c of allChipsets) {
      const { data: rows } = await supabase
        .from('chipset_benchmarks')
        .select('benchmark_name, single_core, multi_core, gpu_score, active')
        .eq('chipset_id', c.id)
        .eq('active', true)
      const agg = aggregateChipsetBenchmarks((rows ?? []) as unknown as RawBenchmarkRow[])
      if (agg.single_core) singles.push(agg.single_core)
      if (agg.multi_core) multis.push(agg.multi_core)
      if (agg.gpu_score) gpus.push(agg.gpu_score)
    }
    const best = (arr: number[]) => (arr.length ? Math.max(...arr) : null)
    for (const [key, value] of [
      ['best_single_core', best(singles)],
      ['best_multi_core', best(multis)],
      ['best_gpu', best(gpus)],
    ] as Array<[string, number | null]>) {
      if (value == null) continue
      await supabase
        .from('ranking_benchmarks')
        .update({
          value,
          reference_label: 'auto-calculated from chipset benchmarks',
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .eq('auto_calculated', true)
      updated.push(key)
    }
  }

  // Spec-derived bests from published devices.
  const { data: published } = await supabase
    .from('devices')
    .select('specs_battery')
    .eq('status', 'published')
    .limit(5000)
  const batteries = (published ?? []).map((d) => (d.specs_battery ?? {}) as Record<string, unknown>)
  const bestOf = (pick: (b: Record<string, unknown>) => number) =>
    Math.max(0, ...batteries.map(pick).filter((v) => Number.isFinite(v)))
  for (const [key, value] of [
    ['best_battery_mah', bestOf((b) => Number(b.capacity_mah ?? 0))],
    ['best_wired_w', bestOf((b) => Number(b.wired_w ?? 0))],
    ['best_wireless_w', bestOf((b) => Number(b.wireless_w ?? 0))],
  ] as Array<[string, number]>) {
    if (value <= 0) continue
    await supabase
      .from('ranking_benchmarks')
      .update({
        value,
        reference_label: 'auto-calculated from published devices',
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .eq('auto_calculated', true)
    updated.push(key)
  }

  // Recalculate affected devices when any benchmark moved (§31).
  let recalculated = 0
  if (updated.length > 0 || options.recalcAll) {
    const { data: ids } = await supabase.from('device_rankings').select('device_id').limit(5000)
    for (const row of ids ?? []) {
      await recalculateDevice(supabase, row.device_id)
      recalculated++
    }
  }
  return { updated: [...new Set(updated)], recalculated }
}

/** Ranking-relevant spec fields — changing any triggers recalculation (§30). */
const RANKING_RELEVANT_FIELDS = [
  'specs_design',
  'specs_display',
  'specs_processor',
  'specs_memory',
  'specs_camera',
  'specs_battery',
]

export function isRankingRelevantChange(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  return RANKING_RELEVANT_FIELDS.some(
    (field) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(next[field] ?? null),
  )
}

export { cfg as rankingConfig }
export type { ProcessorBenchmarks }



