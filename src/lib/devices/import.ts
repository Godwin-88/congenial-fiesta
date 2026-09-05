// Shared helpers for importing devices from YouTube RSS / external sources.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { YouTubeVideo } from '@/lib/youtube/client'
import { extractDeviceFromVideo } from '@/lib/devices/ai-extract'
import type { DeviceExtraction } from '@/lib/devices/ai-extract'
import { curateDeviceImages } from '@/lib/devices/image-agent'
import type { DeviceImageMeta } from '@/lib/devices/image-agent'


export const BRAND_KEYWORDS = [
  'iphone', 'ipad', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'redmi',
  'oppo', 'vivo', 'honor', 'nothing', 'motorola', 'razr', 'fold',
  'apple', 'samsung', 'google pixel', 'pixel', 'tecno', 'infinix',
  'itel', 'nokia', 'huawei', 'realme', 'asus', 'lenovo', 'hp',
  'dell', 'acer', 'msi', 'sony', 'lg', 'blackberry', 'fairphone',
]

// Map brand keywords to canonical brand names + slugs
const BRAND_MAP: Array<{ keywords: string[]; name: string; slug: string }> = [
  { keywords: ['iphone', 'ipad', 'apple'], name: 'Apple', slug: 'apple' },
  { keywords: ['galaxy', 'samsung'], name: 'Samsung', slug: 'samsung' },
  { keywords: ['pixel', 'google pixel'], name: 'Google', slug: 'google' },
  { keywords: ['oneplus'], name: 'OnePlus', slug: 'oneplus' },
  { keywords: ['xiaomi', 'poco'], name: 'Xiaomi', slug: 'xiaomi' },
  { keywords: ['redmi'], name: 'Redmi', slug: 'redmi' },
  { keywords: ['oppo'], name: 'Oppo', slug: 'oppo' },
  { keywords: ['vivo'], name: 'Vivo', slug: 'vivo' },
  { keywords: ['honor'], name: 'Honor', slug: 'honor' },
  { keywords: ['nothing'], name: 'Nothing', slug: 'nothing' },
  { keywords: ['motorola', 'razr'], name: 'Motorola', slug: 'motorola' },
  { keywords: ['tecno'], name: 'Tecno', slug: 'tecno' },
  { keywords: ['infinix'], name: 'Infinix', slug: 'infinix' },
  { keywords: ['itel'], name: 'Itel', slug: 'itel' },
  { keywords: ['nokia'], name: 'Nokia', slug: 'nokia' },
  { keywords: ['huawei'], name: 'Huawei', slug: 'huawei' },
  { keywords: ['realme'], name: 'Realme', slug: 'realme' },
  { keywords: ['asus'], name: 'Asus', slug: 'asus' },
  { keywords: ['lenovo'], name: 'Lenovo', slug: 'lenovo' },
  { keywords: ['hp', 'hewlett'], name: 'HP', slug: 'hp' },
  { keywords: ['dell'], name: 'Dell', slug: 'dell' },
  { keywords: ['acer'], name: 'Acer', slug: 'acer' },
  { keywords: ['msi'], name: 'MSI', slug: 'msi' },
  { keywords: ['sony'], name: 'Sony', slug: 'sony' },
  { keywords: ['lg'], name: 'LG', slug: 'lg' },
  { keywords: ['blackberry'], name: 'BlackBerry', slug: 'blackberry' },
  { keywords: ['fairphone'], name: 'Fairphone', slug: 'fairphone' },
]

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

export function detectBrand(text: string): { name: string; slug: string } | null {
  const haystack = text.toLowerCase()
  for (const brand of BRAND_MAP) {
    if (brand.keywords.some((kw) => haystack.includes(kw))) {
      return { name: brand.name, slug: brand.slug }
    }
  }
  return null
}

export function extractDeviceName(title: string): string | null {
  const cleaned = title
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^\(.*?\)\s*/, '')
    .replace(/\s+[-|].*$/, '') // ' - ', ' | ' separators — space required, so "hands-on" survives
    .replace(/:.*$/, '')       // 'Title: subtitle' colon separator
    .trim()

  // Match brand + model pattern anywhere in the title, e.g.
  // "iPhone 15 Pro", "Galaxy S24 Ultra", "... the new Poco F9 Pro ?"
  const match = cleaned.match(
    /(?:^|\s)((?:iPhone|iPad|Galaxy|Pixel|OnePlus|Xiaomi|Poco|Redmi|Oppo|Vivo|Honor|Nothing|Motorola|Razr|Fold|Tecno|Infinix|Itel|Nokia|Huawei|Realme|Asus|Lenovo|HP|Dell|Acer|MSI|Sony|LG|BlackBerry|Fairphone)[\w\s\+\-]*?)(?:\s*\(|\s+[-|]|\s*:|\s*$|\s+\?|\s+vs\b|\s+(?:review|unboxing)\b)/i,
  )
  if (match) {
    const name = match[1]
      .trim()
      .replace(/\s*(?:reviews?|unboxing|hands[- ]on|first[- ]look|impressions?|overview|specs?|rumo[u]?rs?|when?)\b.*$/i, '')
      .trim()
    if (name.length > 3) return name
  }

  // Fallback: only accept a raw title that structurally looks like a device
  // name (short phrase with a model number or tier word) — never a question
  // or a full sentence.
  if (cleaned.length > 3 && cleaned.length < 60) {
    const isSentence =
      /^(what|which|who|when|where|why|how|is|are|do|does|did|should|would|can|could|will|shall)\b/i.test(cleaned) ||
      /\?$/.test(cleaned)
    const looksLikeModel =
      /\d/.test(cleaned) ||
      /\b(pro|plus|ultra|mini|max|note|fold|flip|se|lite|neo)\b/i.test(cleaned)
    if (!isSentence && looksLikeModel) return cleaned
  }
  return null
}

export function inferCategory(name: string): 'flagship' | 'mid-range' | 'budget' | 'ultra-premium' {
  const lower = name.toLowerCase()
  if (
    lower.includes('pro max') ||
    lower.includes('ultra') ||
    lower.includes('fold') ||
    lower.includes('z fold') ||
    lower.includes('s24 ultra') ||
    lower.includes('s25 ultra')
  ) {
    return 'ultra-premium'
  }
  if (
    lower.includes('pro') ||
    lower.includes('plus') ||
    lower.includes('s24') ||
    lower.includes('s25') ||
    lower.includes('s23') ||
    lower.includes('pixel 8') ||
    lower.includes('pixel 9') ||
    lower.includes('iphone 15') ||
    lower.includes('iphone 16') ||
    lower.includes('oneplus 12') ||
    lower.includes('oneplus 13')
  ) {
    return 'flagship'
  }
  if (
    lower.includes('a5') ||
    lower.includes('a3') ||
    lower.includes('redmi note') ||
    lower.includes('moto g') ||
    lower.includes('pixel 7a') ||
    lower.includes('pixel 8a') ||
    lower.includes('iphone se')
  ) {
    return 'mid-range'
  }
  if (
    lower.includes('a1') ||
    lower.includes('redmi a') ||
    lower.includes('moto e') ||
    lower.includes('itel') ||
    lower.includes('infinix smart')
  ) {
    return 'budget'
  }
  return 'mid-range'
}

export function isDeviceItem(title: string, contentSnippet: string): boolean {
  const haystack = `${title} ${contentSnippet}`.toLowerCase()
  return BRAND_KEYWORDS.some((kw) => haystack.includes(kw))
}

export type ImportResult = {
  fetched: number
  created: number
  updated: number
  skipped: number
  aiExtracted: number
  imagesCurated: number
}

export type ImportOptions = {
  /** Use the Groq Device Analyzer to augment the regex name/brand and gate reviews. */
  aiExtract?: boolean
  /** Curate + re-host the highest-quality official images (Groq web search -> YouTube thumbnail). */
  curateImages?: boolean
  /** Insert devices as 'published' instead of drafts. Leave false so the admin reviews first. */
  publish?: boolean
  /**
   * Cap on how many videos are actually processed per run. When the AI pipeline
   * is on this defaults to 25 so the cron stays inside its runtime budget.
   */
  maxProcessed?: number
}

/** AI-augmented identity resolution: regex baseline, AI fills the gaps and prefers the fuller name. */
function resolveDeviceIdentity(
  extraction: DeviceExtraction | null,
  regexName: string | null,
  regexBrand: { name: string; slug: string } | null,
): { name: string | null; brand: { name: string; slug: string } | null } {
  if (!extraction) return { name: regexName, brand: regexBrand }

  // Prefer the AI-extracted device name whenever it is a clean, non-sentence
  // value — the LLM understands context the regex cannot ("Poco F9 Pro ?").
  let name = regexName
  const aiName = extraction.deviceName?.trim()
  if (aiName && aiName.length >= 3) {
    const cleanAi = aiName.replace(/[?.,;:]+$/, '').trim()
    const isSentence =
      /^(what|which|who|when|where|why|how|is|are|do|does|did|should|would|can|could|will|shall)\b/i.test(cleanAi) ||
      cleanAi.split(' ').length > 6
    if (!isSentence) name = cleanAi
  }

  let brand = regexBrand
  const aiBrand = extraction.brand?.trim()
  if (!brand && aiBrand) brand = detectBrand(aiBrand)
  return { name, brand }
}

/**
 * Core import loop: fetch latest YouTube videos, detect device mentions,
 * auto-create brands, and upsert devices as DRAFTS (admin reviews + publishes)
 * into Supabase. Used by both the QStash cron route and the one-off seeding script.
 *
 * Guarantees:
 *  - Never throws for a single video; per-video failures are counted as skipped.
 *  - Never touches `status='published'` devices, preserving admin-completed work.
 *  - With `aiExtract` the Groq Device Analyzer supplements the regex name/brand
 *    and gates non-review videos.
 *  - With `curateImages` the Image Curator picks the highest-quality official
 *    photo (Groq web search first, YouTube thumbnail fallback) and re-hosts it
 *    into Supabase Storage.
 */
export async function importDevicesFromYouTube(
  supabase: SupabaseClient,
  videos: YouTubeVideo[],
  opts: ImportOptions = {},
): Promise<ImportResult> {
  const { aiExtract = false, curateImages = false, publish = false } = opts
  const aiPipelineOn = aiExtract || curateImages
  // Stay inside the cron runtime budget: default cap when the AI pipeline is on.
  const maxProcessed = opts.maxProcessed ?? (aiPipelineOn ? 25 : videos.length)
  const startedAt = Date.now()
  const result: ImportResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    aiExtracted: 0,
    imagesCurated: 0,
  }

  let processed = 0
  for (const video of videos) {
    if (processed >= maxProcessed) break
    processed++
    result.fetched++
    const title = video.title || ''
    const description = video.description || ''

    // 1) Optional Groq structured extraction (null on failure -> degrade safely).
    const extraction = aiExtract ? await extractDeviceFromVideo(video) : null
    if (extraction) result.aiExtracted++

    // 2) Gate: is this actually a device review?
    const regexIsDevice = isDeviceItem(title, description)
    if (!extraction?.isDeviceReview && !regexIsDevice) {
      result.skipped++
      continue
    }

    // 3) Identity: regex baseline + AI augmentation.
    const baseName = extractDeviceName(title)
    const baseBrand = detectBrand(`${title} ${description}`)
    const { name, brand } = resolveDeviceIdentity(extraction, baseName, baseBrand)
    if (!name || !brand) {
      result.skipped++
      continue
    }

    const slug = slugify(name)
    if (!slug) {
      result.skipped++
      continue
    }

    try {
      // 4) Ensure the brand exists.
      let brandId: number | null = null
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand.slug)
        .maybeSingle()

      if (existingBrand) {
        brandId = existingBrand.id
      } else {
        const { data: newBrand, error: brandError } = await supabase
          .from('brands')
          .insert({ name: brand.name, slug: brand.slug })
          .select('id')
          .single()
        if (brandError) {
          console.error(`Failed to create brand ${brand.name}:`, brandError)
          result.skipped++
          continue
        }
        brandId = newBrand.id
      }

      // 5) Existing device check (status distinguishes drafts vs published).
      // Match by exact slug AND by the model core, so "Poco F9 Pro" does not
      // duplicate the existing published "Xiaomi Poco F9 Pro".
      const slugMatch = await supabase
        .from('devices')
        .select('id, slug, status, related_video_id, images')
        .eq('slug', slug)
        .limit(3)
      const slugRows = slugMatch.data ?? []

      const modelCore = name
        .replace(/\b(apple|samsung|google|oneplus|xiaomi|redmi|poco|oppo|vivo|honor|nothing|motorola|tecno|infinix|itel|nokia|huawei|realme|asus|lenovo|hp|dell|acer|msi|sony|lg)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
      let coreRows: typeof slugRows = []
      if (modelCore.length >= 6) {
        const coreMatch = await supabase
          .from('devices')
          .select('id, slug, status, related_video_id, images')
          .ilike('name', `%${modelCore}%`)
          .limit(3)
        coreRows = coreMatch.data ?? []
      }

      // Existing row set: prefer exact slug, otherwise any model-core match.
      const rowSet = [...slugRows, ...coreRows]
      const exact = slugRows.find((r) => r.slug === slug)
      const existingDevice =
        exact ??
        rowSet.find((r) => r.status === 'published') ??
        rowSet[0] ??
        null

      // 5b) This exact video already linked -> nothing to do.
      if (existingDevice && existingDevice.related_video_id === video.id) {
        result.skipped++
        continue
      }

      // 5c) NEVER touch admin-finalized (published) devices.
      if (existingDevice && existingDevice.status === 'published') {
        result.skipped++
        continue
      }

      // 6) Images: Groq web search first (finds recent-device press renders),
      //    YouTube thumbnail backported as last resort.
      let images: DeviceImageMeta[] = []
      if (curateImages) {
        const curated = await curateDeviceImages(supabase, name, {
          brand: brand.name,
          video,
        })
        if (curated.images.length) {
          result.imagesCurated++
          images = curated.images.map((i) => ({
            url: i.url,
            alt: i.alt,
            isPrimary: i.isPrimary,
          }))
        } else {
          console.warn(
            `[import] Image curation for "${name}" returned nothing (${curated.error ?? 'unknown'})`,
          )
        }
      }
      if (images.length === 0 && video.thumbnailUrl) {
        images = [{ url: video.thumbnailUrl, alt: name, isPrimary: true }]
      }

      const status: 'draft' | 'published' = publish ? 'published' : 'draft'

      // 7) Draft / enrichment payload.
      const payload: Record<string, unknown> = {
        name,
        slug,
        brand_id: brandId,
        price_tier: extraction?.category ?? inferCategory(name),
        release_year: extraction?.releaseYear ?? null,
        tagline: extraction?.tagline ?? title.slice(0, 160),
        status,
        scores_overall: 0,
        score_display: 0,
        score_performance: 0,
        score_camera: 0,
        score_battery: 0,
        score_value: 0,
        images,
        related_video_id: video.id,
        seo_description: description.slice(0, 300),
      }
      if (extraction?.priceUsd != null) payload.price_usd = extraction.priceUsd

      let deviceId: number | null = null

      if (existingDevice) {
        // Existing draft -> refresh newest review link + fill in missing AI fields.
        const updates: Record<string, unknown> = { related_video_id: video.id }
        if (extraction?.tagline) updates.tagline = extraction.tagline
        if (extraction?.category) updates.price_tier = extraction.category
        if (extraction?.releaseYear) updates.release_year = extraction.releaseYear
        if (
          images.length &&
          Array.isArray(existingDevice.images) &&
          existingDevice.images.length === 0
        ) {
          updates.images = images
        }

        const { error: updateError } = await supabase
          .from('devices')
          .update(updates)
          .eq('id', existingDevice.id)
        if (updateError) {
          console.error(`Failed to update draft ${slug}:`, updateError)
          result.skipped++
          continue
        }
        deviceId = existingDevice.id
        result.updated++
      } else {
        const { data: newDevice, error: insertError } = await supabase
          .from('devices')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) {
          console.error(`Failed to insert device ${slug}:`, insertError)
          result.skipped++
          continue
        }
        deviceId = newDevice?.id ?? null
        result.created++
      }

      // Link the review video to the device row (videos.associated_device_id).
      if (deviceId) {
        const { data: existingVideo } = await supabase
          .from('videos')
          .select('id')
          .eq('embed_id', video.id)
          .maybeSingle()
        if (existingVideo) {
          await supabase
            .from('videos')
            .update({ associated_device_id: deviceId })
            .eq('id', existingVideo.id)
        }
      }
    } catch (err) {
      console.error(`Error processing video "${title}":`, err)
      result.skipped++
    }
  }

  // Audit trail for the admin: one row per orchestrator run (never throws).
  await logAgentRun(supabase, {
    agent: 'import-orchestrator',
    runName: 'import-youtube-devices',
    status: 'ok',
    summary: { ...result, durationMs: Date.now() - startedAt, maxProcessed },
  }).catch(() => {})

  return result
}

type AgentRunRow = {
  agent: string
  runName: string
  status: 'ok' | 'error'
  summary: Record<string, unknown>
}

/**
 * Append a row to the `agent_run_log` audit table (if present). Failures are
 * swallowed on purpose: logging must never break the import pipeline.
 */
export async function logAgentRun(
  supabase: SupabaseClient,
  run: AgentRunRow,
): Promise<void> {
  const { error } = await supabase.from('agent_run_log').insert({
    agent: run.agent,
    run_name: run.runName,
    status: run.status,
    summary: run.summary,
  })
  if (error) {
    console.warn('[agent-run-log] Could not write run log:', error.message)
  }
}
