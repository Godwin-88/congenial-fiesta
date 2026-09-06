// Spec-aware vector text builder.
// ============================================================================
// The old indexDevice/indexArticle fed a ~20-word tagline into the vector DB,
// making semantic search shallow. These builders produce a rich, flat text
// snapshot of every spec section + verdict + pricing so the dense index can
// answer questions like "phone with 120Hz OLED, 5000mAh, Snapdragon 8 Gen 3".

import type { Device } from '@/types/cms'

/** Flatten a spec JSONB object (values may be objects/arrays) into text lines. */
function flattenSpec(spec: Record<string, unknown> | null | undefined): string[] {
  if (!spec || typeof spec !== 'object') return []
  const lines: string[] = []
  for (const [key, value] of Object.entries(spec)) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'object') {
      // Nested object (e.g. camera.rear[0].sensor) → key nested values
      const nested = flattenSpec(value as Record<string, unknown>)
      if (nested.length > 0) {
        lines.push(`${_friendly(key)}: ${nested.join(', ')}`)
      }
    } else {
      lines.push(`${_friendly(key)}: ${value}`)
    }
  }
  return lines
}

function _friendly(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Build a rich text snapshot for a device — used for both vector text and content hashing. */
export function buildDeviceText(device: Device): string {
  const brand = device.brand?.name ?? ''
  const parts: string[] = [
    `Device: ${device.name}`,
    brand && `Brand: ${brand}`,
    device.device_type?.label || device.major_category ? `Category: ${device.device_type?.label ?? device.major_category}` : '',
    device.release_year ? `Released: ${device.release_year}` : '',
    device.price_kes ? `Price in KES: ${device.price_kes}` : '',
    device.price_usd ? `Price in USD: ${device.price_usd}` : '',
    device.price_tier ? `Price tier: ${device.price_tier}` : '',
    device.tagline ?? '',
    device.scores_overall ? `Overall score: ${device.scores_overall}/100` : '',
  ].filter(Boolean)

  for (const [section, label] of [
    ['specs_design', 'Design'],
    ['specs_display', 'Display'],
    ['specs_processor', 'Processor'],
    ['specs_memory', 'Memory'],
    ['specs_camera', 'Camera'],
    ['specs_battery', 'Battery'],
    ['specs_connectivity', 'Connectivity'],
    ['specs_network', 'Network'],
    ['specs_software', 'Software'],
  ] as const) {
    const lines = flattenSpec(device[section] as Record<string, unknown>)
    if (lines.length > 0) {
      parts.push(`${label}: ${lines.join('; ')}`)
    }
  }

  if (device.verdict_bottom_line) parts.push(`Verdict: ${device.verdict_bottom_line}`)
  if (device.verdict_pros?.length) parts.push(`Pros: ${device.verdict_pros.join('; ')}`)
  if (device.verdict_cons?.length) parts.push(`Cons: ${device.verdict_cons.join('; ')}`)

  return parts.join('\n')
}

/** Simple deterministic hash for content-index-state reconciliation. */
export function sha256Hex(text: string): string {
  // sync-ish deterministic hash (FNV-1a) — good enough for change detection
  let h1 = 0xdeadbeef | 0
  let h2 = 0x41c6ce57 | 0
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}