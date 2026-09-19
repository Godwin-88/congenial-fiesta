// Canonical write gate (§24b) — every admin write path funnels spec sections
// through here before they reach devices.specs_*.
// ============================================================================
// The admin form and the chat prefill accept free-form label keys ("Dimensions",
// "RAM", "Capacity", "Refresh Rate" …) — but the ranking engine, the compare
// table and the spec UI read CANONICAL keys (height_mm, ram_gb, capacity_mah …).
// A label-keyed row is invisible to the engine: on 2026-09-19 a fully
// documented OnePlus 15 scored 9.1 because every section was label-keyed
// (only 29 of 100 points were even "known", of which it earned 2.6).
//
// This module maps label dialects onto the canonical schema deterministically
// (no LLM at the write path), then runs the result through the same normalize
// + zod gate the import agent uses.
//
// Never destructive: a section whose canonicalization yields nothing is
// preserved verbatim (no data loss); callers can inspect `unmapped` to learn
// which labels the dictionary does not know yet.

import * as norm from '@/lib/devices/spec-normalize'
import { normalizeExtraction } from '@/lib/devices/import-agent/normalize-extract'
import { validateSpecs } from '@/lib/devices/spec-schema'

type Section = Record<string, unknown>
type Entry = [target: string, value: unknown] // target: 'key' or 'specs_other.key'

interface SectionRule {
  labels: string[]
  map: (raw: unknown) => Entry[]
}

/** Lowercase / de-dash / collapse a label for dictionary lookup. */
function normLabel(label: string): string {
  return label.toLowerCase().replace(/[_\-/]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const pass = (key: string) => (raw: unknown): Entry[] => [[key, typeof raw === 'string' ? raw.trim() : raw]]

/** Canonical keys per section (mirror of spec-schema.ts). */
const CANONICAL_KEYS: Record<string, string[]> = {
  specs_design: ['height_mm', 'width_mm', 'thickness_mm', 'weight_g', 'ip_rating', 'frame_material', 'back_material', 'front_glass_protection', 'colors', 'speakers', 'ports'],
  specs_display: ['size_inches', 'display_type', 'resolution_width', 'resolution_height', 'resolution', 'refresh_hz', 'adaptive_refresh', 'peak_brightness_nits', 'brightness_measured', 'hdr', 'secondary_display'],
  specs_processor: ['chipset_name', 'cpu', 'cpu_architecture', 'gpu', 'process_node', 'npu', 'max_clock_ghz'],
  specs_memory: ['ram_gb', 'ram_type', 'storage_gb', 'storage_type', 'variants'],
  specs_camera: ['rear', 'selfie', 'video_features', 'extras'],
  specs_battery: ['capacity_mah', 'battery_type', 'wired_w', 'wireless_w', 'reverse_wireless_w', 'protocols'],
  specs_connectivity: ['wifi', 'bluetooth', 'nfc', 'usb', 'positioning', 'ir_blaster'],
  specs_network: ['sim', 'technology', 'bands_2g', 'bands_3g', 'bands_4g', 'bands_5g'],
  specs_software: ['os', 'ui', 'os_upgrades', 'security_patches'],
}

/** Strip marketing noise so chipset names match the `chipsets` table:
 *  "Snapdragon® 8 Elite Gen 5 Mobile Platform" → "Snapdragon 8 Elite Gen 5". */
export function normalizeChipsetName(raw: unknown): string | null {
  const t = norm.text(raw)
  if (!t) return null
  return (
    t
      .replace(/[®™©]/g, '')
      .replace(/\bmobile platform\b/gi, '')
      .replace(/\bplatform\b/gi, '')
      .replace(/\bsoc\b/gi, '')
      .replace(/\((\d+\s?nm)\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || null
  )
}

/** "161.4 x 76.7 x 8.2 mm" → height/width/thickness entries. */
function dimensionsMap(raw: unknown): Entry[] {
  if (typeof raw !== 'string') return []
  const m = raw.match(/([\d.]+)\s*[x×]\s*([\d.]+)\s*[x×]\s*([\d.]+)/)
  if (!m) return []
  const [h, w, t] = [norm.mm(m[1]), norm.mm(m[2]), norm.mm(m[3])]
  const out: Entry[] = []
  if (h != null) out.push(['height_mm', h])
  if (w != null) out.push(['width_mm', w])
  if (t != null) out.push(['thickness_mm', t])
  return out
}

/** Colors arrive as free text ("Black, Blue") — the schema wants an array. */
function colorsMap(raw: unknown): Entry[] {
  if (Array.isArray(raw)) return [['colors', raw]]
  if (typeof raw !== 'string' || !raw.trim()) return []
  const parts = raw.split(/,|\/|・/).map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 ? [['colors', parts]] : []
}

function chipsetMap(raw: unknown): Entry[] {
  const name = normalizeChipsetName(raw)
  return name ? [['chipset_name', name]] : []
}

/** Battery "Type": "Li-Po 7300 mAh" — keep the chemistry text; the mAh inside
 *  is parsed as a capacity fallback later (only when Capacity is absent). */
function batteryTypeMap(raw: unknown): Entry[] {
  const t = norm.text(raw)
  return t ? [['battery_type', t]] : []
}

const RULES: Record<string, SectionRule[]> = {
  specs_design: [
    { labels: ['dimensions', 'dimension', 'body size', 'body'], map: dimensionsMap },
    { labels: ['weight'], map: pass('weight_g') },
    { labels: ['ip rating', 'ip', 'water resistance', 'water dust resistance', 'ingress protection'], map: pass('ip_rating') },
    { labels: ['frame', 'frame material', 'chassis'], map: pass('frame_material') },
    { labels: ['back', 'back material'], map: pass('back_material') },
    { labels: ['build'], map: (raw) => {
      const t = norm.text(raw)
      return t ? [['frame_material', t], ['back_material', t]] : []
    } },
    { labels: ['front', 'front material', 'front glass', 'front protection', 'protection'], map: pass('front_glass_protection') },
    { labels: ['colors', 'colours', 'color options', 'colour options'], map: colorsMap },
    { labels: ['speakers', 'loudspeaker'], map: pass('speakers') },
    { labels: ['ports', 'usb', 'connector'], map: pass('ports') },
  ],
  specs_display: [
    { labels: ['size', 'display size', 'screen size'], map: pass('size_inches') },
    { labels: ['type', 'display type', 'display'], map: pass('display_type') },
    { labels: ['resolution', 'pixel resolution'], map: pass('resolution') },
    { labels: ['refresh rate', 'refresh'], map: pass('refresh_hz') },
    { labels: ['peak brightness', 'max brightness', 'brightness'], map: pass('peak_brightness_nits') },
    { labels: ['hdr'], map: pass('hdr') },
    { labels: ['adaptive refresh', 'adaptive refresh rate', 'adaptive'], map: pass('adaptive_refresh') },
    { labels: ['protection', 'glass protection'], map: pass('specs_design.front_glass_protection') },
  ],
  specs_processor: [
    { labels: ['chipset', 'soc', 'platform', 'processor'], map: chipsetMap },
    { labels: ['cpu'], map: pass('cpu') },
    { labels: ['gpu'], map: pass('gpu') },
    { labels: ['process', 'process node', 'process technology', 'fabrication', 'node'], map: pass('process_node') },
    { labels: ['npu', 'ai engine', 'ai'], map: pass('npu') },
    { labels: ['clock speed', 'max clock', 'max clock speed', 'cpu speed'], map: pass('max_clock_ghz') },
  ],
  specs_memory: [
    { labels: ['ram', 'memory'], map: pass('ram_gb') },
    { labels: ['ram type', 'memory type'], map: pass('ram_type') },
    { labels: ['storage', 'internal', 'internal storage'], map: pass('storage_gb') },
    { labels: ['storage type', 'storage technology'], map: pass('storage_type') },
  ],
  specs_battery: [
    { labels: ['capacity', 'battery capacity', 'battery'], map: pass('capacity_mah') },
    { labels: ['type', 'battery type', 'cell'], map: batteryTypeMap },
    { labels: ['wired charging', 'wired', 'wired charging speed'], map: pass('wired_w') },
    { labels: ['wireless charging', 'wireless', 'wireless charging speed'], map: pass('wireless_w') },
    { labels: ['reverse wireless charging', 'reverse wireless', 'reverse charging'], map: pass('reverse_wireless_w') },
  ],
  specs_connectivity: [
    { labels: ['wifi', 'wi fi', 'wlan'], map: pass('wifi') },
    { labels: ['bluetooth', 'bt'], map: pass('bluetooth') },
    { labels: ['usb', 'usb port'], map: pass('usb') },
    { labels: ['nfc'], map: pass('nfc') },
    { labels: ['ir blaster', 'infrared', 'ir'], map: pass('ir_blaster') },
    { labels: ['positioning', 'gps', 'location'], map: pass('positioning') },
  ],
  specs_network: [
    { labels: ['sim'], map: pass('sim') },
    { labels: ['technology', 'network technology', 'network'], map: pass('technology') },
    { labels: ['2g bands', '2g'], map: pass('bands_2g') },
    { labels: ['3g bands', '3g'], map: pass('bands_3g') },
    { labels: ['4g bands', '4g', 'lte bands'], map: pass('bands_4g') },
    { labels: ['5g bands', '5g'], map: pass('bands_5g') },
  ],
  specs_software: [
    { labels: ['os', 'operating system'], map: pass('os') },
    { labels: ['ui', 'skin', 'user interface'], map: pass('ui') },
    { labels: ['os upgrades', 'os updates', 'upgrades'], map: pass('os_upgrades') },
    { labels: ['security patches', 'security updates'], map: pass('security_patches') },
  ],
}

const RULE_INDEX: Record<string, Map<string, SectionRule>> = Object.fromEntries(
  Object.entries(RULES).map(([section, rules]) => [
    section,
    new Map(rules.flatMap((r) => r.labels.map((l) => [l, r] as const))),
  ]),
)

/**
 * Map label-keyed spec sections onto canonical keys. Returns validated
 * canonical sections plus the labels that found no rule, so callers can
 * surface coverage gaps instead of losing data silently.
 */
export function canonicalizeSpecSections(input: Record<string, unknown>): {
  sections: Record<string, Record<string, unknown>>
  unmapped: Record<string, string[]>
} {
  const canonicalInput: Record<string, Section> = {}
  const cross: Record<string, Entry[]> = {}
  const unmapped: Record<string, string[]> = {}

  for (const [section, rawSection] of Object.entries(input)) {
    if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) continue
    const known = CANONICAL_KEYS[section]
    if (!known) continue // not a spec section — left untouched by the gate
    const raw = rawSection as Section
    const mapped: Section = {}
    const rules = RULE_INDEX[section]
    const un: string[] = []
    for (const [key, value] of Object.entries(raw)) {
      if (value == null || (typeof value === 'string' && value.trim() === '')) continue
      if (known.includes(key)) {
        mapped[key] = value
        continue
      }
      const rule = rules?.get(normLabel(key))
      if (rule) {
        for (const [target, v] of rule.map(value)) {
          if (target.startsWith('specs_')) {
            const dot = target.indexOf('.')
            ;(cross[target.slice(0, dot)] ??= []).push([target.slice(dot + 1), v])
          } else {
            mapped[target] = v
          }
        }
      } else {
        un.push(key)
      }
    }
    canonicalInput[section] = mapped
    if (un.length > 0) unmapped[section] = un
  }

  // Cross-section entries (e.g. display "Protection" → design glass) merge
  // into their target section's input BEFORE normalization.
  for (const [sec, entries] of Object.entries(cross)) {
    if (!CANONICAL_KEYS[sec]) continue
    canonicalInput[sec] ??= {}
    for (const [key, v] of entries) if (canonicalInput[sec][key] == null) canonicalInput[sec][key] = v
  }

  // Capacity fallback: "Type: Li-Po 7300 mAh" with no explicit Capacity key —
  // feed the raw string as capacity and let the mAh parser do the rest.
  const bat = canonicalInput.specs_battery
  if (bat && bat.capacity_mah == null && typeof bat.battery_type === 'string') {
    if (norm.mah(bat.battery_type) != null) bat.capacity_mah = bat.battery_type
  }

  const { sections } = normalizeExtraction(canonicalInput as never)
  const { valid, rejected } = validateSpecs(sections as never)

  // Non-destructive merge: a section the pipeline could not produce (rejected,
  // or normalized to nothing) is preserved verbatim — no data is lost, and the
  // engine simply ignores what it cannot read (see the coverage gate).
  const out: Record<string, Section> = { ...valid }
  for (const [section, rawSection] of Object.entries(input)) {
    const raw = rawSection as Section | undefined
    if (!raw || typeof raw !== 'object') continue
    const produced = out[section]
    const unusable = rejected.includes(section) || !produced || Object.keys(produced).length === 0
    if (Object.keys(raw).length > 0 && unusable) out[section] = raw
  }

  return { sections: out, unmapped }
}

