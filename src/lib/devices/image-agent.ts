// Agent: Image Curator (search + verify + rehost)
// =================================================
// Finds the highest-quality official product image(s) for a device and
// re-hosts them into the FweezyTech Supabase Storage bucket so the public
// site can serve them reliably (source hosts reject `next/image` requests).
//
// Candidate sources, in order of preference:
//   1. Groq browser search (gpt-oss-120b) - the LLM *searches the web* for the
//      best image URLs for the exact device (search, never generate). This is
//      a live search, so it finds press renders for recent 2025-2026 devices
//      that no static feed covers.
//   2. YouTube maxres thumbnail - low-priority last-resort candidate.
//
// Every candidate is: downloaded -> probed with `sharp` (dimensions/type) ->
// re-encoded to webp (primary <=1200px + 96px thumb) -> uploaded to Supabase
// Storage `device-images/ingested/{slug}/...`. A Groq *vision* model may be
// opted in via GROQ_VISION_MODEL (off by default — the current Groq account
// exposes no multimodal model).
//
// Output matches the live schema of the published Xiaomi Poco F9 Pro:
//   images: [{ url, alt, isPrimary }] with the best image marked isPrimary.

import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import sharp from 'sharp'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { YouTubeVideo } from '@/lib/youtube/client'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Browser-search model. gpt-oss-20b also supports Groq browser search and is
// much lighter on the daily token budget than the 120b (which a daily cron can
// exhaust quickly).
const SEARCH_MODEL = process.env.GROQ_SEARCH_MODEL ?? 'openai/gpt-oss-20b'
// Vision verification is OFF by default: Groq's current on_demand account does
// not expose a multimodal model (image content is rejected). Leave
// GROQ_VISION_MODEL unset to skip vision, or set it to a vision-capable model
// id (e.g. a future llama-4 scott release) to re-enable the gate.
const VISION_MODEL = process.env.GROQ_VISION_MODEL ?? ''

export const IMAGE_BUCKET = 'device-images'

export interface DeviceImageMeta {
  url: string
  alt: string
  isPrimary: boolean
  source?: string
  width?: number
  height?: number
}

export interface DeviceImageResult {
  images: DeviceImageMeta[]
  source: 'groq-search' | 'youtube' | 'none'
  error?: string
}

interface ImageCandidate {
  url: string
  source: 'groq-search' | 'youtube'
}

const IMAGE_URL_RE =
  /https?:\/\/[^\s"'<>\\]+\.(?:jpg|jpeg|webp|png|avif|gif)(?:\?[^\s"'<>\\]*)?/gi

const MAX_CANDIDATES = 8
const MIN_WIDTH = 500
const MAX_SIDE = 1200
const DOWNLOAD_TIMEOUT_MS = 15_000

/** Pull all http image URLs out of arbitrary text (incl. JSON-escaped). */
function extractImageUrls(text: string | null | undefined): string[] {
  if (!text) return []
  const unescaped = text.replace(/\\\//g, '/').replace(/\\u002F/gi, '/')
  const found = unescaped.match(IMAGE_URL_RE) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of found) {
    const clean = u.replace(/[)\]},]+$/, '')
    if (seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}

/**
 * 1) Groq browser search. The LLM searches the web for press/official images
 * of the device; its answer text (plus any provider-tool output) is scraped
 * for direct image URLs. Never throws - returns whatever URLs were found.
 */
async function searchWebCandidates(
  deviceName: string,
  brand: string | null,
): Promise<ImageCandidate[]> {
  if (!process.env.GROQ_API_KEY) return []
  try {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
    const searchTerm = `${brand ? brand + ' ' : ''}${deviceName} official press photos high resolution`
    const result = await generateText({
      model: groq(SEARCH_MODEL),
      tools: {
        browser_search: groq.tools.browserSearch({}),
      },
      toolChoice: 'required',
      temperature: 0.2,
      system:
        'You are the Image Curator agent for FweezyTech. Search the web for the ' +
        'best, highest-resolution official product images of the device you are ' +
        'asked about (official press renders, manufacturer press pages, reputable ' +
        'spec databases, Wikipedia). Prioritise: (1) images ' +
        'of the exact device model, (2) direct image file URLs with the largest ' +
        'dimensions, (3) official / manufacturer sources. After searching, list the ' +
        'best direct image URLs you found, one per line. Prefer URLs ending in ' +
        '.jpg / .jpeg / .webp / .png / .avif.',
      prompt: `Find the best quality official product images for: ${searchTerm}`,
    })

    // Collect from the model's final answer text AND any provider-tool output.
    const urls = extractImageUrls(result.text)
    for (const step of result.steps ?? []) {
      for (const tr of step.toolResults ?? []) {
        const raw = JSON.stringify(tr)
        for (const u of extractImageUrls(raw)) {
          if (!urls.includes(u)) urls.push(u)
        }
      }
    }
    // Normalize protocol-relative // urls the search may return.
    const seen = new Set<string>()
    return urls
      .map((u) => (u.startsWith('//') ? `https:${u}` : u))
      .filter((u) => {
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
      .slice(0, MAX_CANDIDATES)
      .map<ImageCandidate>((url) => ({ url, source: 'groq-search' }))
  } catch (err) {
    console.warn('[image-agent] Groq web search failed:', (err as Error).message)
    return []
  }
}

/** Zod schema for the vision-model verdict on a candidate image. */
const imageVerdictSchema = z.object({
  isThisDevice: z
    .boolean()
    .describe('True if the image clearly shows the exact device model named in the prompt.'),
  qualityOk: z
    .boolean()
    .describe('True if the image is sharp, well-lit, high resolution, not low-res or heavily compressed.'),
  isLogoOnly: z
    .boolean()
    .describe('True if the image is only a brand logo / text / box-art with no device.'),
  isScreenshot: z
    .boolean()
    .describe('True if the image is a UI screenshot, spec sheet, or benchmark capture.'),
  suggestedAlt: z.string().describe('A short, natural alt-text for this image, e.g. "Xiaomi Poco F9 Pro in black".'),
})

type ImageVerdict = z.infer<typeof imageVerdictSchema>

/**
 * Vision verification. Feeds downloaded image bytes to a Groq multimodal
 * model and asks it to confirm the image actually shows the device and is a
 * quality, re-hostable photo (not a logo, screenshot, or low-res junk).
 * Returns null if Groq vision is unavailable; throws on API failure.
 */
async function verifyWithVision(
  deviceName: string,
  buffer: Buffer,
): Promise<ImageVerdict | null> {
  // Vision is opt-in: only run when a vision-capable model id is configured.
  if (!process.env.GROQ_API_KEY || !process.env.GROQ_VISION_MODEL) return null
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  const { object } = await generateObject({
    model: groq(VISION_MODEL),
    schema: imageVerdictSchema,
    temperature: 0.1,
    system:
      'You are the Image Curator vision-checker for FweezyTech. You are shown an image ' +
      'that MAY be an official product photo of a specific device. Determine whether it ' +
      'actually shows that device, is a good-quality photo of it, and is not a logo, ' +
      'screenshot, or text graphic.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Is this a high-quality photo of the ${deviceName}?` },
          { type: 'image', image: buffer },
        ],
      },
    ],
  })
  return object
}

/** Downscale + re-encode to webp. Returns page image and 96px thumb. */
async function processImage(
  buffer: Buffer,
): Promise<{ primary: Buffer; thumbnail: Buffer; width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).rotate().metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    if (width < MIN_WIDTH && height < MIN_WIDTH) return null // too small

    const primary = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const thumbnail = await sharp(buffer)
      .rotate()
      .resize(96, 96, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer()

    return { primary, thumbnail, width, height }
  } catch {
    return null
  }
}

/** Upload bytes to Supabase Storage `device-images/ingested/{slug}/...`. */
async function uploadVariant(
  supabase: SupabaseClient,
  slug: string,
  kind: 'primary' | 'thumb',
  buf: Buffer,
): Promise<string | null> {
  const path = `ingested/${slug}/${kind}.webp`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, buf, { contentType: 'image/webp', upsert: true })
  if (error) {
    console.warn(`[image-agent] upload failed ${path}: ${error.message}`)
    return null
  }
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/**
 * Orchestrator: pick the best official product photo(s) for a device, verify
 * them (vision), re-host to storages, and return FweezyTech URLs. Never throws
 * - returns { source: 'none', images: [] } on total failure (callers just
 * leave `images: []` for the admin).
 */
export async function curateDeviceImages(
  supabase: SupabaseClient,
  deviceName: string,
  opts: {
    brand?: string | null
    video?: YouTubeVideo | null
    slug?: string
    verify?: boolean
  } = {},
): Promise<DeviceImageResult> {
  const { brand = null, video = null, slug, verify = true } = opts
  const safeSlug = slug || deviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  if (!deviceName || deviceName.trim().length < 3) {
    return { images: [], source: 'none', error: 'No device name to search for.' }
  }

  // Collect candidates from all sources in order of preference (Groq search first).
  const [webC, ytC] = await Promise.all([
    searchWebCandidates(deviceName, brand),
    Promise.resolve(youtubeThumbnails(video)),
  ])
  const all = [...webC, ...ytC]
    .filter((c) => c && /^https?:\/\//.test(c.url))
    .reduce<ImageCandidate[]>((acc, c) => {
      if (!acc.some((x) => x.url === c.url)) acc.push(c)
      return acc
    }, [])
    .slice(0, MAX_CANDIDATES)

  if (all.length === 0) {
    return { images: [], source: 'none', error: 'No image sources available.' }
  }

  const chosenSource = all[0].source

  // Download up to 3 candidates.
  const downloaded: Array<{ candidate: ImageCandidate; buffer: Buffer }> = []
  for (const candidate of all) {
    const buffer = await downloadImage(candidate.url)
    if (buffer) downloaded.push({ candidate, buffer })
    if (downloaded.length >= 3) break
  }
  if (downloaded.length === 0) {
    return { images: [], source: 'none', error: 'Could not download any candidate image.' }
  }

  // Verify + process until one good primary + thumb.
  const visionEnabled = Boolean(verify && process.env.GROQ_API_KEY && process.env.GROQ_VISION_MODEL)
  let verified: { candidate: ImageCandidate; buffer: Buffer; alt: string } | null = null
  let fallback: { candidate: ImageCandidate; buffer: Buffer; alt: string } | null = null

  for (const { candidate, buffer } of downloaded) {
    if (!visionEnabled) {
      // No vision model configured — use the first sharp-probed image directly.
      if (!fallback) fallback = { candidate, buffer, alt: `${deviceName} product photo` }
      break
    }
    try {
      const verdict = await verifyWithVision(deviceName, buffer)
      if (
        verdict &&
        verdict.isThisDevice &&
        verdict.qualityOk &&
        !verdict.isLogoOnly &&
        !verdict.isScreenshot
      ) {
        verified = { candidate, buffer, alt: verdict.suggestedAlt || `${deviceName} product photo` }
        break
      }
      if (!fallback) fallback = { candidate, buffer, alt: `${deviceName} product photo` }
    } catch (err) {
      console.warn('[image-agent] vision verification failed, using processed image:', (err as Error).message)
      if (!fallback) fallback = { candidate, buffer, alt: `${deviceName} product photo` }
      break // vision down -> just use sharp-probed result
    }
  }

  const chosen = verified ?? fallback
  if (!chosen) {
    return { images: [], source: 'none', error: 'No image passed verification.' }
  }

  const processed = await processImage(chosen.buffer)
  if (!processed) {
    return { images: [], source: 'none', error: 'Image failed sharp validation/processing.' }
  }

  const [primaryUrl, thumbUrl] = await Promise.all([
    uploadVariant(supabase, safeSlug, 'primary', processed.primary),
    uploadVariant(supabase, safeSlug, 'thumb', processed.thumbnail),
  ])

  const images: DeviceImageMeta[] = []
  if (primaryUrl) {
    images.push({
      url: primaryUrl,
      alt: chosen.alt,
      isPrimary: true,
      source: chosen.candidate.source,
      width: processed.width,
      height: processed.height,
    })
  }
  if (thumbUrl && primaryUrl) {
    images.push({
      url: thumbUrl,
      alt: chosen.alt,
      isPrimary: false,
      source: chosen.candidate.source,
    })
  }

  if (images.length === 0) {
    return { images: [], source: 'none', error: 'Upload to storage failed.' }
  }
  return { images, source: chosenSource }
}

/** 2) YouTube thumbnail ladder for the video, as low-priority candidates. */
function youtubeThumbnails(video: { id: string } | null): ImageCandidate[] {
  if (!video?.id || !/^[a-zA-Z0-9_-]{6,}$/.test(video.id)) return []
  return [
    { url: `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`, source: 'youtube' },
    { url: `https://img.youtube.com/vi/${video.id}/sddefault.jpg`, source: 'youtube' },
  ]
}

/** Download candidate bytes with browser-like headers. */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://fweezytech.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
    if (!res.ok) return null
    if (!res.headers.get('content-type')?.startsWith('image/')) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1024) return null
    return buffer
  } catch {
    return null
  }
}