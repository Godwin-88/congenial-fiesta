// Fair Phone Score formula configuration — FTS-1.0.
// ============================================================================
// "FweezyTech Device Ranking System.md". Category maximums are FIXED (§8/§46):
//   Build 10 · Display 20 · Performance 25 · Cameras 25 · Battery & Charging 20.
//
// Every factor table / threshold here is configuration, not code (§30/§50):
// hierarchies evolve as technology improves (new glass, new RAM generations…).
// The snapshot is persisted in ranking_formula_versions.config by the migration
// so any historical score is traceable to the exact factors used (§32).

export const FORMULA_VERSION = 'FTS-1.0'
export const BENCHMARK_VERSION = 'GB-2026-09'

/** Category point maximums — DO NOT CHANGE without a new formula version. */
export const CATEGORY_MAX = {
  build: 10,
  display: 20,
  performance: 25,
  cameras: 25,
  battery: 20,
} as const

/** Configurable thresholds (§10d/§25/§26/§27 — update as technology advances). */
export const THRESHOLDS = {
  brightnessNits: 2500,
  batteryMah: 7500,
  wiredW: 150,
  wirelessW: 100,
  ramGb: 16,
  storageGb: 512,
  mainCameraMp: 200,
  ppi: 500,
  refreshHz: 120,
} as const

// ── Build quality hierarchies (§9b–9d) ───────────────────────────────────────

export const GLASS_FACTORS: Array<{ match: RegExp; factor: number }> = [
  { match: /victus\s*2/i, factor: 0.9 },
  { match: /victus\+|victus plus/i, factor: 0.85 },
  { match: /victus/i, factor: 0.8 },
  { match: /gorilla\s*glass\s*(6|vi)/i, factor: 0.7 },
  { match: /gorilla\s*glass\s*5/i, factor: 0.6 },
  { match: /gorilla\s*glass\s*3/i, factor: 0.5 },
  { match: /gorilla\s*glass/i, factor: 0.5 },
  { match: /ceramic shield/i, factor: 0.95 },
  { match: /xensation|shield glass/i, factor: 0.6 },
  { match: /strengthened|toughened|hardened glass/i, factor: 0.4 },
  { match: /glass|dragontrail|dragon trail/i, factor: 0.3 },
]

export const FRAME_FACTORS: Array<{ match: RegExp; factor: number }> = [
  { match: /titanium/i, factor: 1.0 },
  { match: /stainless|steel/i, factor: 0.85 },
  { match: /alumin/i, factor: 0.7 }, // aluminium/aluminum
  { match: /composite|reinforced|fiber/i, factor: 0.4 },
  { match: /plastic|polycarbonate/i, factor: 0.3 },
]

export const BACK_FACTORS: Array<{ match: RegExp; factor: number }> = [
  { match: /ceramic/i, factor: 0.95 },
  { match: /leather|kevlar|vegan/i, factor: 0.5 },
  { match: /glass/i, factor: 0.75 },
  { match: /composite|eco-?leather/i, factor: 0.45 },
  { match: /plastic|polycarbonate/i, factor: 0.3 },
]

// ── Display hierarchy (§10a, §10c, §10e) ─────────────────────────────────────

export const DISPLAY_TYPE_FACTORS: Array<{ match: RegExp; factor: number }> = [
  { match: /ltpo/i, factor: 1.0 },
  { match: /flexible|foldable|polymer oled/i, factor: 0.85 },
  { match: /amoled|super amoled|oled|p-?oled/i, factor: 0.8 },
  { match: /ltps/i, factor: 0.55 },
  { match: /ips|lcd|tft/i, factor: 0.5 },
]

export const ADAPTIVE_MULTIPLIER = {
  fixed: 0.9,
  dynamic: 0.95,
  ltpo: 1.0,
} as const

export const HDR_FACTORS: Record<string, number> = {
  none: 0,
  hdr10: 0.55,
  hdr10_plus: 0.75,
  dolby_vision: 0.8,
  hdr10_plus_dolby_vision: 0.95,
}

// ── Performance multipliers (§16–17) ─────────────────────────────────────────

export const RAM_GENERATION: Record<string, number> = {
  LPDDR4: 0.85,
  LPDDR4X: 0.9,
  LPDDR5: 0.95,
  LPDDR5X: 1.0,
}

export const STORAGE_TECH: Array<{ match: RegExp; factor: number }> = [
  { match: /ufs\s*4\.1/i, factor: 1.0 },
  { match: /ufs\s*4\.0|ufs\s*4/i, factor: 0.95 },
  { match: /ufs\s*3\.1/i, factor: 0.85 },
  { match: /ufs\s*3\.0|ufs\s*3/i, factor: 0.75 },
  { match: /ufs\s*2\.2/i, factor: 0.6 },
  { match: /ufs\s*2\.1|ufs\s*2/i, factor: 0.5 },
  { match: /emmc/i, factor: 0.25 },
]

// ── Camera factor tables (§19–23) ────────────────────────────────────────────

export const STABILIZATION_FACTORS: Record<string, number> = {
  none: 0,
  eis: 0.4,
  ois: 0.75,
  ois_eis: 0.9,
  advanced: 1.0,
}

export const AF_FACTORS: Record<string, number> = {
  fixed: 0,
  contrast: 0.4,
  pdaf: 0.75,
  dual_pixel: 0.9,
  advanced: 1.0,
}

export const OPTICAL_ZOOM_FACTORS: Array<{ max: number; factor: number }> = [
  { max: 2, factor: 0.45 },
  { max: 2.5, factor: 0.55 },
  { max: 3, factor: 0.65 },
  { max: 3.5, factor: 0.72 },
  { max: 4, factor: 0.8 },
  { max: 5, factor: 0.9 },
  { max: Infinity, factor: 1.0 },
]

/** Video capability factor from the best documented mode (§19 "Video"). */
export function videoModeFactor(modes: string[] | undefined): number | null {
  if (!modes || modes.length === 0) return null
  const best = (factor: number): number => factor
  let out: number | null = null
  for (const mode of modes.map((m) => m.toLowerCase())) {
    let f: number | null = null
    if (/8\s*k|4320p/i.test(mode)) f = best(1.0)
    else if (/4\s*k|2160p/i.test(mode)) {
      f = /120|240/i.test(mode) ? 0.95 : /60/i.test(mode) ? 0.85 : 0.65
    } else if (/1080p?|fhd|2\.7k|1440p/i.test(mode)) {
      f = /120|240|960/i.test(mode) ? 0.6 : /60/i.test(mode) ? 0.45 : 0.3
    } else if (/720p|hd\b/i.test(mode)) f = 0.2
    if (f != null) out = Math.max(out ?? 0, f)
  }
  return out
}
