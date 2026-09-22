// Public spec display layer — canonical-first reads with legacy fallbacks.
// ============================================================================
// Since the canonical write gate (§24b, canonical-write.ts) every admin write
// stores spec sections with CANONICAL snake_case keys and typed values
// (size_inches: 6.9, refresh_hz: 120, capacity_mah: 7300, nfc: 'yes'…).
// The public device page historically read legacy manufacturer LABEL keys
// ('Size', 'RAM', 'Capacity'…) — so freshly written devices rendered an EMPTY
// Quick Specs grid and FullSpecsTable returned null (the "specs sections
// missing, TOC jumps to Related/Reviews" bug).
//
// This module is the single display formatter: it reads canonical keys FIRST
// and falls back to the legacy label keys so pre-gate rows keep rendering.
// Dependency-free by convention (like the analytics vocabulary modules).

import { readRearCameras, readSelfieCameras } from '@/lib/devices/camera-types'

export interface SpecRow {
  label: string
  value?: string
}

export interface SpecGroupDisplay {
  title: string
  rows: SpecRow[]
}

type Section = Record<string, unknown> | null | undefined

// ── Value primitives ─────────────────────────────────────────────────────────

const text = (v: unknown): string | undefined => {
  if (v == null) return undefined
  if (typeof v === 'string') {
    const t = v.trim()
    return t === '' ? undefined : t
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return undefined
}

/** Tri-state Yes/No — 'unknown' is deliberately NOT rendered (never guessed). */
const tri = (v: unknown): string | undefined => {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  const t = text(v)?.toLowerCase()
  if (t === 'yes') return 'Yes'
  if (t === 'no') return 'No'
  return undefined
}

const list = (v: unknown, sep = ', '): string | undefined => {
  if (Array.isArray(v)) {
    const parts = v.map((x) => text(x)).filter((x): x is string => !!x)
    return parts.length > 0 ? parts.join(sep) : undefined
  }
  return text(v)
}

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    // Legacy rows store strings WITH units ('6.5 inches', '90Hz', '5000 mAh')
    // — parse the leading numeric token rather than rejecting the whole value.
    const direct = Number(v.replace(/[,\s]/g, ''))
    if (Number.isFinite(direct) && v.trim() !== '') return direct
    const m = v.match(/-?\d+(?:\.\d+)?/)
    if (m) return Number(m[0])
  }
  return undefined
}

/** 6.90 → '6.9', but 7300 → '7300' — strip fractional trailing zeros only. */
const trimNum = (n: number, digits = 2): string => {
  if (digits <= 0) return String(Math.round(n))
  const s = n.toFixed(digits)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

const withUnit = (v: unknown, unit: string, digits = 2): string | undefined => {
  const n = num(v)
  return n == null ? undefined : `${trimNum(n, digits)}${unit}`
}

/** Canonical-first read with legacy label fallbacks. */
function read(section: Section, canonicalKey: string, legacyKeys: string[] = []): unknown {
  if (!section) return undefined
  if (canonicalKey && section[canonicalKey] != null) return section[canonicalKey]
  for (const k of legacyKeys) {
    if (section[k] != null) return section[k]
  }
  return undefined
}

// ── Enums ────────────────────────────────────────────────────────────────────

const HDR_LABEL: Record<string, string> = {
  none: 'None',
  hdr10: 'HDR10',
  hdr10_plus: 'HDR10+',
  dolby_vision: 'Dolby Vision',
  hdr10_plus_dolby_vision: 'HDR10+, Dolby Vision',
}

const ADAPTIVE_LABEL: Record<string, string> = {
  fixed: 'Fixed',
  dynamic: 'Dynamic (adaptive)',
  ltpo: 'LTPO',
}
// ── Per-section display rows ─────────────────────────────────────────────────

function designRows(s: Section): SpecRow[] {
  const h = num(read(s, 'height_mm', ['Height']))
  const w = num(read(s, 'width_mm', ['Width']))
  const t = num(read(s, 'thickness_mm', ['Thickness', 'Depth']))
  const dims =
    h != null && w != null && t != null
      ? `${trimNum(h)} x ${trimNum(w)} x ${trimNum(t)} mm`
      : h != null && w != null
        ? `${trimNum(h)} x ${trimNum(w)} mm`
        : undefined
  return [
    { label: 'Dimensions', value: dims ?? text(read(s, '', ['Dimensions'])) },
    { label: 'Weight', value: withUnit(read(s, 'weight_g', ['Weight']), ' g', 1) ?? text(read(s, '', ['Weight'])) },
    { label: 'Front', value: text(read(s, 'front_glass_protection', ['Front'])) },
    { label: 'Back', value: text(read(s, 'back_material', ['Back'])) },
    { label: 'Frame', value: text(read(s, 'frame_material', ['Frame'])) },
    { label: 'Colours', value: list(read(s, 'colors', ['Colours', 'Colors'])) },
    { label: 'IP Rating', value: text(read(s, 'ip_rating', ['IP Rating'])) },
    { label: 'Speakers', value: text(read(s, 'speakers', ['Speakers'])) },
    { label: 'Ports', value: text(read(s, 'ports', ['Ports'])) },
  ]
}

function displayRows(s: Section): SpecRow[] {
  const sizeIn = num(read(s, 'size_inches', ['Size']))
  const rw = num(read(s, 'resolution_width'))
  const rh = num(read(s, 'resolution_height'))
  const resolution = rw != null && rh != null ? `${rw} x ${rh}` : text(read(s, '', ['Resolution']))
  const hdrRaw = text(read(s, 'hdr'))
  const hdr = hdrRaw ? HDR_LABEL[hdrRaw.toLowerCase()] : undefined
  const adaptiveRaw = text(read(s, 'adaptive_refresh'))
  const secondary = s?.secondary_display as Record<string, unknown> | undefined
  const secondarySize = num(secondary?.size_inches)
  const secondaryText =
    text(secondary?.note) ??
    (secondarySize != null || text(secondary?.display_type)
      ? [secondarySize != null ? `${trimNum(secondarySize)}"` : null, text(secondary?.display_type)]
          .filter((x): x is string => !!x)
          .join(' ')
      : undefined)
  return [
    { label: 'Size', value: sizeIn != null ? `${trimNum(sizeIn)} inches` : undefined },
    { label: 'Type', value: text(read(s, 'display_type', ['Type'])) },
    { label: 'Resolution', value: resolution },
    { label: 'Refresh Rate', value: withUnit(read(s, 'refresh_hz', ['Refresh Rate']), 'Hz', 0) },
    { label: 'Adaptive Refresh', value: adaptiveRaw ? ADAPTIVE_LABEL[adaptiveRaw.toLowerCase()] : undefined },
    { label: 'Peak Brightness', value: withUnit(read(s, 'peak_brightness_nits', ['Peak Brightness']), ' nits', 0) },
    { label: 'HDR', value: hdr },
    { label: 'Cover Display', value: secondaryText ?? text(read(s, '', ['Cover Display'])) },
  ]
}

function processorRows(s: Section): SpecRow[] {
  return [
    { label: 'Chipset', value: text(read(s, 'chipset_name', ['Chipset', 'Chip'])) },
    { label: 'CPU', value: text(read(s, 'cpu', ['CPU'])) },
    { label: 'GPU', value: text(read(s, 'gpu', ['GPU'])) },
    { label: 'Process Node', value: text(read(s, 'process_node', ['Node size', 'Process'])) },
    { label: 'NPU', value: text(read(s, 'npu', ['NPU'])) },
    { label: 'Max Clock', value: withUnit(read(s, 'max_clock_ghz'), ' GHz') },
  ]
}

function memoryRows(s: Section): SpecRow[] {
  return [
    { label: 'RAM', value: withUnit(read(s, 'ram_gb', ['RAM']), ' GB', 0) },
    { label: 'RAM Type', value: text(read(s, 'ram_type', ['RAM type'])) },
    { label: 'Storage', value: withUnit(read(s, 'storage_gb', ['Storage']), ' GB', 0) },
    { label: 'Storage Type', value: text(read(s, 'storage_type', ['Storage type'])) },
    { label: 'Configurations', value: list(read(s, 'variants')) },
    { label: 'Expandable', value: tri(read(s, '', ['Expandable'])) },
  ]
}


function batteryRows(s: Section): SpecRow[] {
  return [
    { label: 'Capacity', value: withUnit(read(s, 'capacity_mah', ['Capacity']), ' mAh', 0) },
    { label: 'Battery Type', value: text(read(s, 'battery_type', ['Battery type', 'Type'])) },
    { label: 'Wired Charging', value: withUnit(read(s, 'wired_w', ['Wired charging', 'Wired']), 'W', 0) },
    { label: 'Wireless Charging', value: withUnit(read(s, 'wireless_w', ['Wireless charging', 'Wireless']), 'W', 0) },
    { label: 'Reverse Charging', value: withUnit(read(s, 'reverse_wireless_w', ['Reverse charging', 'Reverse wireless']), 'W', 0) },
    { label: 'Charging Protocols', value: list(read(s, 'protocols', ['Charging protocols'])) },
  ]
}

function connectivityRows(s: Section): SpecRow[] {
  return [
    { label: 'WiFi', value: text(read(s, 'wifi', ['WiFi', 'Wi-Fi'])) },
    { label: 'Bluetooth', value: text(read(s, 'bluetooth', ['Bluetooth'])) },
    { label: 'NFC', value: tri(read(s, 'nfc', ['NFC'])) },
    { label: 'USB', value: text(read(s, 'usb', ['USB'])) },
    { label: 'Positioning', value: list(read(s, 'positioning', ['Positioning'])) },
    { label: 'IR Blaster', value: tri(read(s, 'ir_blaster', ['IR blaster'])) },
  ]
}

function networkRows(s: Section): SpecRow[] {
  return [
    { label: 'SIM', value: list(read(s, 'sim', ['SIM'])) },
    { label: 'Technology', value: list(read(s, 'technology', ['Technology'])) },
    { label: '2G bands', value: text(read(s, 'bands_2g', ['2G bands'])) },
    { label: '3G bands', value: text(read(s, 'bands_3g', ['3G bands'])) },
    { label: '4G bands', value: text(read(s, 'bands_4g', ['4G bands'])) },
    { label: '5G bands', value: text(read(s, 'bands_5g', ['5G bands'])) },
  ]
}

function softwareRows(s: Section): SpecRow[] {
  return [
    { label: 'OS', value: text(read(s, 'os', ['OS'])) },
    { label: 'UI Layer', value: text(read(s, 'ui', ['UI layer', 'UI'])) },
    { label: 'Major OS Upgrades', value: text(read(s, 'os_upgrades', ['Major OS upgrades'])) },
    { label: 'Security Patches', value: text(read(s, 'security_patches', ['Security patches'])) },
  ]
}

// ── Camera flatten (reuses the shared slot readers) ──────────────────────────

/** Canonical-first camera flatten for the stored JSONB (rear/selfie/video). */
export function cameraRows(cam?: Record<string, unknown> | null): SpecRow[] {
  if (!cam) return []
  const rows: SpecRow[] = []
  for (const r of readRearCameras(cam)) rows.push({ label: r.label, value: r.value })
  for (const s of readSelfieCameras(cam)) rows.push({ label: s.label, value: s.value })
  const video = (cam.video ?? null) as Record<string, unknown> | null
  if (video?.rear) rows.push({ label: 'Video (rear)', value: String(video.rear) })
  if (video?.front) rows.push({ label: 'Video (front)', value: String(video.front) })
  if (cam.extras) rows.push({ label: 'Camera extras', value: String(cam.extras) })
  return rows
}

// ── Public surface ───────────────────────────────────────────────────────────

/**
 * Build the Full Specifications groups from the stored specs_* JSONB sections.
 * Canonical keys are read first; legacy label keys keep pre-gate rows alive.
 * Groups whose rows are all empty are dropped by the consumer (FullSpecsTable).
 */
export function buildFullSpecGroups(device: Record<string, unknown>): SpecGroupDisplay[] {
  const sec = (k: string): Section => device[k] as Section
  return [
    { title: 'Design & Build', rows: designRows(sec('specs_design')) },
    { title: 'Display', rows: displayRows(sec('specs_display')) },
    { title: 'Processor', rows: processorRows(sec('specs_processor')) },
    { title: 'Memory', rows: memoryRows(sec('specs_memory')) },
    { title: 'Battery', rows: batteryRows(sec('specs_battery')) },
    { title: 'Camera', rows: cameraRows(device.specs_camera as Record<string, unknown> | null | undefined) },
    { title: 'Connectivity', rows: connectivityRows(sec('specs_connectivity')) },
    { title: 'Network', rows: networkRows(sec('specs_network')) },
    { title: 'Software', rows: softwareRows(sec('specs_software')) },
  ]
}

/** Quick Specs tile values (canonical-first, single source with Full Specs). */
export function quickSpecValues(device: Record<string, unknown>): Record<string, string | undefined> {
  const sec = (k: string): Section => device[k] as Section
  const first = (rows: SpecRow[]): string | undefined => rows.find((r) => r.value)?.value
  return {
    Display: first(displayRows(sec('specs_display'))),
    Chipset: first(processorRows(sec('specs_processor'))),
    Camera: first(cameraRows(device.specs_camera as Record<string, unknown> | null | undefined)),
    Battery: first(batteryRows(sec('specs_battery'))),
    RAM: first(memoryRows(sec('specs_memory'))),
    'IP Rating': first(designRows(sec('specs_design')).filter((r) => r.label === 'IP Rating')),
    NFC: first(connectivityRows(sec('specs_connectivity')).filter((r) => r.label === 'NFC')),
  }
}
