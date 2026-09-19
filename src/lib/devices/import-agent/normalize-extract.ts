// Normalizes a brain extraction (unit-bearing strings) into typed canonical
// spec sections ready for validateSpecs. Deterministic, never throws, never
// invents: anything unparseable becomes null and is dropped downstream.
import * as norm from '@/lib/devices/spec-normalize'
import { resolveCameraSlot, slotToken } from '@/lib/devices/camera-types'
import type { TextSpecsExtraction } from './text-specs'

type Section = Record<string, unknown>

function pickString(section: Section | null | undefined, key: string): string | null {
  if (!section) return null
  const v = section[key]
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function pickNum(section: Section | null | undefined, key: string, parse: (v: unknown) => number | null): number | null {
  if (!section) return null
  const v = section[key]
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v !== 'string' || v.trim().length === 0) return null
  return parse(v)
}

function strArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim())
  return out.length > 0 ? out : undefined
}

function firstNumberInText(value: string | null): number | null {
  if (!value) return null
  const m = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

/** "2772*1272", "2772x1272", "2772 × 1272" → [2772, 1272]. */
function splitResolution(value: string | null): [number, number] | null {
  if (!value) return null
  const m = value.match(/(\d{3,5})\s*[x×*]\s*(\d{3,5})/)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  return Number.isFinite(w) && Number.isFinite(h) ? [w, h] : null
}

export function normalizeDesign(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  const h = pickNum(raw, 'height_mm', norm.mm)
  const w = pickNum(raw, 'width_mm', norm.mm)
  const t = pickNum(raw, 'thickness_mm', norm.mm)
  const g = pickNum(raw, 'weight_g', norm.grams)
  if (h != null) out.height_mm = h
  if (w != null) out.width_mm = w
  if (t != null) out.thickness_mm = t
  if (g != null) out.weight_g = g
  const ip = norm.ipRating(pickString(raw, 'ip_rating'))
  if (ip) out.ip_rating = ip
  for (const k of ['frame_material', 'back_material', 'front_glass_protection', 'speakers', 'ports']) {
    const v = pickString(raw, k)
    if (v) out[k] = v
  }
  const colors = strArray(raw.colors)
  if (colors) out.colors = colors
  return out
}

export function normalizeDisplay(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  const size = pickNum(raw, 'size_inches', norm.inches)
  if (size != null) out.size_inches = size
  const dtype = pickString(raw, 'display_type')
  if (dtype) out.display_type = dtype
  const resRaw = pickString(raw, 'resolution_width') ?? pickString(raw, 'resolution_height')
  const res = splitResolution(resRaw)
  if (res) {
    out.resolution_width = res[0]
    out.resolution_height = res[1]
  }
  const refreshRaw = pickString(raw, 'refresh_hz')
  if (refreshRaw) {
    const all = refreshRaw.replace(/,/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 500)
    const hz = all && all.length > 0 ? Math.max(...all) : norm.hertz(refreshRaw)
    if (hz != null) out.refresh_hz = hz
    const ar = norm.adaptiveRefresh(refreshRaw) ?? norm.adaptiveRefresh(pickString(raw, 'adaptive_refresh'))
    if (ar) out.adaptive_refresh = ar
  } else {
    const ar = norm.adaptiveRefresh(pickString(raw, 'adaptive_refresh'))
    if (ar) out.adaptive_refresh = ar
  }
  const nits = pickNum(raw, 'peak_brightness_nits', norm.nits)
  if (nits != null) out.peak_brightness_nits = nits
  const hdr = norm.hdrType(pickString(raw, 'hdr'))
  if (hdr) out.hdr = hdr
  return out
}

export function normalizeProcessor(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  for (const k of ['chipset_name', 'cpu', 'cpu_architecture', 'gpu', 'process_node', 'npu']) {
    const v = pickString(raw, k)
    if (v) out[k] = v
  }
  const clock = pickNum(raw, 'max_clock_ghz', norm.num)
  if (clock != null && clock > 0 && clock < 20) out.max_clock_ghz = clock
  return out
}

export function normalizeMemory(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  const ram = pickNum(raw, 'ram_gb', norm.ramGb)
  if (ram != null) out.ram_gb = ram
  const ramType = norm.ramType(pickString(raw, 'ram_type'))
  if (ramType) out.ram_type = ramType
  const storage = pickNum(raw, 'storage_gb', norm.storageGb)
  if (storage != null) out.storage_gb = storage
  const st = norm.storageType(pickString(raw, 'storage_type'))
  if (st) out.storage_type = st
  if (Array.isArray(raw.variants)) {
    const variants = (raw.variants as unknown[])
      .map((v) => {
        if (!v || typeof v !== 'object') return null
        const o = v as Record<string, unknown>
        const r = norm.ramGb(o.ram_gb ?? o.ram ?? o.ramGb)
        const s = norm.storageGb(o.storage_gb ?? o.storage ?? o.storageGb)
        if (r == null && s == null) return null
        return { ram_gb: r, storage_gb: s }
      })
      .filter((v): v is { ram_gb: number | null; storage_gb: number | null } => v !== null)
    if (variants.length > 0) out.variants = variants
  }
  return out
}

function normalizeCameraUnit(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const get = (k: string): string | null => {
    const v = u[k]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    return null
  }
  const type = get('type')
  if (type) out.type = type
  // Canonical slot — every source dialect ('Ultra-wide', 'Ultrawide angle',
  // 'Periscope telephoto', 'Primary'…) resolves to one vocabulary so labels
  // and ranking agree. Unknown stays unknown (never guessed to 'Main').
  const slot = resolveCameraSlot(type ?? u.slot)
  if (slot) out.slot = slotToken(slot)
  const mp = norm.megapixels(u.megapixels)
  if (mp != null) out.megapixels = mp
  const sensorSize = get('sensor_size')
  if (sensorSize) out.sensor_size = sensorSize
  const area = norm.sensorAreaMm2(sensorSize)
  if (area != null) out.sensor_area_mm2 = area
  const sensorModel = get('sensor_model')
  if (sensorModel) out.sensor_model = sensorModel
  const ap = norm.aperture(get('aperture'))
  if (ap != null) out.aperture = ap
  const ois = norm.tri(get('ois'))
  if (ois) out.ois = ois
  const eis = norm.tri(get('eis'))
  if (eis) out.eis = eis
  const af = get('af')
  if (af) out.af = af
  const focal = firstNumberInText(get('focal_length_mm'))
  if (focal != null && focal > 0 && focal < 1000) out.focal_length_mm = focal
  const zoom = firstNumberInText(get('optical_zoom_x'))
  if (zoom != null && zoom > 0 && zoom <= 100) out.optical_zoom_x = zoom
  const videoModes = strArray(u.video_modes)
  if (videoModes) out.video_modes = videoModes
  const features = strArray(u.features)
  if (features) out.features = features
  return Object.keys(out).length > 0 ? out : null
}

export function normalizeCamera(raw: unknown): Section {
  if (!raw || typeof raw !== 'object') return {}
  const c = raw as Record<string, unknown>
  const out: Section = {}
  for (const k of ['rear', 'selfie'] as const) {
    const arr = c[k]
    if (Array.isArray(arr)) {
      const units = arr.map(normalizeCameraUnit).filter((u): u is Record<string, unknown> => u !== null)
      if (units.length > 0) out[k] = units
    }
  }
  const vf = strArray(c.video_features)
  if (vf) out.video_features = vf
  return out
}

export function normalizeBattery(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  const cap = pickNum(raw, 'capacity_mah', norm.mah)
  if (cap != null) out.capacity_mah = cap
  const bt = pickString(raw, 'battery_type')
  if (bt) out.battery_type = bt
  const wired = pickNum(raw, 'wired_w', norm.watts)
  if (wired != null) out.wired_w = wired
  const wireless = pickNum(raw, 'wireless_w', norm.watts)
  if (wireless != null) out.wireless_w = wireless
  const rev = pickNum(raw, 'reverse_wireless_w', norm.watts)
  if (rev != null) out.reverse_wireless_w = rev
  const protocols = strArray(raw.protocols)
  if (protocols) out.protocols = protocols
  return out
}

export function normalizeConnectivity(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  for (const k of ['wifi', 'bluetooth', 'usb']) {
    const v = pickString(raw, k)
    if (v) out[k] = v
  }
  const nfc = norm.tri(pickString(raw, 'nfc'))
  if (nfc) out.nfc = nfc
  // "Infrared remote control" describes the emitter itself, so it is a YES
  // rather than the ambiguous 'unknown' that a bare tri() would return.
  const irRaw = pickString(raw, 'ir_blaster')
  if (irRaw) {
    out.ir_blaster = norm.mentionsInfrared(irRaw) ? 'yes' : (norm.tri(irRaw) ?? 'unknown')
  }
  const pos = strArray(raw.positioning)
  if (pos) out.positioning = pos
  return out
}

export function normalizeNetwork(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  const sim = strArray(raw.sim)
  if (sim) out.sim = sim
  const tech = strArray(raw.technology)
  if (tech) out.technology = tech
  for (const k of ['bands_2g', 'bands_3g', 'bands_4g', 'bands_5g']) {
    const v = pickString(raw, k)
    if (v) out[k] = v
  }
  return out
}

export function normalizeSoftware(raw: Section | null | undefined): Section {
  if (!raw) return {}
  const out: Section = {}
  for (const k of ['os', 'ui', 'os_upgrades', 'security_patches']) {
    const v = pickString(raw, k)
    if (v) out[k] = v
  }
  return out
}

/**
 * Convert a brain extraction into typed canonical sections. Returns the
 * sections record plus a per-section drop list (sections that came back
 * empty or unusable — surfaced in the UI so "0 fields" is never silent).
 */
export function normalizeExtraction(extraction: TextSpecsExtraction): {
  sections: Record<string, Record<string, unknown>>
  dropped: string[]
} {
  const sections: Record<string, Record<string, unknown>> = {}
  const dropped: string[] = []
  const put = (key: string, section: Section) => {
    if (Object.keys(section).length > 0) sections[key] = section
    else dropped.push(key)
  }
  const e = extraction as unknown as Record<string, unknown>
  put('specs_design', normalizeDesign(e.specs_design as Section | null))
  put('specs_display', normalizeDisplay(e.specs_display as Section | null))
  put('specs_processor', normalizeProcessor(e.specs_processor as Section | null))
  put('specs_memory', normalizeMemory(e.specs_memory as Section | null))
  put('specs_camera', normalizeCamera(e.specs_camera))
  put('specs_battery', normalizeBattery(e.specs_battery as Section | null))
  put('specs_connectivity', normalizeConnectivity(e.specs_connectivity as Section | null))
  put('specs_network', normalizeNetwork(e.specs_network as Section | null))
  put('specs_software', normalizeSoftware(e.specs_software as Section | null))
  return { sections, dropped }
}

