// Fair Phone Score — component formulas (FTS-1.0, Ranking System §9–27).
// ============================================================================
// Deterministic pure functions: same (specs, benchmarks, config) ⇒ same score
// (§33). High internal precision; only the display layer rounds (§34).
//
// Missing vs Unknown (§28): a component fed with an UNKNOWN value returns
// `{points: null}` and is EXCLUDED from both earned points and the effective
// maximum (prorated) — neither "best" nor "worst". Confirmed absence of
// hardware (e.g. wireless charging: 0 W) scores 0 for that component only —
// never a double penalty elsewhere (§29).

import * as cfg from './config'

export interface ComponentResult {
  points: number | null // null = unknown input (prorated)
  max: number
  detail: Record<string, number | string | null>
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const pow = (base: number, exp: number) => Math.pow(base, exp)

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

// ── 9. BUILD QUALITY — 10 ────────────────────────────────────────────────────

function ipFactors(ip: string | null | undefined): { dust: number | null; water: number | null } {
  if (!ip) return { dust: null, water: null }
  const m = ip.toUpperCase().match(/IP\s?(\d|X)(\d|X)/)
  if (!m) return { dust: null, water: null }
  const dust = m[1] === 'X' ? null : Number(m[1]) / 6
  const waterTable: Record<string, number> = {
    '1': 0.1, '2': 0.2, '3': 0.3, '4': 0.4, '5': 0.55, '6': 0.65, '7': 0.8, '8': 0.95, '9': 1.0,
  }
  const water = m[2] === 'X' ? 0 : (waterTable[m[2]] ?? null)
  return { dust, water }
}

export function glassFactor(text: string | null | undefined): number | null {
  if (!text) return null
  for (const h of cfg.GLASS_FACTORS) if (h.match.test(text)) return h.factor
  return null
}

export function frameFactor(text: string | null | undefined): number | null {
  if (!text) return null
  for (const h of cfg.FRAME_FACTORS) if (h.match.test(text)) return h.factor
  return null
}

export function backFactor(text: string | null | undefined): number | null {
  if (!text) return null
  for (const h of cfg.BACK_FACTORS) if (h.match.test(text)) return h.factor
  return null
}

export function scoreBuild(design: Record<string, unknown> | null): ComponentResult {
  const detail: Record<string, number | string | null> = {}
  let earned = 0
  let known = 0

  // 9a. IP — 3 points (0.40 dust + 0.60 water)
  const { dust, water } = ipFactors(design?.ip_rating as string | null)
  if (dust == null && water == null) {
    detail.ip = null
  } else {
    const ipScore = 3 * (0.4 * (dust ?? 0) + 0.6 * (water ?? 0))
    earned += ipScore
    known += 3
    detail.ip = round3(ipScore)
  }

  // 9b. Glass — 2.5
  const glass = glassFactor(design?.front_glass_protection as string | null)
  if (glass == null) detail.glass = null
  else {
    earned += 2.5 * glass
    known += 2.5
    detail.glass = round3(2.5 * glass)
  }

  // 9c. Frame — 2.5
  const frame = frameFactor(design?.frame_material as string | null)
  if (frame == null) detail.frame = null
  else {
    earned += 2.5 * frame
    known += 2.5
    detail.frame = round3(2.5 * frame)
  }

  // 9d. Back — 2
  const back = backFactor(design?.back_material as string | null)
  if (back == null) detail.back = null
  else {
    earned += 2 * back
    known += 2
    detail.back = round3(2 * back)
  }

  return { points: known === 0 ? null : earned, max: known, detail: { ...detail, effectiveMax: known } }
}

// ── 10. DISPLAY — 20 ─────────────────────────────────────────────────────────

export function displayTypeFactor(text: string | null | undefined): number | null {
  if (!text) return null
  for (const h of cfg.DISPLAY_TYPE_FACTORS) if (h.match.test(text)) return h.factor
  return null
}

export function scoreDisplay(display: Record<string, unknown> | null): ComponentResult {
  const detail: Record<string, number | string | null> = {}
  let earned = 0
  let known = 0

  // 10a. Type — 4
  const typeF = displayTypeFactor(display?.display_type as string | null)
  if (typeF == null) detail.type = null
  else {
    earned += 4 * typeF
    known += 4
    detail.type = round3(4 * typeF)
  }

  // 10b. Resolution — 4 (PPI-based, diminishing returns)
  const w = display?.resolution_width as number | null
  const h = display?.resolution_height as number | null
  const size = display?.size_inches as number | null
  if (w && h && size) {
    const ppi = Math.sqrt(w * w + h * h) / size
    const factor = Math.min(1, pow(ppi / cfg.THRESHOLDS.ppi, 0.65))
    earned += 4 * factor
    known += 4
    detail.resolution = round3(4 * factor)
    detail.ppi = Math.round(ppi)
  } else detail.resolution = null

  // 10c. Refresh — 3 (log curve × adaptive multiplier)
  const hz = display?.refresh_hz as number | null
  const adaptive = (display?.adaptive_refresh as string | null) ?? 'fixed'
  if (hz) {
    const base = Math.min(1, Math.log(1 + hz) / Math.log(1 + cfg.THRESHOLDS.refreshHz))
    const mult = cfg.ADAPTIVE_MULTIPLIER[adaptive as keyof typeof cfg.ADAPTIVE_MULTIPLIER] ?? 0.9
    earned += 3 * base * mult
    known += 3
    detail.refresh = round3(3 * base * mult)
  } else detail.refresh = null

  // 10d. Brightness — 4 (manufacturer claims discounted ×0.65 unless measured)
  const nits = display?.peak_brightness_nits as number | null
  const effectiveNits =
    typeof nits === 'number' && nits > 0
      ? (display?.brightness_measured === true ? nits : nits * 0.65)
      : null
  if (effectiveNits != null) {
    const factor = Math.min(1, pow(effectiveNits / cfg.THRESHOLDS.brightnessNits, 0.55))
    earned += 4 * factor
    known += 4
    detail.brightness = round3(4 * factor)
  } else detail.brightness = null

  // 10e. HDR — 5 (× brightness modifier)
  const hdr = display?.hdr as string | null
  if (hdr != null && cfg.HDR_FACTORS[hdr] != null) {
    const modifier =
      effectiveNits == null
        ? 1
        : effectiveNits < 500 ? 0.7 : effectiveNits < 800 ? 0.8 : effectiveNits < 1200 ? 0.9 : 1.0
    earned += 5 * cfg.HDR_FACTORS[hdr] * modifier
    known += 5
    detail.hdr = round3(5 * cfg.HDR_FACTORS[hdr] * modifier)
  } else detail.hdr = null

  return { points: known === 0 ? null : earned, max: known, detail: { ...detail, effectiveMax: known } }
}

// ── 11–17. PERFORMANCE — 25 (processor 18 + RAM 3 + storage 4) ───────────────

export interface ProcessorBenchmarks {
  single_core: number
  multi_core: number
  gpu_score: number
}

export function processorScore(
  benchmarks: ProcessorBenchmarks | null,
  best: ProcessorBenchmarks,
): ComponentResult {
  // No benchmark data → nothing is evaluable → 0 known points (NOT a phantom
  // max: a missing score must not sit in the denominator, or a fully
  // documented device with an unseeded chipset gets structurally crushed).
  if (!benchmarks) return { points: null, max: 0, detail: { effectiveMax: 0 } }
  const singleF = clamp01(benchmarks.single_core / best.single_core)
  const multiF = clamp01(benchmarks.multi_core / best.multi_core)
  const gpuF = clamp01(benchmarks.gpu_score / best.gpu_score)
  const index = 0.45 * singleF + 0.35 * multiF + 0.2 * gpuF
  return {
    points: 18 * index,
    max: 18,
    detail: { single: round3(singleF), multi: round3(multiF), gpu: round3(gpuF), effectiveMax: 18 },
  }
}

export function ramScore(ram: Record<string, unknown> | null): ComponentResult {
  const gb = ram?.ram_gb as number | null
  const ramType = (ram?.ram_type as string | null)?.toUpperCase().replace(/\s+/g, '') ?? null
  // Same prorating rule as the processor: without a capacity nothing is known.
  if (!gb) return { points: null, max: 0, detail: { effectiveMax: 0 } }
  const capacityF = Math.min(1, pow(gb / cfg.THRESHOLDS.ramGb, 0.55))
  const genMult = ramType ? (cfg.RAM_GENERATION[ramType] ?? 1.0) : 1.0
  return {
    points: Math.min(3, 3 * capacityF * genMult),
    max: 3,
    detail: { capacity: round3(capacityF), generation: genMult, effectiveMax: 3 },
  }
}

export function storageScore(mem: Record<string, unknown> | null): ComponentResult {
  const gb = mem?.storage_gb as number | null
  const type = mem?.storage_type as string | null
  if (!gb && !type) return { points: null, max: 4, detail: { effectiveMax: 0 } }
  let earned = 0
  let known = 0
  if (gb) {
    const capacityF = Math.min(1, pow(gb / cfg.THRESHOLDS.storageGb, 0.45))
    earned += 0.35 * 4 * capacityF
    known += 0.35 * 4
  }
  if (type) {
    let techF: number | null = null
    for (const h of cfg.STORAGE_TECH) {
      if (h.match.test(type)) {
        techF = h.factor
        break
      }
    }
    if (techF != null) {
      earned += 0.65 * 4 * techF
      known += 0.65 * 4
    }
  }
  return { points: known === 0 ? null : earned, max: known, detail: { effectiveMax: round3(known) } }
}

// ── 18–23. CAMERAS — 25 ──────────────────────────────────────────────────────

export interface CameraWeights {
  sensor: number
  aperture: number
  resolution: number
  stabilization: number
  af: number
  video: number
  zoom?: number
}

const W_MAIN: CameraWeights = { sensor: 0.35, aperture: 0.15, resolution: 0.1, stabilization: 0.15, af: 0.1, video: 0.15 }
const W_TELE: CameraWeights = { sensor: 0.3, zoom: 0.25, aperture: 0.15, stabilization: 0.15, af: 0.1, video: 0.05, resolution: 0 }
const W_ULTRA: CameraWeights = { sensor: 0.35, resolution: 0.15, aperture: 0.15, af: 0.15, stabilization: 0.1, video: 0.1 }
const W_SELFIE: CameraWeights = { sensor: 0.3, resolution: 0.15, aperture: 0.15, af: 0.15, stabilization: 0.1, video: 0.15 }

interface CamUnitInput {
  megapixels?: number | null
  sensor_area_mm2?: number | null
  aperture?: number | null
  ois?: string | null
  eis?: string | null
  af?: string | null
  video_modes?: string[] | null
  type?: string | null
  /** Canonical slot from the camera taxonomy — preferred over `type` for roles. */
  slot?: string | null
  optical_zoom_x?: number | null
}

function stabilizationFactor(cam: Record<string, unknown>): number | null {
  const ois = cam.ois as string | null
  const eis = cam.eis as string | null
  if (ois == null && eis == null) return null
  if (ois === 'yes' && eis === 'yes') return cfg.STABILIZATION_FACTORS.ois_eis
  if (ois === 'yes') return cfg.STABILIZATION_FACTORS.ois
  if (eis === 'yes') return cfg.STABILIZATION_FACTORS.eis
  return cfg.STABILIZATION_FACTORS.none
}

function afFactor(af: string | null | undefined): number | null {
  if (!af) return null
  const s = af.toLowerCase()
  if (/dual pixel|all-?pixel|quad.?pd/.test(s)) return cfg.AF_FACTORS.dual_pixel
  if (/laser/.test(s)) return cfg.AF_FACTORS.advanced
  if (/pdaf|phase/.test(s)) return cfg.AF_FACTORS.pdaf
  if (/contrast/.test(s)) return cfg.AF_FACTORS.contrast
  if (/fixed/.test(s)) return cfg.AF_FACTORS.fixed
  return cfg.AF_FACTORS.pdaf // generic AF mention
}

function apertureFactor(aperture: number | null, bestAperture: number): number | null {
  if (!aperture) return null
  return Math.min(1, pow(bestAperture / aperture, 0.5))
}

function sensorFactor(areaMm2: number | null, bestAreaMm2: number): number | null {
  if (!areaMm2) return null
  return Math.min(1, Math.sqrt(areaMm2 / bestAreaMm2))
}

function mpFactor(mp: number | null): number | null {
  if (!mp) return null
  return Math.min(1, pow(mp / cfg.THRESHOLDS.mainCameraMp, 0.35))
}

function zoomFactor(opticalZoom: number | null): number | null {
  if (!opticalZoom) return null // digital-only zoom is never credited (§20)
  for (const tier of cfg.OPTICAL_ZOOM_FACTORS) {
    if (opticalZoom <= tier.max) return tier.factor
  }
  return 1.0
}

function cameraIndex(
  cam: CamUnitInput | null,
  weights: CameraWeights,
  best: { sensorArea: number; aperture: number },
): { index: number | null; detail: Record<string, number | string | null> } {
  if (!cam) return { index: null, detail: {} }
  const detail: Record<string, number | string | null> = {}
  let sum = 0
  let known = 0

  const sf = sensorFactor(cam.sensor_area_mm2 ?? null, best.sensorArea)
  if (sf != null) { sum += weights.sensor * sf; known += weights.sensor }
  detail.sensor = sf != null ? round3(weights.sensor * sf) : null

  if (weights.zoom) {
    const zf = zoomFactor(cam.optical_zoom_x ?? null)
    if (zf != null) { sum += weights.zoom * zf; known += weights.zoom }
    detail.zoom = zf != null ? round3(weights.zoom * zf) : null
  }

  const apf = apertureFactor(cam.aperture ?? null, best.aperture)
  if (apf != null) { sum += weights.aperture * apf; known += weights.aperture }
  detail.aperture = apf != null ? round3(weights.aperture * apf) : null

  if (weights.resolution) {
    const mpf = mpFactor(cam.megapixels ?? null)
    if (mpf != null) { sum += weights.resolution * mpf; known += weights.resolution }
    detail.resolution = mpf != null ? round3(weights.resolution * mpf) : null
  }

  const stf = stabilizationFactor(cam as unknown as Record<string, unknown>)
  if (stf != null) { sum += weights.stabilization * stf; known += weights.stabilization }
  detail.stabilization = stf != null ? round3(weights.stabilization * stf) : null

  const aff = afFactor(cam.af ?? null)
  if (aff != null) { sum += weights.af * aff; known += weights.af }
  detail.af = aff != null ? round3(weights.af * aff) : null

  const vf = cfg.videoModeFactor(cam.video_modes ?? undefined)
  if (vf != null) { sum += weights.video * vf; known += weights.video }
  detail.video = vf != null ? round3(weights.video * vf) : null

  return { index: known === 0 ? null : sum / known, detail }
}

function cameraComponent(
  cams: CamUnitInput[] | null | undefined,
  pickType: (cam: CamUnitInput) => boolean,
  weights: CameraWeights,
  points: number,
  best: { sensorArea: number; aperture: number },
): ComponentResult {
  // No camera array at all → unknown (prorated). Array present but no matching
  // lens → confirmed absence → 0/points, no proration (§28/§29).
  if (!cams || cams.length === 0) {
    return { points: null, max: 0, detail: { effectiveMax: 0 } }
  }
  const matches = cams.filter(pickType)
  if (matches.length === 0) {
    return { points: 0, max: points, detail: { absent: 'confirmed', effectiveMax: points } }
  }
  const { index, detail } = cameraIndex(matches[0], weights, best)
  if (index == null) return { points: null, max: 0, detail: { ...detail, effectiveMax: 0 } }
  return { points: points * index, max: points, detail: { ...detail, effectiveMax: points } }
}

function macroFactor(cams: CamUnitInput[] | null | undefined): number | null {
  // §23: AF ultrawide counts as meaningful macro; a token 2/5MP lens does not.
  const list = cams ?? []
  const afUltrawide = list.find(
    (c) => /ultra/i.test(c.type ?? '') && afFactor(c.af ?? null) !== null && (c.megapixels ?? 0) >= 8,
  )
  if (afUltrawide) return 0.7
  const dedicated = list.find((c) => /macro/i.test(c.type ?? ''))
  if (dedicated) {
    const mp = dedicated.megapixels ?? 0
    if (mp >= 48) return 0.8
    if (mp >= 16) return 0.6
    return 0.3
  }
  return null
}

export function scoreCameras(
  cameraSpecs: Record<string, unknown> | null,
  best: { sensorArea: number; aperture: number },
): ComponentResult {
  const rear = (cameraSpecs?.rear as CamUnitInput[] | undefined) ?? null
  const selfie = (cameraSpecs?.selfie as CamUnitInput[] | undefined) ?? null
  // Role matching goes through the canonical `slot` when present, falling back
  // to the free-text `type` for legacy rows. Both are tested together so
  // tokens like 'Periscope' (slot) still satisfy the telephoto matcher via
  // their descriptive `type` ('Periscope telephoto').
  const roleOf = (c: CamUnitInput): string =>
    [typeof c.slot === 'string' ? c.slot : '', c.type ?? ''].filter(Boolean).join(' ')
  const byType = (re: RegExp) => (c: CamUnitInput) => re.test(roleOf(c))
  const isMain = (c: CamUnitInput) => !byType(/ultra|tele|macro|depth|portrait/i)(c)

  const main = cameraComponent(rear, isMain, W_MAIN, 9, best)
  const tele = cameraComponent(rear, byType(/tele/i), W_TELE, 6, best)
  const ultra = cameraComponent(rear, byType(/ultra/i), W_ULTRA, 5, best)
  const front = cameraComponent(selfie, () => true, W_SELFIE, 4, best)
  const macroF = rear && rear.length ? macroFactor(rear) : null
  const macro = macroF == null ? null : 1 * macroF

  const earned =
    [main.points, tele.points, ultra.points, front.points].reduce<number>((acc, p) => acc + (p ?? 0), 0) +
    (macro == null ? 0 : macro)
  const maxKnown =
    [main, tele, ultra, front].reduce<number>((acc, r) => acc + r.max, 0) + (macro == null ? 0 : 1)

  return {
    points: maxKnown === 0 ? null : earned,
    max: maxKnown,
    detail: {
      main: main.points == null ? null : round3(main.points),
      telephoto: tele.points == null ? null : round3(tele.points),
      ultrawide: ultra.points == null ? null : round3(ultra.points),
      selfie: front.points == null ? null : round3(front.points),
      macro: macro == null ? null : round3(macro),
      effectiveMax: round3(maxKnown),
    },
  }
}

// ── 24–27. BATTERY & CHARGING — 20 ───────────────────────────────────────────

export function scoreBattery(battery: Record<string, unknown> | null): ComponentResult {
  const detail: Record<string, number | string | null> = {}
  let earned = 0
  let known = 0

  // 25. Capacity — 7
  const mahVal = battery?.capacity_mah as number | null
  if (mahVal) {
    const f = Math.min(1, pow(mahVal / cfg.THRESHOLDS.batteryMah, 0.55))
    earned += 7 * f
    known += 7
    detail.capacity = round3(7 * f)
  } else detail.capacity = null

  // 26. Wired — 8 (0 W = confirmed absence = 0; unknown = prorated)
  const wired = battery?.wired_w as number | null
  if (wired != null) {
    const f = wired > 0 ? Math.min(1, pow(wired / cfg.THRESHOLDS.wiredW, 0.55)) : 0
    earned += 8 * f
    known += 8
    detail.wired = round3(8 * f)
  } else detail.wired = null

  // 27. Wireless — 5 (confirmed absence = 0; unknown = prorated)
  const wireless = battery?.wireless_w as number | null
  if (wireless != null) {
    const f = wireless > 0 ? Math.min(1, pow(wireless / cfg.THRESHOLDS.wirelessW, 0.55)) : 0
    earned += 5 * f
    known += 5
    detail.wireless = round3(5 * f)
  } else detail.wireless = null

  return { points: known === 0 ? null : earned, max: known, detail: { ...detail, effectiveMax: known } }
}

export { clamp01 }





