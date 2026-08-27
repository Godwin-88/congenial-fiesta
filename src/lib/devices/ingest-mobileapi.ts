// Ingestion of device specs from MobileAPI.dev into the FweezyTech DB.
//
// Coverage mapping (MobileAPI types -> our device_types / major categories):
//   phone    -> phone        (major: phones)
//   tablet   -> tablet       (major: phones)
//   wearable -> smartwatch   (major: phones)
//   laptop/other (Apple only) -> macbook | imac | mac-mini (major: macs)
//
// Televisions and Sound (soundbars/speakers/headphones) are NOT available
// from this source and are intentionally skipped.

import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/devices/import'
import {
  fetchAllPages,
  fetchDeviceDetail,
  fetchDeviceImages,
  type MobileApiDevice,
} from '@/lib/devices/mobileapi'
import type { MajorCategory } from '@/types/cms'

const MAJOR_BY_TYPE: Record<string, MajorCategory> = {
  phone: 'phones',
  tablet: 'phones',
  smartwatch: 'phones',
  tv: 'televisions',
  soundbar: 'sound',
  speaker: 'sound',
  headphone: 'sound',
  macbook: 'macs',
  imac: 'macs',
  'mac-mini': 'macs',
}

function isApple(d: MobileApiDevice): boolean {
  const b = `${d.manufacturer_name || d.brand_name || d.brand || ''}`.toLowerCase()
  return b.includes('apple')
}

function classifyApple(d: MobileApiDevice): string {
  const n = `${d.name || ''}`.toLowerCase()
  if (n.includes('imac')) return 'imac'
  if (n.includes('mac mini') || n.includes('mac mini')) return 'mac-mini'
  return 'macbook'
}

export function classifyDevice(
  d: MobileApiDevice,
  assumedType?: string,
): { deviceTypeSlug: string; majorCategory: MajorCategory } | null {
  const rawType = `${d.type || d.device_type || assumedType || ''}`.toLowerCase().trim()
  let slug: string | null = null
  switch (rawType) {
    case 'phone':
      slug = 'phone'
      break
    case 'tablet':
      slug = 'tablet'
      break
    case 'wearable':
    case 'smartwatch':
      slug = 'smartwatch'
      break
    case 'laptop':
    case 'desktop':
    case 'other':
      slug = isApple(d) ? classifyApple(d) : null
      break
    default:
      slug = null
  }
  if (!slug) return null
  const major = MAJOR_BY_TYPE[slug]
  if (!major) return null
  return { deviceTypeSlug: slug, majorCategory: major }
}

function parseReleaseYear(releaseDate?: string): number | null {
  if (!releaseDate) return null
  const m = releaseDate.match(/\b(19|20)\d{2}\b/)
  return m ? Number(m[0]) : null
}

// MobileAPI.dev returns specs in snake_case; SpecTable renders Title-case
// keys, so we explicitly remap here. Unknown/empty fields are dropped.
function cleanObj(o: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

function parseRam(internal?: string): string | undefined {
  if (!internal) return undefined
  const m = internal.match(/(\d+\s?GB)\s*RAM/i)
  return m ? m[1] : undefined
}

function buildCamera(mainCam: any, selfieCam: any, misc: any): Record<string, any> {
  let rear: any[] = []
  if (Array.isArray(mainCam)) {
    rear = mainCam.map((m: any) => ({
      type: m?.type ?? 'Main',
      sensorType: m?.sensorType ?? m?.specifications ?? (typeof m === 'string' ? m : undefined),
    }))
  } else if (mainCam && typeof mainCam === 'object') {
    const entries = Object.entries(mainCam).filter(([, v]) => v != null && v !== '')
    if (entries.length) rear = entries.map(([k, v]) => ({ type: k, sensorType: v }))
  }

  let selfie: any = undefined
  if (selfieCam && typeof selfieCam === 'object') {
    const entries = Object.entries(selfieCam).filter(([, v]) => v != null && v !== '')
    selfie = entries.length
      ? Object.fromEntries(entries)
      : { sensorType: JSON.stringify(selfieCam) }
  }

  return {
    rear,
    selfie,
    video: misc?.video ?? undefined,
    extras: misc?.extras ?? undefined,
  }
}

export function mapSpecs(d: MobileApiDevice): Record<string, any> {
  const display = (d as any).display ?? {}
  const body = (d as any).body ?? {}
  const platform = (d as any).platform ?? {}
  const memory = (d as any).memory ?? {}
  const network = (d as any).network ?? {}
  const battery = (d as any).battery ?? {}
  const sound = (d as any).sound ?? {}
  const comms = (d as any).comms ?? {}
  const features = (d as any).features ?? {}
  const misc = (d as any).misc ?? {}
  const colors = (d as any).colors

  const specs_display = cleanObj({
    Size: display.size,
    Type: display.type,
    Resolution: display.resolution,
    'Refresh Rate': display.refresh_rate,
    'Pixel Density': display.pixel_density,
    'Screen-to-body ratio': display.screen_to_body_ratio,
    'Peak Brightness': display.peak_brightness,
    HDR: display.hdr,
    'Color depth': display.color_depth,
    Protection: display.protection,
  })

  const specs_design = cleanObj({
    Dimensions: body.dimensions,
    Weight: body.weight,
    Build: body.build,
    SIM: body.sim,
    Colours: colors,
    'IP Rating': body.other && /ip/i.test(String(body.other)) ? body.other : undefined,
    Ports: body.ports,
    Speakers: sound?.loudspeaker,
    '3.5mm jack': sound?.['3.5mm jack'],
  })

  const specs_processor = cleanObj({
    Chipset: platform.chipset,
    CPU: platform.cpu,
    GPU: platform.gpu,
    'Node size': platform['node size'] ?? platform.node_size,
    NPU: platform.npu,
  })

  const specs_memory = cleanObj({
    RAM: parseRam(memory.internal) ?? memory.ram,
    'RAM type': memory.ram_type,
    Storage: memory.internal,
    'Storage type': memory.storage_type,
    Expandable: memory.card_slot,
  })

  const specs_battery = cleanObj({
    Capacity: battery.capacity_mah ? `${battery.capacity_mah} mAh` : battery.type ?? (d as any).battery_capacity,
    'Battery type': battery.type,
    'Wired charging': battery.charging,
    'Wireless charging': battery.wireless_charging,
    'Reverse charging': battery.reverse_charging,
    'Charging protocols': battery.charging_protocols,
  })

  const specs_connectivity = cleanObj({
    WiFi: comms.wifi,
    Bluetooth: comms.bluetooth,
    NFC: comms.nfc,
    USB: comms.usb,
    Positioning: comms.positioning,
    'IR blaster': comms['ir blaster'],
  })

  const specs_network = cleanObj({
    SIM: network.sim ?? body.sim,
    Technology: network.technology,
    '2G bands': network.bands_2g,
    '3G bands': network.bands_3g,
    '4G bands': network.bands_4g,
    '5G bands': network.bands_5g,
  })

  const specs_software = cleanObj({
    OS: platform.os ?? misc?.os,
    'UI layer': platform['ui layer'] ?? platform.ui_layer,
    'Major OS upgrades': features?.['major os upgrades'],
    'Security patches': features?.['security patches'],
  })

  return {
    specs_design,
    specs_display,
    specs_processor,
    specs_memory,
    specs_camera: buildCamera((d as any).main_camera, (d as any).selfie_camera, misc),
    specs_battery,
    specs_connectivity,
    specs_network,
    specs_software,
  }
}

const IMAGE_BUCKET = 'device-images'

/** Decode a base64 image (with or without a data: prefix) and upload to
 *  Supabase Storage, returning the public URL. Returns null on any failure. */
async function uploadBase64Image(
  supabase: SupabaseClient,
  base64: string,
  slug: string,
): Promise<string | null> {
  try {
    const clean = String(base64).replace(/^data:image\/[a-zA-Z]+;base64,/, '')
    const buf = Buffer.from(clean, 'base64')
    if (buf.length === 0) return null
    const path = `ingested/${slug}.jpg`
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) {
      console.warn(`  image upload failed for ${slug}: ${error.message}`)
      return null
    }
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (err) {
    console.warn(`  image upload error for ${slug}: ${(err as Error).message}`)
    return null
  }
}

/** Download an image's bytes with the API auth token. The MobileAPI image
 *  endpoints reject the `Accept: image/webp,...` header that next/image sends
 *  (returning 406), so we fetch with a wildcard Accept header and re-host
 *  the bytes on our own Supabase Storage where next/image can serve them. */
async function downloadImageBytes(
  url: string,
  apiKey: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: '*/*' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    return { buf, contentType: res.headers.get('content-type') || 'image/jpeg' }
  } catch {
    return null
  }
}

/** Upload raw image bytes to Supabase Storage, returning the public URL. */
async function uploadImageBytes(
  supabase: SupabaseClient,
  buf: Buffer,
  contentType: string,
  slug: string,
): Promise<string | null> {
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const path = `ingested/${slug}.${ext}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, buf, { contentType, upsert: true })
  if (error) {
    console.warn(`  image upload failed for ${slug}: ${error.message}`)
    return null
  }
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

// Image types ordered by resolution (best first) for this source:
//   gallery (≈710×356) > main (≈160×212) > thumbnail (75×100).
const IMAGE_PRIORITY = ['gallery', 'main', 'thumbnail']

/** Resolve the best image and upload it to Supabase Storage so it can be
 *  served reliably. The source image URLs require auth and reject the Accept
 *  header next/image uses, so hotlinking them yields 401/406 broken images. */
async function resolveImageUrl(
  supabase: SupabaseClient,
  imageList: any,
  fallbackUrl: string | null | undefined,
  base64: string | null | undefined,
  slug: string,
  dryRun: boolean,
  apiKey: string,
): Promise<string | null> {
  if (dryRun) return null

  const arr = Array.isArray(imageList) ? imageList : []
  const candidateUrls: string[] = []
  for (const t of IMAGE_PRIORITY) {
    const u = arr.find((x: any) => x?.type === t && typeof x.image_url === 'string')?.image_url
    if (u) candidateUrls.push(u)
  }
  if (typeof fallbackUrl === 'string') candidateUrls.push(fallbackUrl)

  for (const url of candidateUrls) {
    const dl = await downloadImageBytes(url, apiKey)
    if (dl) {
      const up = await uploadImageBytes(supabase, dl.buf, dl.contentType, slug)
      if (up) return up
    }
  }

  // Last resort: the (low-res) base64 payload from the detail response.
  if (base64) {
    return uploadBase64Image(supabase, base64, slug)
  }
  return null
}

function extractPriceUsd(d: MobileApiDevice, misc: any): number | null {
  const raw = `${misc?.price ?? d.price ?? ''}`
  const m = raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Run `fn` over `items` with a bounded number of concurrent tasks. */
async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++
      await fn(items[i], i)
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
}

/** Resolve (creating if needed) the brand row, with a per-slug in-flight
 *  promise cache so concurrent tasks don't double-insert the same brand. */
async function ensureBrandId(
  supabase: SupabaseClient,
  brandCache: Map<string, number>,
  brandInFlight: Map<string, Promise<number | null>>,
  brandName: string,
  brandSlug: string,
): Promise<number | null> {
  const cached = brandCache.get(brandSlug)
  if (cached != null) return cached
  const inflight = brandInFlight.get(brandSlug)
  if (inflight) return inflight
  const p = (async () => {
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brandSlug)
      .maybeSingle()
    let id = existing?.id ?? null
    if (!id) {
      const { data: created, error } = await supabase
        .from('brands')
        .insert({ name: brandName, slug: brandSlug, logo_url: null, featured: false })
        .select('id')
        .single()
      if (error || !created) {
        console.error(`  brand insert failed for ${brandName}:`, error)
        id = null
      } else {
        id = created.id
      }
    }
    if (id != null) brandCache.set(brandSlug, id)
    return id
  })()
  brandInFlight.set(brandSlug, p)
  return p
}

export interface IngestOptions {
  types?: string[]
  years?: number[]
  brand?: string
  limit?: number
  delayMs?: number
  detail?: boolean
  dryRun?: boolean
  update?: boolean
  concurrency?: number
}

export interface IngestResult {
  fetched: number
  classified: number
  created: number
  updated: number
  skippedNoType: number
  skippedExists: number
  errors: number
}

export async function ingestMobileApi(
  supabase: SupabaseClient,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const {
    types,
    years,
    brand,
    limit,
    delayMs = 350,
    detail = true,
    dryRun = false,
    update = false,
    concurrency = 6,
  } = opts

  // Build the list of API jobs to run.
  const jobs: Array<{ path: string; params: Record<string, any>; assumedType?: string }> = []
  const now = new Date().getFullYear()
  const targetYears = years && years.length ? years : types || brand ? [] : [now, now - 1]
  for (const y of targetYears) {
    jobs.push({ path: '/devices/by-year/', params: { year: y } })
  }
  for (const t of types ?? []) {
    jobs.push({ path: '/devices/by-type/', params: { type: t }, assumedType: t })
  }
  if (brand) {
    jobs.push({ path: '/devices/by-manufacturer/', params: { manufacturer: brand } })
  }

  if (jobs.length === 0) {
    throw new Error('No ingestion jobs configured. Provide --years, --types, or --brand.')
  }

  // Cache device_type slug -> id and brand slug -> id.
  const { data: typeRows } = await supabase.from('device_types').select('id, slug')
  const typeMap = new Map<string, number>((typeRows ?? []).map((t: any) => [t.slug, t.id]))
  const brandCache = new Map<string, number>()
  const brandInFlight = new Map<string, Promise<number | null>>()

  const result: IngestResult = {
    fetched: 0,
    classified: 0,
    created: 0,
    updated: 0,
    skippedNoType: 0,
    skippedExists: 0,
    errors: 0,
  }

  const processed = new Set<string>()
  const totalLimit = limit ?? Infinity

  // Phase 1: enumerate + classify devices from the listing endpoints.
  const queue: Array<{
    raw: MobileApiDevice
    cls: NonNullable<ReturnType<typeof classifyDevice>>
    assumedType?: string
  }> = []

  for (const job of jobs) {
    let devices: MobileApiDevice[]
    try {
      devices = await fetchAllPages(job.path, job.params, limit)
    } catch (err) {
      console.error(`Failed to fetch ${job.path}:`, err)
      result.errors++
      continue
    }

    for (const raw of devices) {
      if (result.fetched >= totalLimit) break
      const idKey = String(raw.id ?? raw.name)
      if (processed.has(idKey)) continue
      processed.add(idKey)
      result.fetched++

      const cls = classifyDevice(raw, job.assumedType)
      if (!cls) {
        result.skippedNoType++
        continue
      }
      if (!typeMap.has(cls.deviceTypeSlug)) {
        result.skippedNoType++
        continue
      }
      result.classified++
      queue.push({ raw, cls, assumedType: job.assumedType })
    }
  }

  console.log(`Enumerated ${queue.length} devices to process (concurrency=${concurrency}).`)

  // Phase 2: fetch detail + images, rehost the image, and upsert — concurrently.
  await mapPool(queue, concurrency, async ({ raw, cls, assumedType }) => {
    const deviceTypeId = typeMap.get(cls.deviceTypeSlug)!

    let detailData: MobileApiDevice | undefined
    let imageList: any[] = []
    if (detail && raw.id != null) {
      try {
        detailData = await fetchDeviceDetail(raw.id)
        imageList = await fetchDeviceImages(raw.id)
      } catch (err) {
        console.warn(`  detail fetch failed for ${raw.id}: ${(err as Error).message}`)
      }
    }
    const merged = { ...raw, ...(detailData ?? {}) }

    const brandName =
      merged.manufacturer_name || merged.brand_name || merged.brand || merged.manufacturer?.name || 'Unknown'
    const brandSlug = slugify(brandName) || 'unknown'
    const brandId = dryRun ? null : await ensureBrandId(supabase, brandCache, brandInFlight, brandName, brandSlug)
    if (brandId == null && !dryRun) {
      result.errors++
      return
    }

    const misc = (merged as any).misc ?? {}
    const specs = mapSpecs(merged)
    const slug = slugify(merged.name || '') || brandSlug
    const imageUrl = await resolveImageUrl(
      supabase,
      imageList,
      detailData?.image_url,
      detailData?.image_b64,
      slug,
      dryRun,
      process.env.MOBILEAPI_KEY || '',
    )
    const releaseYear = parseReleaseYear(merged.release_date)
    const tagline = `${merged.about || merged.description || merged.name || ''}`.slice(0, 160)

    const payload = {
      name: merged.name || brandName,
      slug,
      brand_id: brandId,
      release_year: releaseYear,
      major_category: cls.majorCategory,
      device_type_id: deviceTypeId,
      tagline,
      status: 'draft' as const,
      scores_overall: 0,
      score_display: 0,
      score_performance: 0,
      score_camera: 0,
      score_battery: 0,
      score_value: 0,
      price_usd: extractPriceUsd(merged, misc),
      images: imageUrl ? [{ url: imageUrl, alt: merged.name || '', isPrimary: true }] : [],
      seo_description: tagline,
      ...specs,
    }

    if (dryRun) {
      console.log(`  [dry-run] would upsert: ${brandName} ${merged.name} (${cls.deviceTypeSlug})`)
      return
    }

    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingDevice) {
      if (!update) {
        result.skippedExists++
        return
      }
      const { error } = await supabase.from('devices').update(payload).eq('id', existingDevice.id)
      if (error) {
        console.error(`  update failed ${slug}:`, error)
        result.errors++
      } else {
        result.updated++
      }
    } else {
      const { error } = await supabase.from('devices').insert(payload)
      if (error) {
        console.error(`  insert failed ${slug}:`, error)
        result.errors++
      } else {
        result.created++
      }
    }
  })

  return result
}
