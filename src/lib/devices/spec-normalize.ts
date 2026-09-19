// Spec value normalization: converts messy source strings ("5200 mAh",
// '6.9"', "f/1.7", "120Hz", '1/1.3"') into the typed canonical values of
// spec-schema.ts. Pure functions — deterministic, never throws, never
// invents: an unparseable value returns null (Phone spec §14).

/** First numeric occurrence in a string (handles "12,000", "5 200"). */
export function num(text: unknown): number | null {
  if (typeof text === 'number' && Number.isFinite(text)) return text
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/[,\s]/g, '')
  const m = cleaned.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

export function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

/**
 * "6.9 inches", '6.9"', "17.23 cm (6.78 inches)" → 6.9 / 6.9 / 6.78
 *
 * The inch value is preferred over any other number: "17.23 cm (6.78 inches)"
 * must resolve to 6.78, not to the centimetre figure. When no inch marker is
 * present the first number is used (adapters that pass a bare "6.78").
 */
export function inches(value: unknown): number | null {
  if (value == null) return null
  const s = String(value)
  const marked =
    s.match(/(\d+(?:\.\d+)?)\s*(?:inch(?:es)?|["″”])/i) ??
    s.match(/["″”]\s*(\d+(?:\.\d+)?)/)
  const candidate = marked ? Number(marked[1]) : num(s)
  if (candidate == null || !Number.isFinite(candidate)) return null
  return candidate > 1 && candidate < 20 ? candidate : null
}

/** "5200 mAh" → 5200 */
export function mah(value: unknown): number | null {
  if (value == null) return null
  const n = num(value)
  return n != null && n > 100 && n < 20000 ? n : null
}

/** "120W", "120 watts" → 120 */
export function watts(value: unknown): number | null {
  if (value == null) return null
  const n = num(String(value))
  return n != null && n >= 0 && n <= 500 ? n : null
}

/** "145 g" → 145 */
export function grams(value: unknown): number | null {
  const n = num(value)
  return n != null && n > 0 && n < 2000 ? n : null
}

/** "8.4 mm" → 8.4 */
export function mm(value: unknown): number | null {
  const n = num(value)
  return n != null && n > 0 && n < 1000 ? n : null
}

/** "165Hz" → 165 */
export function hertz(value: unknown): number | null {
  if (value == null) return null
  const n = num(value)
  return n != null && n > 0 && n <= 500 ? n : null
}

/** "1440 x 3200" → 1440 */
export function resolutionWidth(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = value.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/)
  return m ? Number(m[1]) : null
}

export function resolutionHeight(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = value.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/)
  return m ? Number(m[2]) : null
}

/** "f/1.7", "ƒ/2.2", "1.7" → 1.7 */
export function aperture(value: unknown): number | null {
  if (value == null) return null
  const s = String(value)
  const m = s.match(/[fƒ]\s*\/\s*(\d+(?:\.\d+)?)/) ?? s.match(/^(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const n = Number(m[1])
  return n >= 0.5 && n <= 12 ? n : null
}

/** "200MP", "200 MP" → 200 */
export function megapixels(value: unknown): number | null {
  if (value == null) return null
  const n = num(value)
  return n != null && n > 0 && n <= 1000 ? n : null
}

/**
 * '1/1.3"' sensor format → area in mm².
 * Sensor "type" N means the diagonal is 16/N mm (1/inch convention); with a
 * 4:3 sensor: area = diag² × 0.48. Returns null when unparseable — never guesses.
 */
export function sensorAreaMm2(value: unknown): number | null {
  if (value == null) return null
  const m = String(value).match(/1\s*\/\s*(\d+(?:\.\d+)?)/)
  if (!m) return null
  const denom = Number(m[1])
  if (!Number.isFinite(denom) || denom <= 0) return null
  const diagMm = 16 / denom
  return Math.round(diagMm * diagMm * 0.48 * 100) / 100
}

/** "LPDDR5X", "LPDDR4x" → 'LPDDR5X' */
export function ramType(value: unknown): string | null {
  const t = text(value)
  if (!t) return null
  const m = t.match(/LPDDR\s?\d\s?X?/i)
  return m ? m[0].replace(/\s+/g, '').replace(/x$/i, 'X').toUpperCase() : t
}

/** "UFS 4.0", "ufs 3.1" → 'UFS 4.0' */

/** "5000 nits" → 5000 */
export function nits(value: unknown): number | null {
  if (value == null) return null
  const n = num(String(value))
  return n != null && n > 0 && n <= 10000 ? n : null
}

/** Detects HDR support level from free text (Ranking §10e inputs). */
export function hdrType(value: unknown): string | null {
  const t = text(value)
  if (!t) return null
  const s = t.toLowerCase()
  const hasH10 = s.includes('hdr10+') || s.includes('hdr10 plus')
  const hasDv = s.includes('dolby vision')
  if (hasH10 && hasDv) return 'hdr10_plus_dolby_vision'
  if (hasDv) return 'dolby_vision'
  if (hasH10) return 'hdr10_plus'
  if (s.includes('hdr')) return 'hdr10'
  return 'none'
}

/** Adaptive refresh classification from display text (Ranking §10c). */
export function adaptiveRefresh(value: unknown): 'fixed' | 'dynamic' | 'ltpo' | null {
  const t = text(value)
  if (!t) return null
  const s = t.toLowerCase()
  if (s.includes('ltpo') || s.includes('adaptive') || s.includes('1-120')) return 'ltpo'
  if (s.includes('dynamic')) return 'dynamic'
  return 'fixed'
}

/** IP rating extraction: "IP68 dust/water resistant" → 'IP68'. */
export function ipRating(value: unknown): string | null {
  const t = text(value)
  if (!t) return null
  const m = t.match(/\bIP\s?([0-9X]{2})\b/i)
  return m ? `IP${m[1].toUpperCase()}` : null
}

/**
 * Map source yes/no text to the tri-state without inventing. A textual
 * presence marker ("NFC enabled", "Supported", "Has gyroscope") is a YES;
 * an explicit absence marker is a NO; anything ambiguous stays 'unknown'
 * so the three-state contract holds (Phone spec §14).
 */
export function tri(value: unknown): 'yes' | 'no' | 'unknown' | null {
  const t = text(value)
  if (!t) return null
  const s = t.toLowerCase().trim()
  if (/^(yes|true|y)\b/.test(s)) return 'yes'
  if (/^(no|false|n)\b/.test(s)) return 'no'
  if (/\b(not supported|unsupported|absent|unavailable|disabled|does not support)\b/.test(s)) return 'no'
  if (/^(supported|enabled|available|present|included|has)\b/.test(s)) return 'yes'
  if (/\b(supported|enabled|available|present|built-?in)\b/.test(s)) return 'yes'
  return 'unknown'
}

/** True when the text describes an infrared/IR emitter (not a generic yes/no). */
export function mentionsInfrared(value: unknown): boolean {
  const t = text(value)
  if (!t) return false
  return /\b(infrared|ir blaster|ir emitter|ir remote)\b/i.test(t)
}

/**
 * PPI from canonical display fields (Ranking §10b).
 * Returns null unless width, height and size are all known.
 */
export function computePpi(
  width: number | null | undefined,
  height: number | null | undefined,
  sizeInches: number | null | undefined,
): number | null {
  if (!width || !height || !sizeInches || sizeInches <= 0) return null
  return Math.sqrt(width * width + height * height) / sizeInches
}

export function storageType(value: unknown): string | null {
  const t = text(value)
  if (!t) return null
  const m = t.match(/UFS\s?\d(?:\.\d)?/i)
  return m ? m[0].replace(/\s+/g, ' ').replace(/^ufs/i, 'UFS') : t
}

/** "12GB RAM", "12 GB" → 12 */
export function ramGb(value: unknown): number | null {
  const n = num(value)
  return n != null && n > 0 && n <= 64 ? n : null
}

/** "512GB", "1TB" → 512 / 1024 */
export function storageGb(value: unknown): number | null {
  if (value == null) return null
  const s = String(value)
  const tb = s.match(/(\d+(?:\.\d+)?)\s*TB/i)
  if (tb) return Math.round(Number(tb[1]) * 1024)
  const n = num(s)
  return n != null && n > 0 && n <= 4096 ? n : null
}
