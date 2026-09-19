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

async function getPage(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(timeoutMs),
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
      // No brightness row on GSMArena pages — never leak the refresh rate
      // ("90Hz") into peak_brightness_nits. 'none' from hdrType means "the
      // cell text lacks an HDR mention", which is unknown here, not a
      // statement of absence.
      peak_brightness_nits: null,
      brightness_measured: false,
      hdr: /hdr/i.test(displayTypeCell)
        ? (norm.hdrType(displayTypeCell) as
            | 'hdr10'
            | 'hdr10_plus'
            | 'dolby_vision'
            | 'hdr10_plus_dolby_vision'
            | null)
        : null,
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

// ── Search fallbacks: quick endpoint → maker browse → sitemap catalog ───────
// results.php3 sits behind a Cloudflare Turnstile challenge for server-side
// clients (the challenge page is a 200 with zero device links), while device
// pages, maker listings (makers.php3 + <maker>-phones-<id>.php) and the
// phones.xml sitemap are plain GETs. Search therefore falls back to locally-
// scored browsing of those open pages. The sitemap lags the site by a few
// months (~1000 device ids), so fresh launches come from maker pages, which
// are ordered newest-first.

interface DeviceEntry {
  slug: string
  id: number
  url: string
  /** Display name, brand-prefixed when known (e.g. "Samsung Galaxy A18 4G"). */
  name: string
  brand: string | null
  releaseYear: number | null
  thumbnail: string | null
}

const SITEMAP_TTL_MS = 24 * 60 * 60 * 1000
const MAKER_LISTING_TTL_MS = 12 * 60 * 60 * 1000
/** Maker pages are newest-first; 4 pages ≈ the 200 newest devices of a brand. */
const MAX_MAKER_PAGES = 4

let makersIndexCache: { at: number; makers: Array<{ name: string; path: string }> } | null = null
let sitemapCache: { at: number; entries: DeviceEntry[] } | null = null
const makerListingCache = new Map<
  string,
  { at: number; entries: DeviceEntry[]; nextPath: string | null; pagesFetched: number }
>()

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Model tokens ("a18", "s25", "1610") are the discriminative ones. */
function digitTokensOf(tokens: string[]): string[] {
  return tokens.filter((t) => /\d/.test(t))
}

/**
 * Score one catalog entry against the query. Requires a digit-token hit when
 * the query has any (so "Samsung Galaxy A18" never surfaces every Galaxy), and
 * ≥2 alpha-token hits otherwise (so a bare "Fold" does not flood the results).
 */
function scoreEntry(entry: { slug: string; name: string }, queryTokens: string[], digitTokens: string[]): number {
  const hay = tokenize(`${entry.slug} ${entry.name}`)
  let score = 0
  let digitHit = 0
  for (const t of queryTokens) {
    if (!hay.includes(t)) continue
    const weighted = /\d/.test(t) ? 3 : 1
    score += weighted
    if (/\d/.test(t)) digitHit++
  }
  if (digitTokens.length > 0 && digitHit === 0) return 0
  if (digitTokens.length === 0 && score < 2) return 0
  return score
}

function nameFromSlug(slug: string): string {
  return tokenize(slug)
    .map((t) => (/^\d+g$/.test(t) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(' ')
}

function yearFromListingMeta(meta: string | null): number | null {
  if (!meta) return null
  const sentence = meta.match(/(?:Announced|Released)[^.]*/i)?.[0] ?? meta
  const year = norm.num(sentence)
  return year != null && year >= 1990 && year <= 2100 ? year : null
}

/** makers.php3 uses unquoted hrefs: <a href=samsung-phones-9.php>Samsung<br>. */
async function loadMakersIndex(): Promise<Array<{ name: string; path: string }>> {
  if (makersIndexCache && Date.now() - makersIndexCache.at < SITEMAP_TTL_MS) return makersIndexCache.makers
  const makers: Array<{ name: string; path: string }> = []
  const html = await getPage(`${BASE_URL}/makers.php3`)
  if (html) {
    const re = /<a href="?([a-z0-9_-]+-phones-\d+\.php)"?>\s*([A-Za-z0-9 '’&.-]+?)\s*(?:<br|<span)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      const name = m[2].replace(/\s+/g, ' ').trim()
      if (name) makers.push({ name, path: m[1] })
    }
  }
  makersIndexCache = { at: Date.now(), makers }
  return makers
}

/**
 * One maker-listing page. Device blocks look like:
 * <li><a href="samsung_galaxy_a18-14941.php"><img src=https://...jpg
 *   title="Samsung Galaxy A18 Android smartphone. Announced Sep 2026. ...">
 *   <strong><span>Galaxy A18 4G</span></strong></a></li>
 * (the img src attribute is unquoted — GSMArena renders it that way).
 */
function parseMakerListing(html: string, brand: string): { entries: DeviceEntry[]; nextPath: string | null } {
  const entries: DeviceEntry[] = []
  for (const chunk of html.split('<li><a href="').slice(1)) {
    const slugMatch = chunk.match(/^([a-z0-9_()%.-]+)-(\d+)\.php/)
    if (!slugMatch || slugMatch[1].includes('-phones-')) continue // filter/nav links
    const nameMatch = chunk.match(/<strong><span>([^<]+)<\/span>/)
    if (!nameMatch) continue
    const imgSrc = chunk.match(/<img[^>]*?src=("[^"]+"|[^ >]+)/)?.[1]?.replace(/"/g, '') ?? null
    const imgMeta = chunk.match(/title="([^"]*)"/)?.[1] ?? null
    const span = nameMatch[1].trim()
    const display = span.toLowerCase().startsWith(brand.toLowerCase()) ? span : `${brand} ${span}`
    entries.push({
      slug: slugMatch[1],
      id: Number(slugMatch[2]),
      url: `${BASE_URL}/${slugMatch[1]}-${slugMatch[2]}.php`,
      name: display,
      brand,
      releaseYear: yearFromListingMeta(imgMeta),
      thumbnail: imgSrc,
    })
  }
  const nextPath =
    html.match(/<a href="([^"]+)"[^>]*class="prevnextbutton"[^>]*title="Next page"/)?.[1] ??
    html.match(/title="Next page"[^>]*href="?([^"> ]+)"/)?.[1] ??
    null
  return { entries, nextPath }
}

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

async function loadMakerListing(
  maker: { name: string; path: string },
  requireDigitTokens: string[],
): Promise<DeviceEntry[]> {
  const cached = makerListingCache.get(maker.path)
  const fresh = cached && Date.now() - cached.at < MAKER_LISTING_TTL_MS ? cached : null
  const state = fresh ?? { at: Date.now(), entries: [], nextPath: null, pagesFetched: 0 }
  if (!fresh) makerListingCache.set(maker.path, state)

  const strongEnough = (entries: DeviceEntry[]): boolean => {
    if (requireDigitTokens.length === 0) return false
    return entries.some((e) => {
      const hay = tokenize(`${e.slug} ${e.name}`)
      return requireDigitTokens.every((t) => hay.includes(t))
    })
  }

  // Follow the live "Next page" link (format-proof) until a strong match is
  // found or the page cap is hit. Pages accumulate in the brand cache.
  let nextPage: string | null = state.pagesFetched === 0 ? maker.path : state.nextPath
  for (let page = state.pagesFetched; page < MAX_MAKER_PAGES; page++) {
    if (!nextPage) break
    if (state.pagesFetched > 0 && strongEnough(state.entries)) break
    const html = await getPage(nextPage.startsWith('http') ? nextPage : `${BASE_URL}/${nextPage}`)
    state.pagesFetched++
    if (!html) break
    const { entries, nextPath } = parseMakerListing(html, maker.name)
    const seen = new Set(state.entries.map((e) => e.url))
    for (const e of entries) if (!seen.has(e.url)) state.entries.push(e)
    state.nextPath = nextPath
    nextPage = nextPath
  }
  makerListingCache.set(maker.path, { ...state, at: Date.now() })
  return state.entries
}

/** phones.xml: every device page (spec pages only — skip -pictures/-related). */
async function loadSitemapCatalog(): Promise<DeviceEntry[]> {
  if (sitemapCache && Date.now() - sitemapCache.at < SITEMAP_TTL_MS) return sitemapCache.entries
  const xml = await getPage(`${BASE_URL}/sitemaps/phones.xml`, 45000)
  const entries: DeviceEntry[] = []
  if (xml) {
    const re = /<loc>\s*https:\/\/www\.gsmarena\.com\/([a-z0-9][a-z0-9_()%.-]*?)-(\d+)\.php\s*<\/loc>/g
    let m: RegExpExecArray | null
    const seen = new Set<string>()
    while ((m = re.exec(xml))) {
      const slug = m[1]
      if (slug.endsWith('-pictures') || seen.has(slug)) continue
      seen.add(slug)
      const brandToken = slug.split('_')[0] ?? ''
      entries.push({
        slug,
        id: Number(m[2]),
        url: `${BASE_URL}/${slug}-${m[2]}.php`,
        name: nameFromSlug(slug),
        brand: brandToken ? brandToken.charAt(0).toUpperCase() + brandToken.slice(1) : null,
        releaseYear: null,
        thumbnail: null,
      })
    }
  }
  sitemapCache = { at: Date.now(), entries }
  return entries
}

/**
 * Locally-scored search across the open GSMArena pages. Maker pages carry the
 * newest launches; the sitemap fills older devices and no-brand queries.
 */
async function catalogSearch(query: string, limit: number): Promise<SourceMatch[]> {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []
  const digits = digitTokensOf(queryTokens)

  const scored: Array<{ entry: DeviceEntry; score: number }> = []
  const push = (entry: DeviceEntry) => {
    const score = scoreEntry({ slug: entry.slug, name: entry.name }, queryTokens, digits)
    if (score > 0) scored.push({ entry, score })
  }

  // 1. Maker browse — resolve the brand from the query, then walk its listing.
  const makers = await loadMakersIndex()
  const maker = makers.find((m) => {
    const makerTokens = tokenize(m.name)
    return makerTokens.some((t) => queryTokens.includes(t))
  })
  if (maker) {
    for (const entry of await loadMakerListing(maker, digits)) push(entry)
  }

  // 2. Sitemap catalog — full historical coverage (a few months behind).
  for (const entry of await loadSitemapCatalog()) push(entry)

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.slug.length - b.entry.slug.length ||
      b.entry.id - a.entry.id,
  )
  const seen = new Set<string>()
  const out: SourceMatch[] = []
  for (const { entry } of scored) {
    if (seen.has(entry.url)) continue
    seen.add(entry.url)
    out.push({
      externalId: entry.url,
      name: entry.name,
      brand: entry.brand,
      releaseYear: entry.releaseYear,
      url: entry.url,
      thumbnail: entry.thumbnail,
      sourceSlug: 'gsmarena',
      sourceLabel: 'GSMArena',
    })
    if (out.length >= limit) break
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
      // Fast path: the dedicated quick-search endpoint (rich results, but
      // Turnstile-challenged for server clients — returns a linkless 200 then).
      const quickHtml = await getPage(
        `${BASE_URL}/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`,
      )
      const quick = quickHtml ? searchResultNames(quickHtml) : []
      if (quick.length > 0) {
        return quick.slice(0, limit).map((r) => ({
          externalId: r.url,
          name: r.name,
          brand: r.name.split(' ')[0] ?? null,
          releaseYear: null,
          url: r.url,
          thumbnail: null,
          sourceSlug: 'gsmarena',
          sourceLabel: 'GSMArena',
        }))
      }
      // Fallback: locally-scored browsing of maker listings + sitemap catalog.
      return catalogSearch(query, limit)
    },

    async fetchSpecs(match: SourceMatch): Promise<SpecSnapshot | null> {
      const html = await getPage(match.externalId)
      if (!html) return null
      const rows = parseSpecRows(html)
      if (rows.length === 0) return null
      const specs = mapGsmArenaRows(rows)
      // Canonical name from the page title ("Samsung Galaxy A18 4G - Full
      // phone specifications - GSMArena.com") — slugs/search anchors may be
      // abbreviated or brandless.
      const pageTitle = html.match(/<title>\s*([^<]+?)\s*<\/title>/i)?.[1] ?? null
      const canonicalName =
        norm.text(pageTitle?.replace(/\s*-\s*Full phone specifications[\s\S]*$/i, '')) ?? null
      const name = canonicalName ?? norm.text(match.name) ?? match.name
      // Release year lives in the Launch section ("Announced 2026, September
      // 15" / "Available. Released 2026, September 18").
      const launch = sectionRows(rows, 'Launch')
      const launchYear =
        norm.num(pick(launch, 'Announced') ?? pick(launch, 'Status') ?? null) ?? null
      const releaseYear =
        launchYear != null && launchYear >= 1990 && launchYear <= 2100
          ? launchYear
          : norm.num(rows.find((r) => r.label.toLowerCase() === 'year')?.value ?? null)
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
          releaseYear,
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


