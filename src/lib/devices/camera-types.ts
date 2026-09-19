// Camera slot taxonomy — single source of truth.
// ============================================================================
// Camera types arrive from every direction in their own dialect:
//   - the Groq field dictionary says "Ultra-wide"
//   - GSMArena writes "Ultrawide"
//   - MobileAPI.dev writes "Ultra wide angle"
//   - real spec sheets say "Periscope telephoto", "Monochrome", "ToF"
//   - the admin form historically stored TitleCase tokens
//
// Every one of those must resolve to the SAME slot so the admin form, the
// public specs table, the compare table and the ranking engine all agree.
// Previously an unresolvable type was silently coerced to 'Main' (so
// "Ultra-wide" became "Main"), which corrupted both the labels and the
// ranking inputs. Resolution is now explicit and lossless.
//
// Phone Database §18–23 / Ranking §23: camera units are distinct roles.

/** Canonical camera roles. `selfie` is the front-facing role. */
export type CameraSlot =
  | 'main'
  | 'ultrawide'
  | 'telephoto'
  | 'periscope'
  | 'macro'
  | 'depth'
  | 'monochrome'
  | 'selfie'

/** Rear-lens slots in the physical layout convention (wide → ultrawide → tele). */
export const REAR_SLOTS: CameraSlot[] = [
  'main',
  'ultrawide',
  'telephoto',
  'periscope',
  'macro',
  'depth',
  'monochrome',
]

export const ALL_SLOTS: CameraSlot[] = [...REAR_SLOTS, 'selfie']

/** What we persist in JSONB. TitleCase keeps backwards compatibility with
 *  rows written before the `slot` field existed. */
export type CameraToken =
  | 'Main'
  | 'Ultrawide'
  | 'Telephoto'
  | 'Periscope'
  | 'Macro'
  | 'Depth'
  | 'Monochrome'
  | 'Selfie'

/** Persisted tokens for rear lenses only. */
export type RearCameraToken = Exclude<CameraToken, 'Selfie'>

export const REAR_CAMERA_TOKENS: RearCameraToken[] = [
  'Main',
  'Ultrawide',
  'Telephoto',
  'Periscope',
  'Macro',
  'Depth',
  'Monochrome',
]

export const SLOT_TOKEN: Record<CameraSlot, CameraToken> = {
  main: 'Main',
  ultrawide: 'Ultrawide',
  telephoto: 'Telephoto',
  periscope: 'Periscope',
  macro: 'Macro',
  depth: 'Depth',
  monochrome: 'Monochrome',
  selfie: 'Selfie',
}

/** Human-facing names. This is what the admin and public UI render. */
export const SLOT_LABEL: Record<CameraSlot, string> = {
  main: 'Main camera',
  ultrawide: 'Ultrawide camera',
  telephoto: 'Telephoto camera',
  periscope: 'Periscope telephoto camera',
  macro: 'Macro camera',
  depth: 'Depth camera',
  monochrome: 'Monochrome camera',
  selfie: 'Selfie camera',
}

const SLOT_INDEX: Record<CameraSlot, number> = ALL_SLOTS.reduce(
  (acc, slot, i) => ({ ...acc, [slot]: i }),
  {} as Record<CameraSlot, number>,
)

export function cameraSlotIndex(slot: CameraSlot): number {
  return SLOT_INDEX[slot] ?? 99
}

/**
 * Alias table, most-specific first. Order matters: "Periscope telephoto" must
 * resolve to `periscope` (not `telephoto`), and "Ultra-wide angle" must resolve
 * to `ultrawide` (not `main`, whose `wide` alias would otherwise catch it).
 */
const ALIASES: Array<{ slot: CameraSlot; re: RegExp }> = [
  { slot: 'periscope', re: /\bperiscop/ },
  { slot: 'ultrawide', re: /\bultra ?wide\b|\bultrawide\b|\buw\b|\bwide angle\b|\bultra ?wide angle\b|\bultrawide angle\b/ },
  { slot: 'telephoto', re: /\btele ?photo\b|\btelephoto\b|\btele\b|\btelefoto\b|\bzoom lens\b/ },
  { slot: 'macro', re: /\bmacro\b|\btelemacro\b|\bmarco\b/ },
  { slot: 'depth', re: /\bdepth\b|\btof\b|\btime of flight\b/ },
  { slot: 'monochrome', re: /\bmonochrome\b|\bmono\b|\bmonochrom\b/ },
  { slot: 'selfie', re: /\bselfie\b|\bfront\b|\bfront facing\b|\bfront-?facing\b/ },
  { slot: 'main', re: /\bmain\b|\bprimary\b|\bstandard\b|\bwide\b|\bwide angle primary\b/ },
]

/** Normalise punctuation so "Ultra-wide" and "ultra_wide" both match. */
function foldType(raw: unknown): string {
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''
  return String(raw)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolve any camera type dialect to a canonical slot.
 * Returns null when the text carries no recognisable role — callers decide
 * the fallback, so nothing is silently relabelled.
 */
export function resolveCameraSlot(raw: unknown): CameraSlot | null {
  const t = foldType(raw)
  if (!t) return null
  for (const { slot, re } of ALIASES) {
    if (re.test(t)) return slot
  }
  return null
}

/** Canonical slot → the persistence token ('Ultrawide'). */
export function slotToken(slot: CameraSlot): CameraToken {
  return SLOT_TOKEN[slot]
}

/** Any stored/legacy token → slot (accepts 'Main', 'Ultrawide', 'Periscope'…). */
export function tokenToSlot(token: unknown): CameraSlot | null {
  return resolveCameraSlot(token)
}

/**
 * The label the UI renders. `ordinal` disambiguates duplicates, e.g. a phone
 * with two telephoto lenses renders "Telephoto camera 1"/"Telephoto camera 2"
 * rather than "Telephoto camera" twice.
 */
export function cameraLabel(slot: CameraSlot, ordinal?: number): string {
  const base = SLOT_LABEL[slot] ?? 'Rear camera'
  return ordinal && ordinal > 1 ? `${base} ${ordinal}` : base
}

/** Stable physical-layout ordering, independent of source array order. */
export function sortBySlot<T extends { slot: CameraSlot }>(units: T[]): T[] {
  return [...units].sort((a, b) => cameraSlotIndex(a.slot) - cameraSlotIndex(b.slot))
}

// ── Display reading of either stored shape ──────────────────────────────────
// `devices.specs_camera` holds two historical shapes:
//   canonical (import agent): { rear: [CameraUnit], selfie: [CameraUnit], video_features }
//   legacy    (admin form):   { rear: [{type, sensorType}], selfie: {sensorType}, video }
// plus the original flat shape { Main, Ultrawide, Telephoto, Front }.
// Every UI reads through these helpers so all three render identically.

export interface DisplayCamera {
  slot: CameraSlot
  /** e.g. "Telephoto camera 2" */
  label: string
  /** e.g. "50 MP · IMX906 · f/2.8 · OIS" */
  value: string
  /** original unit, for panels that want the raw numbers */
  raw: Record<string, unknown>
}

interface Rec {
  [k: string]: unknown
}

function asRecord(raw: unknown): Rec | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Rec) : null
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const m = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
    if (m) return Number(m[0])
  }
  return null
}

function asArrayFirst(value: unknown): Rec | null {
  if (!Array.isArray(value)) return null
  return asRecord(value[0])
}

/** Compose the human description of a canonical camera unit. */
export function cameraUnitSummary(unit: Rec): string {
  const parts: string[] = []
  const mp = asNumber(unit.megapixels)
  if (mp != null) parts.push(`${mp} MP`)
  const model = asText(unit.sensor_model)
  if (model) parts.push(model)
  const size = asText(unit.sensor_size)
  if (size) parts.push(size)
  const ap = asNumber(unit.aperture)
  if (ap != null) parts.push(`f/${ap}`)
  const focal = asNumber(unit.focal_length_mm)
  if (focal != null) parts.push(`${focal}mm`)
  const zoom = asNumber(unit.optical_zoom_x)
  if (zoom != null) parts.push(`${zoom}x optical`)
  if (unit.ois === 'yes') parts.push('OIS')
  else if (unit.eis === 'yes') parts.push('EIS')
  const af = asText(unit.af)
  if (af && af.toLowerCase() !== 'yes') parts.push(af)
  else if (af) parts.push('AF')
  return parts.join(' · ')
}

/** The stored value for a unit — legacy text wins, else composed canonical. */
function unitValue(unit: Rec): string {
  const legacy = asText(unit.sensorType)
  if (legacy) return legacy
  return cameraUnitSummary(unit)
}

function unitSlot(unit: Rec, fallback: CameraSlot | null): CameraSlot | null {
  const explicit = resolveCameraSlot(unit.slot ?? unit.type ?? unit.name ?? unit.role)
  return explicit ?? fallback
}

/**
 * Read the rear cameras of any stored shape into labelled display rows,
 * ordered by physical layout. Units with no resolvable role fall back to the
 * remaining unfilled rear slots in layout order, so nothing is relabelled
 * "Main" by accident.
 */
export function readRearCameras(raw: unknown): DisplayCamera[] {
  const cam = asRecord(raw)
  if (!cam) return []

  const collected: Array<{ unit: Rec; slot: CameraSlot | null }> = []

  if (Array.isArray(cam.rear)) {
    for (const item of cam.rear) {
      const unit = asRecord(item)
      if (unit) collected.push({ unit, slot: unitSlot(unit, null) })
    }
  } else {
    // Original flat shape: { Main, Ultrawide, Telephoto, Macro, Depth }
    for (const slot of REAR_SLOTS) {
      for (const key of [SLOT_TOKEN[slot], slot]) {
        const v = asText(cam[key])
        if (v) {
          collected.push({ unit: { type: key, sensorType: v }, slot })
          break
        }
      }
    }
    const legacyMain = asText(cam.main)
    if (legacyMain && !collected.some((c) => c.slot === 'main')) {
      collected.push({ unit: { type: 'Main', sensorType: legacyMain }, slot: 'main' })
    }
  }

  // Assign unresolved units to the first free rear slot (positional, not a guess).
  const taken = new Set(collected.map((c) => c.slot).filter(Boolean) as CameraSlot[])
  for (const entry of collected) {
    if (entry.slot) continue
    entry.slot = REAR_SLOTS.find((s) => !taken.has(s)) ?? 'main'
    taken.add(entry.slot)
  }

  const withSlots = collected
    .filter((c): c is { unit: Rec; slot: CameraSlot } => c.slot != null)
    .map((c) => ({ ...c, value: unitValue(c.unit) }))
    .filter((c) => c.value.length > 0)
    .sort((a, b) => cameraSlotIndex(a.slot) - cameraSlotIndex(b.slot))

  const counts = new Map<CameraSlot, number>()
  for (const c of withSlots) counts.set(c.slot, (counts.get(c.slot) ?? 0) + 1)
  const seen = new Map<CameraSlot, number>()

  return withSlots.map((c) => {
    const total = counts.get(c.slot) ?? 1
    const n = (seen.get(c.slot) ?? 0) + 1
    seen.set(c.slot, n)
    return {
      slot: c.slot,
      label: cameraLabel(c.slot, total > 1 ? n : undefined),
      value: c.value,
      raw: c.unit,
    }
  })
}

/** Adjective for a front-camera unit whose role is not plain 'selfie',
 *  e.g. the second front camera on dual-selfie phones is usually an
 *  ultrawide ("Ultrawide selfie camera"). */
const SELFIE_ROLE_ADJECTIVE: Partial<Record<CameraSlot, string>> = {
  ultrawide: 'Ultrawide',
  telephoto: 'Telephoto',
  periscope: 'Periscope',
  macro: 'Macro',
  depth: 'Depth',
  monochrome: 'Monochrome',
}

/**
 * Read ALL selfie cameras of any stored shape. Dual front cameras are real
 * (a main selfie plus an ultrawide selfie), so the selfie array may hold
 * several units. The first unit is the primary front camera; further units
 * are labelled by their resolved role ("Ultrawide selfie camera") or, when
 * roleless, by ordinal ("Selfie camera 2").
 */
export function readSelfieCameras(raw: unknown): DisplayCamera[] {
  const cam = asRecord(raw)
  if (!cam) return []

  // Collect every front unit — canonical array, legacy structured object,
  // or the original flat `Front` string.
  const units: Rec[] = []
  if (Array.isArray(cam.selfie)) {
    for (const item of cam.selfie) {
      const unit = asRecord(item)
      if (unit) units.push(unit)
    }
  } else if (asRecord(cam.selfie)) {
    units.push(asRecord(cam.selfie) as Rec)
  } else if (asArrayFirst(cam.selfie)) {
    units.push(asArrayFirst(cam.selfie) as Rec)
  } else {
    const legacy = asText(cam.Front) || asText(cam.front)
    if (legacy) units.push({ type: 'Selfie', sensorType: legacy })
  }

  const out: DisplayCamera[] = []
  for (const unit of units) {
    const value = unitValue(unit)
    if (!value) continue
    const role = resolveCameraSlot(unit.slot ?? unit.type ?? unit.name ?? unit.role) ?? 'selfie'
    const adjective = SELFIE_ROLE_ADJECTIVE[role]
    const label =
      out.length === 0
        ? SLOT_LABEL.selfie
        : adjective
          ? `${adjective} selfie camera`
          : 'Selfie camera'
    out.push({ slot: role, label, value, raw: unit })
  }
  // Ordinal fallbacks for consecutive plain roleless units beyond the first
  // (e.g. two front cameras both stored as 'Front').
  let plainExtra = 0
  for (let i = 1; i < out.length; i++) {
    if (!SELFIE_ROLE_ADJECTIVE[out[i].slot]) {
      plainExtra += 1
      out[i] = { ...out[i], label: `Selfie camera ${plainExtra + 1}` }
    }
  }
  return out
}

/** Read the primary selfie camera of any stored shape (first front unit). */
export function readSelfieCamera(raw: unknown): DisplayCamera | null {
  return readSelfieCameras(raw)[0] ?? null
}
