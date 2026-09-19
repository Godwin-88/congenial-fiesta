// Source adapter: GSMArena (secondary aggregator).
// ============================================================================
// Spec §10b: GSMArena access lives behind its own adapter so the whole source
// can be swapped/removed without touching the engine — the implementation must
// not assume scraping is permitted and must degrade gracefully. Seeded
// INACTIVE in the sources table; the admin enables it deliberately.
//
// The parser is intentionally self-contained and best-effort: spec pages are
// server-rendered tables of <td class="ttl">Label</td><td class="nfo">Value</td>
// grouped under <th> section headers (Network, Body, Display, Platform, Memory,
// Main Camera, Selfie camera, Comms, Features, Battery). Any structural change
// yields empty results — never wrong values.

import * as norm from '@/lib/devices/spec-normalize'
import type { CameraUnit } from '@/lib/devices/spec-schema'
import type { SourceAdapter, SourceMatch, SpecSnapshot } from '../types'

const BASE_URL = 'https://www.gsmarena.com'
const UA = 'Mozilla/5.0 (compatible; FweezyTechImportBot/1.0; +https://fweezytech.com/bot)'

async function getPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

export interface ParsedRow {
  section: string
  label: string
  value: string
}

function cleanCell(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ordered (section, label, value) rows from a GSMArena spec page. */
export function parseSpecRows(html: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const re =
    /<th[^>]*>([\s\S]*?)<\/th>|<td class="ttl"[^>]*>([\s\S]*?)<\/td>\s*<td class="nfo[^"]*"[^>]*>([\s\S]*?)<\/td>/g
  let m: RegExpExecArray | null
  let section = ''
  while ((m = re.exec(html))) {
    if (m[1] != null) {
      section = cleanCell(m[1])
      continue
    }
    const label = cleanCell(m[2] ?? '')
    const value = cleanCell(m[3] ?? '')
    if (label && value) rows.push({ section, label, value })
  }
  return rows
}

function sectionRows(rows: ParsedRow[], section: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.section.toLowerCase() === section.toLowerCase() && !(r.label in out)) {
      out[r.label] = r.value
    }
  }
  return out
}

function pick(rows: Record<string, string>, label: string): string | null {
  if (rows[label] != null) return rows[label]
  const lower = label.toLowerCase()
  for (const key of Object.keys(rows)) {
    if (key.toLowerCase() === lower) return rows[key]
  }
  return null
}

function parseCameraUnits(cell: string, type: string): CameraUnit[] {
  // e.g. '200 MP, f/1.7, 24mm (wide), 1/1.3", PDAF, OIS'
  const out: CameraUnit[] = []
  const parts = cell.split(/(?=\d+(?:\.\d+)?\s*MP)/g).filter((p) => /\d+\s*MP/i.test(p))
  for (const cam of parts) {
    const sensor = cam.match(/1\/[\d.]+"/)?.[0] ?? null
    const unit: CameraUnit = {
      type,
      megapixels: norm.megapixels(cam.match(/(\d+(?:\.\d+)?)\s*MP/i)?.[1] ?? null),
      sensor_size: sensor,
      sensor_area_mm2: norm.sensorAreaMm2(sensor),
      sensor_model: norm.text(cam.match(/(IMX\d{3,4}|LYT-\d{3,4}|HP\d|GN\d|JN\d|OV\d{2,3})\w*/i)?.[0]),
      aperture: norm.aperture(cam.match(/[fƒ]\s*\/\s*(\d+(?:\.\d+)?)/)?.[0] ?? null),
      ois: /ois/i.test(cam) ? 'yes' : null,
      eis: /eis|gyro-/i.test(cam) ? 'yes' : null,
      af: norm.text(cam.match(/(dual pixel pdaf|dual pixel|pdaf|laser af|contrast af|fixed focus)/i)?.[0]),
      focal_length_mm: norm.num(cam.match(/(\d+(?:\.\d+)?)\s?mm/)?.[1] ?? null),
      optical_zoom_x: /periscope/i.test(cam)
        ? norm.num(cam.match(/(\d+(?:\.\d+)?)x/i)?.[1] ?? null)
        : norm.num(/optical zoom/i.test(cam) ? (cam.match(/(\d+(?:\.\d+)?)x/i)?.[1] ?? null) : null),
      video_modes: undefined,
      features: undefined,
    }
    if (Object.values(unit).some((v) => v != null)) out.push(unit)
  }
  return out
}

function soundRows(rows: ParsedRow[]): Record<string, string> {
  // GSMArena's section label is "Sound"; some layouts use "Misc".
  const sound = sectionRows(rows, 'Sound')
  return Object.keys(sound).length > 0 ? sound : sectionRows(rows, 'Misc')
}

export function mapGsmArenaRows(rows: ParsedRow[]) {
  const body = sectionRows(rows, 'Body')
  const display = sectionRows(rows, 'Display')
  const platform = sectionRows(rows, 'Platform')
  const memory = sectionRows(rows, 'Memory')
  const mainCam = sectionRows(rows, 'Main Camera')
  const selfieCam = sectionRows(rows, 'Selfie camera')
  const comms = sectionRows(rows, 'Comms')
  const features = sectionRows(rows, 'Features')
  const battery = sectionRows(rows, 'Battery')
  const network = sectionRows(rows, 'Network')

  const dims = pick(body, 'Dimensions')
  const dimParts = dims ? dims.split(/[x×]/).map((p) => norm.mm(p)) : []
  const resolution = pick(display, 'Resolution')
  const ipCell = `${pick(body, 'IP Rating') ?? ''} ${pick(body, 'Other') ?? ''} ${pick(body, 'Build') ?? ''}`
  const memoryInternal = pick(memory, 'Internal')
  const displayTypeCell = pick(display, 'Type') ?? ''

  const specs = {
    specs_design: {
      height_mm: dimParts[0] ?? null,
      width_mm: dimParts[1] ?? null,
      thickness_mm: dimParts[2] ?? null,
      weight_g: norm.grams(pick(body, 'Weight')),
      ip_rating: norm.ipRating(ipCell),
      frame_material: norm.text(pick(body, 'Build')),
      back_material: norm.text(pick(body, 'Build')),
      front_glass_protection: norm.text(pick(display, 'Protection')),
      colors: undefined,
      speakers: norm.text(pick(soundRows(rows), 'Loudspeaker')),
      ports: norm.text(pick(comms, 'USB')),
    },
    specs_display: {
      size_inches: norm.inches(pick(display, 'Size')),
      display_type: norm.text(displayTypeCell),
      resolution_width: norm.resolutionWidth(resolution),
      resolution_height: norm.resolutionHeight(resolution),
      refresh_hz: norm.hertz(displayTypeCell),
      adaptive_refresh: norm.adaptiveRefresh(displayTypeCell),
      peak_brightness_nits: norm.nits(displayTypeCell),
      brightness_measured: false,
      hdr: norm.hdrType(displayTypeCell) as 'hdr10' | 'hdr10_plus' | 'dolby_vision' | 'hdr10_plus_dolby_vision' | 'none' | null,
    },
    specs_processor: {
      chipset_name: norm.text(pick(platform, 'Chipset')),
      cpu: norm.text(pick(platform, 'CPU')),
      cpu_architecture: norm.text(pick(platform, 'CPU')),
      gpu: norm.text(pick(platform, 'GPU')),
      process_node: null,
      npu: null,
      max_clock_ghz: null,
    },
    specs_memory: {
      ram_gb: norm.ramGb(memoryInternal),
      ram_type: null,
      storage_gb: norm.storageGb(memoryInternal),
      storage_type: null,
      variants: undefined,
    },
    specs_camera: {
      rear: parseCameraUnits(
        pick(mainCam, 'Single') ?? pick(mainCam, 'Triple') ?? pick(mainCam, 'Dual') ?? pick(mainCam, 'Quad') ?? '',
        'Main',
      ),
      selfie: parseCameraUnits(pick(selfieCam, 'Single') ?? '', 'Front'),
      video_features: undefined,
      extras: norm.text(pick(mainCam, 'Features')),
    },
    specs_battery: {
      capacity_mah: norm.mah(pick(battery, 'Type')),
      battery_type: norm.text(pick(battery, 'Type')),
      wired_w: norm.watts(pick(battery, 'Wired charging') ?? pick(battery, 'Charging')),
      wireless_w: norm.watts(pick(battery, 'Wireless charging')),
      reverse_wireless_w: null,
      protocols: undefined,
    },
    specs_connectivity: {
      wifi: norm.text(pick(comms, 'WLAN')),
      bluetooth: norm.text(pick(comms, 'Bluetooth')),
      nfc: norm.tri(pick(comms, 'NFC')),
      usb: norm.text(pick(comms, 'USB')),
      positioning: undefined,
      ir_blaster: norm.tri(pick(comms, 'Infrared port')),
    },
    specs_network: {
      sim: undefined,
      technology: undefined,
      bands_2g: norm.text(pick(network, '2G bands')),
      bands_3g: norm.text(pick(network, '3G bands')),
      bands_4g: norm.text(pick(network, '4G bands')),
      bands_5g: norm.text(pick(network, '5G bands')),
    },
    specs_software: {
      os: norm.text(pick(platform, 'OS')),
      ui: null,
      os_upgrades: norm.text(pick(features, 'Major OS upgrades')),
      security_patches: norm.text(pick(features, 'Security patches')),
    },
  }
  return specs
}

export type GsmArenaSpecs = ReturnType<typeof mapGsmArenaRows>

function searchResultNames(html: string): Array<{ name: string; url: string }> {
  const out: Array<{ name: string; url: string }> = []
  const re = /<a href="((?:[\w-]+)-\d+\.php)"[^>]*>\s*([^<]+?)\s*<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < 20) {
    const name = m[2].trim()
    if (name.length < 3 || /review|pictures|compare|news|blog/i.test(name)) continue
    if (!out.some((x) => x.url === m![1])) out.push({ name, url: `${BASE_URL}/${m![1]}` })
  }
  return out
}

export function createGsmArenaAdapter(): SourceAdapter {
  return {
    slug: 'gsmarena',
    label: 'GSMArena',
    // Double gate: the admin must enable the source row AND set the env flag
    // before any request is made (spec §10b: use only where appropriate).
    isConfigured: () => process.env.GSMARENA_IMPORT_ENABLED === 'true',

    async search(query, limit = 10): Promise<SourceMatch[]> {
      const html = await getPage(
        `${BASE_URL}/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`,
      )
      if (!html) return []
      return searchResultNames(html)
        .slice(0, limit)
        .map((r) => ({
          externalId: r.url,
          name: r.name,
          brand: r.name.split(' ')[0] ?? null,
          releaseYear: null,
          url: r.url,
          thumbnail: null,
          sourceSlug: 'gsmarena',
          sourceLabel: 'GSMArena',
        }))
    },

    async fetchSpecs(match: SourceMatch): Promise<SpecSnapshot | null> {
      const html = await getPage(match.externalId)
      if (!html) return null
      const rows = parseSpecRows(html)
      if (rows.length === 0) return null
      const specs = mapGsmArenaRows(rows)
      const name = norm.text(match.name) ?? match.name
      const providedPaths = Object.entries(specs).flatMap(([section, values]) =>
        Object.entries(values as Record<string, unknown>)
          .filter(([, v]) => v != null)
          .map(([k]) => `${section}.${k}`),
      )
      return {
        match,
        specs,
        identity: {
          name,
          brand: match.brand ?? name.split(' ')[0] ?? null,
          modelNumber: null,
          releaseYear: norm.num(rows.find((r) => r.label.toLowerCase() === 'year')?.value ?? null),
          variantLabel: null,
          region: null,
          tagline: null,
        },
        raw: { url: match.externalId, rows },
        sourceUrl: match.externalId,
        providedPaths,
      }
    },
  }
}


