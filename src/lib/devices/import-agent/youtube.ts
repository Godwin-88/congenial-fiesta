// YouTube to import-agent bridge (true multi-source merger, no transcript).
// ============================================================================
// A YouTube review supplies the device NAME (from the title / description) plus
// whatever specs the creator wrote in the description. This module turns ONE
// video into a canonical `SpecSnapshot` so the SAME import-agent pipeline that
// serves the Phone Database panel (preview, merge, conflicts, draft upsert,
// provenance, import_runs) also serves YouTube imports, for ANY major category
// (phones, televisions, sound, macs) and never just phones.
//
// No transcript is fetched. The text mined here is the title plus description.
// Anything the video does not state stays null; the admin supplements it later
// with the Import Specifications panel on the create form (spec 14: missing = null).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { YouTubeVideo } from '@/lib/youtube/client'
import type { DeviceExtraction } from '@/lib/devices/ai-extract'
import type { DeviceSpecs } from '@/lib/devices/spec-schema'
import { validateSpecs } from '@/lib/devices/spec-schema'
import { resolveMajorCategory } from '@/lib/devices/category-detect'
import {
  detectBrand,
  extractDeviceName,
  inferCategory,
  isDeviceItem,
  resolveDeviceIdentity,
} from '@/lib/devices/import'
import { extractSpecsFromText } from './brain'
import { normalizeExtraction } from './normalize-extract'
import type { SpecSnapshot } from './types'

/** Canonical source slug for review-video imports (seeded in the sources table). */
export const YOUTUBE_SOURCE_SLUG = 'youtube'
export const YOUTUBE_SOURCE_LABEL = 'YouTube review'

/** A YouTube video analysed into a device candidate for the import agent. */
export interface YouTubeDeviceCandidate {
  video: YouTubeVideo
  /** True when the video looks like a review of a single device. */
  isDevice: boolean
  name: string | null
  brandName: string | null
  brandSlug: string | null
  releaseYear: number | null
  modelNumber: string | null
  tagline: string | null
  priceTier: string | null
  /** Major category slug from the live taxonomy; null when nothing matched. */
  majorCategory: string | null
  /** Canonical spec sections the title/description actually stated. */
  specs: Partial<DeviceSpecs>
  /** Canonical field paths provided; everything else counts as missing (14). */
  providedPaths: string[]
  /** Non-null when the video could not be turned into a candidate. */
  error: string | null
}

const SPEC_SECTIONS = [
  'specs_design',
  'specs_display',
  'specs_processor',
  'specs_memory',
  'specs_camera',
  'specs_battery',
  'specs_connectivity',
  'specs_network',
  'specs_software',
] as const

function emptyCandidate(video: YouTubeVideo, error: string): YouTubeDeviceCandidate {
  return {
    video,
    isDevice: false,
    name: null,
    brandName: null,
    brandSlug: null,
    releaseYear: null,
    modelNumber: null,
    tagline: null,
    priceTier: null,
    majorCategory: null,
    specs: {},
    providedPaths: [],
    error,
  }
}

/** Collect every canonical leaf path present in a validated spec object. */
export function collectProvidedPaths(specs: Partial<DeviceSpecs>): string[] {
  const paths: string[] = []
  for (const [section, values] of Object.entries(specs)) {
    if (!values || typeof values !== 'object') continue
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (value != null) paths.push(section + '.' + key)
    }
  }
  return paths
}

/**
 * Turn one YouTube video into a device candidate.
 *
 * Deterministic where possible (regex name/brand), LLM-assisted where not
 * (Groq Device Analyzer for identity + category hint, Groq brain for the specs
 * the creator wrote into the description). Both LLM calls degrade to null, so
 * the regex path alone still yields a usable device name for the prefill.
 */
export async function analyzeYouTubeVideo(
  supabase: SupabaseClient,
  video: YouTubeVideo,
  extraction: DeviceExtraction | null,
): Promise<YouTubeDeviceCandidate> {
  const title = video.title || ''
  const description = video.description || ''
  const haystack = title + ' ' + description

  const isDevice = Boolean(extraction?.isDeviceReview) || isDeviceItem(title, description)
  if (!isDevice) {
    return emptyCandidate(video, 'Not recognised as a single-device review.')
  }

  const regexName = extractDeviceName(title)
  const regexBrand = detectBrand(haystack)
  const { name, brand } = resolveDeviceIdentity(extraction, regexName, regexBrand)

  if (!name) {
    return emptyCandidate(video, 'Could not determine a device name from this video.')
  }

  // Major category: resolved against the live device_types taxonomy. The AI
  // hint is honoured only when it matches the live taxonomy, otherwise the
  // taxonomy vocabulary is matched against the device text. Null is allowed.
  const majorCategory = await resolveMajorCategory(supabase, {
    text: name + ' ' + (brand ? brand.name : '') + ' ' + haystack,
    aiHint: extraction?.majorCategoryHint ?? null,
  })

  // Specs the creator actually wrote down (title + description). Canonical keys
  // are enforced by the extraction schema; the normalizer strips units
  // ("161.42 mm" -> 161.42) before validateSpecs gates storage.
  const specResult = await extractSpecsFromText(title + '\n\n' + description)
  const textSpecs = 'extraction' in specResult ? specResult.extraction : null
  const sections: Record<string, Record<string, unknown>> = {}
  if (textSpecs) {
    const { sections: normalized } = normalizeExtraction(textSpecs)
    for (const section of SPEC_SECTIONS) {
      const value = normalized[section]
      if (value && typeof value === 'object') {
        sections[section] = value as Record<string, unknown>
      }
    }
  }
  const { valid } = validateSpecs(sections)
  const specs = (valid ?? {}) as Partial<DeviceSpecs>

  return {
    video,
    isDevice: true,
    name,
    brandName: brand ? brand.name : null,
    brandSlug: brand ? brand.slug : null,
    releaseYear: extraction?.releaseYear ?? textSpecs?.release_year ?? null,
    modelNumber: textSpecs?.model_number ?? null,
    tagline: extraction?.tagline ?? textSpecs?.tagline ?? null,
    priceTier: extraction?.category ?? inferCategory(name),
    majorCategory,
    specs,
    providedPaths: collectProvidedPaths(specs),
    error: null,
  }
}

/** Build the watch URL for a video id (kept in one place). */
export function youtubeWatchUrl(videoId: string): string {
  return 'https://www.youtube.com/watch?v=' + videoId
}

/**
 * Convert a candidate into the SpecSnapshot the orchestrator merges.
 * Returns null when the candidate is unusable (no name / analysed as an error).
 */
export function candidateToSnapshot(candidate: YouTubeDeviceCandidate): SpecSnapshot | null {
  if (!candidate.name || candidate.error) return null
  const url = youtubeWatchUrl(candidate.video.id)
  return {
    match: {
      externalId: candidate.video.id,
      name: candidate.name,
      brand: candidate.brandName,
      releaseYear: candidate.releaseYear,
      modelNumber: candidate.modelNumber,
      region: null,
      variantLabel: null,
      url,
      thumbnail: candidate.video.thumbnailUrl,
      sourceSlug: YOUTUBE_SOURCE_SLUG,
      sourceLabel: YOUTUBE_SOURCE_LABEL,
    },
    identity: {
      name: candidate.name,
      brand: candidate.brandName,
      modelNumber: candidate.modelNumber,
      releaseYear: candidate.releaseYear,
      variantLabel: null,
      region: null,
      tagline: candidate.tagline,
    },
    specs: candidate.specs,
    raw: {
      video: candidate.video,
      extraction: {
        name: candidate.name,
        brand: candidate.brandName,
        releaseYear: candidate.releaseYear,
        tagline: candidate.tagline,
        priceTier: candidate.priceTier,
        majorCategory: candidate.majorCategory,
      },
    },
    sourceUrl: url,
    providedPaths: candidate.providedPaths,
  }
}
