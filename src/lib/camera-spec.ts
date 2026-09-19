// CameraSpec — the admin form's camera model, and the lossless bridge to the
// canonical shape stored in devices.specs_camera.
// ============================================================================
// Why this exists: `devices.specs_camera` is written by TWO producers that used
// to disagree — the import agent (canonical CameraUnit[] with numbers) and the
// admin form (free-text sensorType). The old loader kept only id/type/sensorType
// and silently coerced any unrecognised type to 'Main', so loading an
// agent-imported device into the edit form and saving destroyed megapixels,
// sensor model, aperture, OIS and AF — which the ranking engine reads. This
// module now round-trips every field and resolves every type dialect to a
// canonical slot (see src/lib/devices/camera-types.ts).

import {
  REAR_SLOTS,
  SLOT_LABEL,
  REAR_CAMERA_TOKENS,
  type CameraSlot,
  type RearCameraToken,
  cameraSlotIndex,
  cameraUnitSummary,
  resolveCameraSlot,
  slotToken,
  tokenToSlot,
} from '@/lib/devices/camera-types'
import * as norm from '@/lib/devices/spec-normalize'

export type RearCameraType = RearCameraToken
export const REAR_CAMERA_TYPES: RearCameraType[] = REAR_CAMERA_TOKENS

/** Display label for a persisted token, e.g. 'Ultrawide' → "Ultrawide camera". */
export function rearCameraLabel(type: RearCameraType): string {
  const slot = tokenToSlot(type)
  return slot ? SLOT_LABEL[slot] : type
}

export interface RearCamera {
  id: string
  /** Canonical role — the single source of truth for labelling and ranking. */
  slot: CameraSlot
  /** Persisted token ('Ultrawide'), kept in sync with `slot`. */
  type: RearCameraType
  /** Human description the admin edits. */
  sensorType: string
  // ── Canonical detail preserved across load → edit → save ──
  megapixels?: number
  sensorModel?: string
  sensorSize?: string
  sensorAreaMm2?: number
  aperture?: number
  ois?: 'yes' | 'no' | 'unknown'
  eis?: 'yes' | 'no' | 'unknown'
  af?: string
  focalLengthMm?: number
  opticalZoomX?: number
  videoModes?: string[]
  features?: string[]
  /** Anything else the source supplied, kept verbatim. */
  extra?: Record<string, unknown>
}

export interface SelfieCamera {
  sensorType: string
  megapixels?: number
  sensorModel?: string
  sensorSize?: string
  sensorAreaMm2?: number
  aperture?: number
  af?: string
  focalLengthMm?: number
  extra?: Record<string, unknown>
}

export interface CameraSpec {
  rear: RearCamera[]
  selfie: SelfieCamera
  video: { rear: string; front: string; features: string }
  extras: string
}

export function emptySelfie(): SelfieCamera {
  return { sensorType: '' }
}

export function emptyCamera(): CameraSpec {
  return {
    rear: [],
    selfie: emptySelfie(),
    video: { rear: '', front: '', features: '' },
    extras: '',
  }
}

export function cameraHasContent(spec: CameraSpec | null | undefined): boolean {
  if (!spec) return false
  if ((spec.rear ?? []).some((c) => (c.sensorType ?? '').trim().length > 0)) return true
  if ((spec.selfie?.sensorType ?? '').trim().length > 0) return true
  if (spec.video?.rear?.trim() || spec.video?.front?.trim() || spec.video?.features?.trim()) return true
  if (spec.extras?.trim()) return true
  return false
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

// ── Free-text → structured (best effort, never invents) ─────────────────────

const SENSOR_MODEL_RE =
  /\b(IMX\s?\d{3,4}[A-Z]?|OV\d{2}[A-Z]?\d{0,3}|S5K[A-Z]{1,3}\d{2,3}|GC\d{1,2}[A-Z]\d{3}|JN\d|LYT\s?\d{3}|Hi-?\d{4}|Samsung\s?GN\d)\b/i

/** Parse the structured fields a free-form sensor description contains. */
export function parseCameraText(text: unknown): Partial<RearCamera> {
  const s = typeof text === 'string' ? text : ''
  if (!s.trim()) return {}
  const out: Partial<RearCamera> = {}
  const mp = norm.megapixels(s)
  if (mp != null) out.megapixels = mp
  const ap = norm.aperture(s)
  if (ap != null) out.aperture = ap
  const sensorSize = /(\d(?:\.\d+)?\/[\d.]+(?:\s*inch(?:es)?)?|\d(?:\.\d+)?\s*mm²|1\/[\d.]+")/i.exec(s)?.[1]
  if (sensorSize) {
    out.sensorSize = sensorSize.trim()
    const area = norm.sensorAreaMm2(sensorSize)
    if (area != null) out.sensorAreaMm2 = area
  }
  const model = SENSOR_MODEL_RE.exec(s)?.[1]
  if (model) out.sensorModel = model.replace(/\s+/g, ' ').trim()
  if (/\bois\b/i.test(s)) out.ois = 'yes'
  else if (/\beis\b/i.test(s)) out.eis = 'yes'
  const afMatch = /\b(PDAF|LDAF|CDAF|laser AF|laser autofocus|contrast AF|Dual Pixel AF|All pixel AF)\b/i.exec(s)
  if (afMatch) out.af = afMatch[1].toUpperCase()
  else if (/\baf\b|autofocus/i.test(s)) out.af = 'AF'
  const focal = /(\d{1,3}(?:\.\d+)?)\s*mm\b/i.exec(s)?.[1]
  if (focal) {
    const n = Number(focal)
    if (n > 0 && n < 400) out.focalLengthMm = n
  }
  const zoom = /(\d+(?:\.\d+)?)\s*x\b/i.exec(s)?.[1]
  if (zoom) {
    const n = Number(zoom)
    if (n > 0 && n <= 30) out.opticalZoomX = n
  }
  return out
}

// ── Reading either stored shape into the form model ─────────────────────────

interface Rec {
  [k: string]: unknown
}

function rec(value: unknown): Rec | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : null
}

function toStr(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/,/g, ''))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function toTernary(v: unknown): 'yes' | 'no' | 'unknown' | undefined {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  const s = toStr(v).toLowerCase()
  if (s === 'yes' || s === 'no' || s === 'unknown') return s
  return undefined
}

/** Keys we map onto named RearCamera fields; everything else is kept verbatim. */
const KNOWN_UNIT_KEYS = new Set([
  'id',
  'slot',
  'type',
  'name',
  'role',
  'sensorType',
  'megapixels',
  'sensor_model',
  'sensorSize',
  'sensor_size',
  'sensorAreaMm2',
  'sensor_area_mm2',
  'aperture',
  'ois',
  'eis',
  'af',
  'focalLengthMm',
  'focal_length_mm',
  'opticalZoomX',
  'optical_zoom_x',
  'videoModes',
  'video_modes',
  'features',
  'extra',
])

/** Pull the canonical fields off a stored unit, whichever key dialect it used. */
function readStructured(u: Rec): Partial<RearCamera> {
  const out: Partial<RearCamera> = {}
  const mp = toNum(u.megapixels)
  if (mp != null) out.megapixels = mp
  const sm = toStr(u.sensor_model)
  if (sm) out.sensorModel = sm
  const ss = toStr(u.sensor_size)
  if (ss) out.sensorSize = ss
  const sa = toNum(u.sensor_area_mm2)
  if (sa != null) out.sensorAreaMm2 = sa
  const ap = toNum(u.aperture)
  if (ap != null) out.aperture = ap
  const ois = toTernary(u.ois)
  if (ois) out.ois = ois
  const eis = toTernary(u.eis)
  if (eis) out.eis = eis
  const af = toStr(u.af)
  if (af) out.af = af
  const fl = toNum(u.focal_length_mm)
  if (fl != null) out.focalLengthMm = fl
  const oz = toNum(u.optical_zoom_x)
  if (oz != null) out.opticalZoomX = oz
  if (Array.isArray(u.video_modes)) out.videoModes = u.video_modes.map(toStr).filter(Boolean)
  if (Array.isArray(u.features)) out.features = u.features.map(toStr).filter(Boolean)
  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(u)) {
    if (!KNOWN_UNIT_KEYS.has(k) && v != null && typeof v !== 'object') extra[k] = v
  }
  if (Object.keys(extra).length) out.extra = extra
  return out
}

/** Positional fallback for a unit whose type carries no recognisable role:
 *  it takes the first rear slot nobody has claimed yet. */
function nextFreeRearSlot(taken: Set<CameraSlot>): CameraSlot {
  return REAR_SLOTS.find((s) => !taken.has(s)) ?? 'main'
}

function normalizeRearUnit(u: Rec, taken: Set<CameraSlot>): RearCamera | null {
  const sensorType = toStr(u.sensorType)
  const structured = readStructured(u)
  const hasDetail = Object.keys(structured).some((k) => k !== 'extra')
  if (!sensorType && !hasDetail) return null
  const resolved = resolveCameraSlot(u.slot ?? u.type ?? u.name ?? u.role)
  const slot = resolved ?? nextFreeRearSlot(taken)
  taken.add(slot)
  return {
    id: toStr(u.id) || makeId(),
    slot,
    type: slotToken(slot) as RearCameraType,
    sensorType: sensorType || cameraUnitSummary(u),
    ...structured,
  }
}

function normalizeSelfieUnit(u: Rec): SelfieCamera {
  const structured = readStructured(u) as Partial<SelfieCamera>
  const sensorType = toStr(u.sensorType)
  const summary = cameraUnitSummary(u)
  return {
    ...structured,
    sensorType: sensorType || summary,
  }
}

// Coerce arbitrary JSON (canonical, legacy structured, or flat legacy) into a
// valid CameraSpec — losslessly, so an edit round-trip never destroys data.
export function normalizeCamera(raw: unknown): CameraSpec {
  if (!raw || typeof raw !== 'object') return emptyCamera()
  const o = raw as any

  // Canonical agent shape or legacy structured shape: both use the `rear` /
  // `selfie` / `video` keys. The selfie camera may be an array (canonical)
  // or an object (legacy structured).
  const structured = Array.isArray(o.rear) || o.selfie != null || o.video != null || typeof o.extras === 'string'
  if (structured) {
    const taken = new Set<CameraSlot>()
    const rear: RearCamera[] = []
    if (Array.isArray(o.rear)) {
      for (const item of o.rear) {
        const u = rec(item)
        if (!u) continue
        const unit = normalizeRearUnit(u, taken)
        if (unit) rear.push(unit)
      }
    }
    // Present lenses in physical layout order (wide → ultrawide → tele → …),
    // matching how the public UI labels them.
    rear.sort((a, b) => cameraSlotIndex(a.slot) - cameraSlotIndex(b.slot))
    let selfie = emptySelfie()
    const selfieRec = Array.isArray(o.selfie) ? rec(o.selfie[0]) : rec(o.selfie)
    if (selfieRec) selfie = normalizeSelfieUnit(selfieRec)
    else if (typeof o.Front === 'string' && o.Front.trim()) selfie = { sensorType: o.Front }

    const videoFeatures = Array.isArray(o.video_features)
      ? o.video_features.filter((v: unknown) => typeof v === 'string' && v.trim()).join(', ')
      : ''
    return {
      rear,
      selfie,
      video: {
        rear: typeof o.video?.rear === 'string' ? o.video.rear : videoFeatures,
        front: typeof o.video?.front === 'string' ? o.video.front : '',
        features:
          typeof o.video?.features === 'string'
            ? o.video.features
            : Array.isArray(o.features)
              ? o.features.filter((v: unknown) => typeof v === 'string').join(', ')
              : '',
      },
      extras: typeof o.extras === 'string' ? o.extras : '',
    }
  }

  // Legacy flat shape: { Main, Ultrawide, Telephoto, 'Video (main)', Front, … }
  const taken = new Set<CameraSlot>()
  const rear: RearCamera[] = []
  for (const token of REAR_CAMERA_TOKENS) {
    const value = typeof o[token] === 'string' ? o[token] : toStr(rec(o[token])?.sensorType)
    if (!value) continue
    const unit = normalizeRearUnit(rec(o[token]) ?? { type: token, sensorType: value }, taken)
    if (unit) rear.push(unit)
  }
  return {
    rear,
    selfie: typeof o.Front === 'string' ? { sensorType: o.Front } : emptySelfie(),
    video: {
      rear: typeof o['Video (main)'] === 'string' ? o['Video (main)'] : '',
      front: typeof o['Video (front)'] === 'string' ? o['Video (front)'] : '',
      features: '',
    },
    extras: '',
  }
}

// ── Form model → canonical JSONB (what gets persisted) ──────────────────────

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => toStr(v)).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(/\n|,\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/** Strip null/empty keys — the canonical shape must not carry invented values. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue
    if (typeof v === 'string' && !v.trim()) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

/** Serialise the admin form model into the canonical JSONB shape the ranking
 *  engine and the public UI read. Free-text descriptions are parsed so that
 *  hand-entered cameras still contribute megapixels/aperture/OIS to ranking. */
export function cameraSpecToCanonical(spec: CameraSpec | null | undefined): Record<string, unknown> {
  const rear = (spec?.rear ?? [])
    .map((c) => {
      const parsed = parseCameraText(c.sensorType)
      return compact({
        // `slot` persists the same TitleCase token as `type` so one vocabulary
        // covers rows, migration and the ranking role matcher.
        slot: slotToken(c.slot),
        type: c.type,
        megapixels: c.megapixels ?? parsed.megapixels ?? null,
        sensor_model: c.sensorModel ?? parsed.sensorModel ?? null,
        sensor_size: c.sensorSize ?? null,
        sensor_area_mm2: c.sensorAreaMm2 ?? (c.sensorSize ? norm.sensorAreaMm2(c.sensorSize) : null),
        aperture: c.aperture ?? parsed.aperture ?? null,
        ois: c.ois ?? parsed.ois ?? null,
        eis: c.eis ?? parsed.eis ?? null,
        af: c.af ?? parsed.af ?? null,
        focal_length_mm: c.focalLengthMm ?? parsed.focalLengthMm ?? null,
        optical_zoom_x: c.opticalZoomX ?? parsed.opticalZoomX ?? null,
        video_modes: c.videoModes ?? null,
        features: c.features ?? null,
        extra: c.extra ?? null,
        sensorType: c.sensorType.trim() || null,
      })
    })
    .filter((u) => Object.keys(u).length > 0)

  const selfieRaw = spec?.selfie
  const selfieParsed = selfieRaw ? parseCameraText(selfieRaw.sensorType) : {}
  const selfie =
    selfieRaw && (selfieRaw.sensorType.trim() || selfieRaw.megapixels != null)
      ? compact({
          slot: 'selfie',
          type: 'Selfie',
          megapixels: selfieRaw.megapixels ?? selfieParsed.megapixels ?? null,
          sensor_model: selfieRaw.sensorModel ?? selfieParsed.sensorModel ?? null,
          sensor_size: selfieRaw.sensorSize ?? null,
          sensor_area_mm2:
            selfieRaw.sensorAreaMm2 ?? (selfieRaw.sensorSize ? norm.sensorAreaMm2(selfieRaw.sensorSize) : null),
          aperture: selfieRaw.aperture ?? selfieParsed.aperture ?? null,
          af: selfieRaw.af ?? selfieParsed.af ?? null,
          focal_length_mm: selfieRaw.focalLengthMm ?? selfieParsed.focalLengthMm ?? null,
          extra: selfieRaw.extra ?? null,
          sensorType: selfieRaw.sensorType.trim() || null,
        })
      : null

  const videoFeatures = toList(spec?.video?.rear)
  const features = toList(spec?.video?.features)
  const out: Record<string, unknown> = {
    rear,
    selfie,
    video_features: videoFeatures.length > 0 ? videoFeatures : null,
  }
  const extras = spec?.extras?.trim()
  if (extras) out.extras = extras
  return compact(out)
}

