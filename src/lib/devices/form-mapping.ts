// Canonical spec → admin-form prefill mapper.
// ============================================================================
// The Phone Database stores canonical snake_case fields (src/lib/devices/
// spec-schema.ts). The admin device form edits label-keyed string fields
// (see SPEC_FIELDS in src/lib/chat/prefill-schemas.ts). This module converts
// one into the other so an imported/normalized spec set can be reviewed in the
// existing form — the agent never gets its own parallel UI.
//
// Rules: unknown stays unknown. Nothing is invented. Three-state facts render
// as 'Yes' / 'No' / 'Unknown' (Ranking §28).

import type { DeviceSpecs } from '@/lib/devices/spec-schema'
import type { DevicePrefill } from '@/lib/chat/prefill-schemas'
import type { CameraSpec, RearCameraType } from '@/lib/camera-spec'
import { REAR_CAMERA_TOKENS, resolveCameraSlot, slotToken, tokenToSlot } from '@/lib/devices/camera-types'

type Rec = Record<string, unknown>

/** Coerce an arbitrary value to a display string; null/undefined → ''. */
function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').map((x) => String(x)).join(', ')
  return ''
}

/** Join non-empty parts with a separator. */
function join(parts: Array<unknown>, sep = ' '): string {
  return parts.map(str).filter(Boolean).join(sep).trim()
}

/** 'yes' | 'no' | 'unknown' | null → 'Yes' | 'No' | 'Unknown' | ''. */
function tri(v: unknown): string {
  if (v === 'yes') return 'Yes'
  if (v === 'no') return 'No'
  if (v === 'unknown') return 'Unknown'
  return ''
}

function num(v: unknown, suffix = ''): string {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return ''
  const rounded = Math.round(n * 100) / 100
  return `${rounded}${suffix}`
}

function dropEmpty(o: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) if (v && v.trim()) out[k] = v.trim()
  return out
}

const HDR_LABELS: Record<string, string> = {
  none: 'No HDR',
  hdr10: 'HDR10',
  hdr10_plus: 'HDR10+',
  dolby_vision: 'Dolby Vision',
  hdr10_plus_dolby_vision: 'HDR10+ / Dolby Vision',
  unknown: 'Unknown',
}

// ── Section mappers — label keys MUST match the admin form inputs ────────────

export function mapDesign(d: Rec | undefined): Record<string, string> {
  if (!d) return {}
  const dims = join([num(d.height_mm), num(d.width_mm), num(d.thickness_mm)], ' x ')
  return dropEmpty({
    Dimensions: dims ? `${dims} mm` : '',
    Weight: num(d.weight_g, ' g'),
    Front: str(d.front_glass_protection),
    Back: str(d.back_material),
    Side: str(d.frame_material),
    Ports: str(d.ports),
    Speakers: str(d.speakers),
    Colours: str(d.colors),
    'IP Rating': str(d.ip_rating),
  })
}

export function mapDisplay(d: Rec | undefined): Record<string, string> {
  if (!d) return {}
  const size = num(d.size_inches)
  const width = num(d.resolution_width)
  const height = num(d.resolution_height)
  return dropEmpty({
    Size: size ? `${size}"` : '',
    Type: str(d.display_type),
    Resolution: width && height ? `${width} x ${height} px` : '',
    'Refresh Rate': num(d.refresh_hz, ' Hz'),
    'Peak Brightness': num(d.peak_brightness_nits, ' nits'),
    HDR: d.hdr ? HDR_LABELS[String(d.hdr)] ?? '' : '',
  })
}

export function mapProcessor(p: Rec | undefined): Record<string, string> {
  if (!p) return {}
  return dropEmpty({
    Chipset: str(p.chipset_name),
    CPU: str(p.cpu),
    GPU: str(p.gpu),
    'Node size': str(p.process_node),
    NPU: str(p.npu),
  })
}

export function mapMemory(m: Rec | undefined): Record<string, string> {
  if (!m) return {}
  return dropEmpty({
    RAM: num(m.ram_gb, ' GB'),
    'RAM type': str(m.ram_type),
    Storage: num(m.storage_gb, ' GB'),
    'Storage type': str(m.storage_type),
  })
}

export function mapBattery(b: Rec | undefined): Record<string, string> {
  if (!b) return {}
  return dropEmpty({
    Capacity: num(b.capacity_mah, ' mAh'),
    'Battery type': str(b.battery_type),
    'Wired charging': num(b.wired_w, ' W'),
    'Wireless charging': num(b.wireless_w, ' W'),
    'Reverse charging': num(b.reverse_wireless_w, ' W'),
    'Charging protocols': str(b.protocols),
  })
}

export function mapConnectivity(c: Rec | undefined): Record<string, string> {
  if (!c) return {}
  return dropEmpty({
    WiFi: str(c.wifi),
    Bluetooth: str(c.bluetooth),
    NFC: tri(c.nfc),
    USB: str(c.usb),
    Positioning: str(c.positioning),
    'IR blaster': tri(c.ir_blaster),
  })
}

export function mapNetwork(n: Rec | undefined): Record<string, string> {
  if (!n) return {}
  return dropEmpty({
    SIM: str(n.sim),
    Technology: str(n.technology),
    '2G bands': str(n.bands_2g),
    '3G bands': str(n.bands_3g),
    '4G bands': str(n.bands_4g),
    '5G bands': str(n.bands_5g),
  })
}

export function mapSoftware(s: Rec | undefined): Record<string, string> {
  if (!s) return {}
  return dropEmpty({
    OS: str(s.os),
    'UI layer': str(s.ui),
    'Major OS upgrades': str(s.os_upgrades),
    'Security patches': str(s.security_patches),
  })
}

// ── Camera: canonical units → the structured CameraSpec the form edits ───────

export const REAR_TYPES: RearCameraType[] = REAR_CAMERA_TOKENS

/**
 * Infer the form's camera token from a canonical unit's role string.
 * Delegates to the shared alias resolver so "Ultra-wide", "Ultrawide",
 * "Ultra wide angle", "Periscope telephoto" etc. all land in the right slot
 * (previously 'Periscope' collapsed into 'Telephoto' and unknown → 'Main').
 */
export function rearTypeFromUnit(type: unknown): RearCameraType {
  const slot = resolveCameraSlot(type) ?? 'main'
  return slotToken(slot) as RearCameraType
}

/** Build the human-readable sensor description the form stores. */
export function cameraUnitLabel(unit: Rec): string {
  const mp = num(unit.megapixels)
  const size = str(unit.sensor_size)
  const aperture = unit.aperture != null ? `f/${num(unit.aperture)}` : ''
  const ois = unit.ois === 'yes' ? 'OIS' : ''
  const af = str(unit.af)
  const focal = num(unit.focal_length_mm, 'mm')
  return join([mp ? `${mp} MP` : '', size, aperture, focal, ois, af], ' · ')
}

/** Canonical camera block → CameraSpec, or null when no unit was provided. */
export function mapCamera(c: Rec | undefined): CameraSpec | null {
  if (!c) return null
  const units = Array.isArray(c.rear_units) ? (c.rear_units as Rec[]) : []
  const rear = units
    .map((u, i) => {
      const type = rearTypeFromUnit(u.type)
      return {
        id: `import-${i}-${type}`,
        slot: tokenToSlot(type) ?? 'main',
        type,
        sensorType: cameraUnitLabel(u),
      }
    })
    .filter((u) => u.sensorType.trim().length > 0)

  const selfieUnit = (c.selfie ?? null) as Rec | null
  const videoModes = Array.isArray(c.video_modes) ? str(c.video_modes) : ''
  const features = join([str(c.features)], ', ')

  if (rear.length === 0 && !selfieUnit && !videoModes) return null

  return {
    rear,
    selfie: { sensorType: selfieUnit ? cameraUnitLabel(selfieUnit) : '' },
    video: { rear: videoModes, front: '', features },
    extras: str(c.extras),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface PrefillSource {
  identity: {
    name: string
    brand: string | null
    releaseYear: number | null
    tagline?: string | null
  }
  specs: Partial<DeviceSpecs> | Record<string, unknown>
}

/**
 * Convert a normalized import preview into the shape the admin device form
 * consumes (DevicePrefill). Only fields the sources actually provided appear —
 * everything else is left for the admin to fill or for another import.
 */
export function specsToDevicePrefill(source: PrefillSource): DevicePrefill {
  const specs = (source.specs ?? {}) as Record<string, Rec | undefined>
  const camera = mapCamera(specs.specs_camera)

  const prefillSpecs: NonNullable<DevicePrefill['specs']> = {}
  const design = mapDesign(specs.specs_design)
  const display = mapDisplay(specs.specs_display)
  const processor = mapProcessor(specs.specs_processor)
  const memory = mapMemory(specs.specs_memory)
  const battery = mapBattery(specs.specs_battery)
  const connectivity = mapConnectivity(specs.specs_connectivity)
  const network = mapNetwork(specs.specs_network)
  const software = mapSoftware(specs.specs_software)

  if (Object.keys(design).length) prefillSpecs.design = design
  if (Object.keys(display).length) prefillSpecs.display = display
  if (Object.keys(processor).length) prefillSpecs.processor = processor
  if (Object.keys(memory).length) prefillSpecs.memory = memory
  if (Object.keys(battery).length) prefillSpecs.battery = battery
  if (Object.keys(connectivity).length) prefillSpecs.connectivity = connectivity
  if (Object.keys(network).length) prefillSpecs.network = network
  if (Object.keys(software).length) prefillSpecs.software = software
  if (camera) {
    prefillSpecs.camera = {
      rear: camera.rear.map((r) => ({ type: r.type, sensorType: r.sensorType })),
      selfie: camera.selfie.sensorType || null,
      video: camera.video.rear || null,
      extras: camera.extras || null,
    }
  }

  return {
    name: source.identity.name || null,
    brandName: source.identity.brand,
    releaseYear: source.identity.releaseYear,
    tagline: source.identity.tagline ?? null,
    specs: Object.keys(prefillSpecs).length ? prefillSpecs : undefined,
  }
}

/** Count how many canonical spec leaves an import actually provided (§14). */
export function countSpecLeaves(specs: Record<string, unknown> | Partial<DeviceSpecs>): number {
  let n = 0
  for (const [section, values] of Object.entries(specs ?? {})) {
    if (section === 'specs_camera') {
      const c = values as Rec
      if (Array.isArray(c?.rear_units)) n += c.rear_units.length
      if (c?.selfie) n += 1
      if (c?.video_modes) n += 1
      continue
    }
    if (values && typeof values === 'object') {
      n += Object.values(values as Rec).filter((v) => v != null && v !== '').length
    }
  }
  return n
}