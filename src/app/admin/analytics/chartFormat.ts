// Shared, timezone-safe date + label helpers for the analytics charts.
//
// Raw dates arrive as `YYYY-MM-DD` (UTC calendar day — matching the keys used
// by the server-side zero-fillers in `src/lib/analytics/queries.ts`). We parse
// them as local midnights so hover / axis labels always read as the intended
// calendar day, regardless of the viewer's timezone.

export function parseISODate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(value)
}

/** "Wed, Sep 9, 2026" — full month / day / year for tooltip hover labels. */
export function formatHoverDate(value: string): string {
  const d = parseISODate(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "Sep 9" — compact label for axis ticks. */
export function formatAxisDate(value: string): string {
  const d = parseISODate(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
}

// Palette kept in sync with `page_views` source enum so a channel reads the
// same colour in the stacked mix, treemap and sankey. Fixed hex (not CSS vars)
// so the treemap can tint them in JS.
export const SOURCE_COLORS: Record<string, string> = {
  direct: '#94A3B8',
  search: '#3B82F6',
  social: '#F59E0B',
  referral: '#10B981',
}

const SECTION_LABELS_CHART: Record<string, string> = {
  devices: 'Devices',
  articles: 'Articles',
  videos: 'Videos',
  compare: 'Compare',
  search: 'Search',
  other: 'Other',
}

export function sectionLabel(section: string): string {
  return SECTION_LABELS_CHART[section] ?? section.charAt(0).toUpperCase() + section.slice(1)
}

let regionNames: Intl.DisplayNames | null = null

/** Full country name from an ISO-3166 alpha-2 code (falls back to the code). */
export function countryName(code: string): string {
  try {
    if (!regionNames) regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

/** "US" → "🇺🇸" via regional-indicator codepoints. */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return null
  const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Blend a hex colour toward another hex by `amount` (0 → keep, 1 → target). */
export function tint(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  if (!a || !b) return hex
  const r = Math.round(a[0] + (b[0] - a[0]) * amount)
  const g = Math.round(a[1] + (b[1] - a[1]) * amount)
  const bl = Math.round(a[2] + (b[2] - a[2]) * amount)
  return `rgb(${r}, ${g}, ${bl})`
}