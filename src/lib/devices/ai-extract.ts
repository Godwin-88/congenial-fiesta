// Agent: Device Analyzer (Groq structured extraction)
// ====================================================
// Turns a YouTube video (title + description) into a validated, typed
// device record so the legacy regex parsers can be *augmented* (not blindly
// replaced) with an LLM. Output is governed by a Zod schema: a malformed or
// hallucinated answer can never corrupt the database.
//
// Guarantees:
//  - Never throws: any failure returns null so callers fall back to the
//    keyword/regex pipeline (see src/lib/devices/import.ts).
//  - `isDeviceReview` gates whether the video is about a *specific device*;
//    only then are the other fields meaningful.
//  - Fields are strictly optional where the video doesn't say (releaseYear,
//    priceUsd, tagline). Absence = admin fills them in.

import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'

import type { YouTubeVideo } from '@/lib/youtube/client'
import { redis, isRedisConfigured } from '@/lib/upstash/redis'

// Model override keeps the chat models separate from the extraction model.
// `openai/gpt-oss-20b` is verified available on the FweezyTech Groq account
// (same gpt-oss browser-search family) and consumes the daily token budget
// more slowly than the 120b for high-volume extraction.
const EXTRACT_MODEL = process.env.GROQ_EXTRACT_MODEL ?? 'openai/gpt-oss-20b'

// --- Groq extraction circuit breaker --------------------------------------
// After N consecutive API failures the breaker opens (skips Groq for a while)
// so a Groq outage can never stall the cron or blow the runtime budget.
const CIRCUIT_KEY = 'groq:circuit:extract'
const CIRCUIT_TRIP_THRESHOLD = 3
const CIRCUIT_OPEN_TTL_S = 300

export async function isGroqCircuitOpen(): Promise<boolean> {
  if (!isRedisConfigured) return false
  try {
    return (Number((await redis.get(CIRCUIT_KEY)) ?? 0) >= CIRCUIT_TRIP_THRESHOLD)
  } catch {
    return false
  }
}

export async function recordGroqSuccess(): Promise<void> {
  if (!isRedisConfigured) return
  try {
    await redis.del(CIRCUIT_KEY)
  } catch {
    /* non-fatal */
  }
}

export async function recordGroqFailure(): Promise<void> {
  if (!isRedisConfigured) return
  try {
    const trips = Number((await redis.get(CIRCUIT_KEY)) ?? 0) + 1
    await redis.set(CIRCUIT_KEY, trips, { ex: CIRCUIT_OPEN_TTL_S })
  } catch {
    /* non-fatal */
  }
}

/** Bi-directional safe guard: call only when a key actually exists. */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

export const deviceExtractionSchema = z.object({
  isDeviceReview: z
    .boolean()
    .describe(
      'True only if the video is clearly about a specific consumer electronics device ' +
        '(phone, tablet, laptop, smartwatch, headphones, etc.) — review, unboxing, ' +
        'hands-on, comparison, or specs walkthrough. False for Q&A, vlogs, news ' +
        'roundups about multiple products, giveaways, or non-product videos.',
    ),
  brand: z
    .string()
    .nullable()
    .describe('The canonical brand name (e.g. "Xiaomi", "Samsung", "OnePlus"). Null if unclear.'),
  deviceName: z
    .string()
    .nullable()
    .describe(
      'The exact device model name shown on the device, e.g. "Xiaomi Poco F9 Pro". ' +
        'Include the brand prefix when the video gives it. Null if the video is not about one device.',
    ),
  category: z
    .enum(['flagship', 'mid-range', 'budget', 'ultra-premium'])
    .nullable()
    .describe('Market tier of the device. Use your best estimate; null if unknown.'),
  releaseYear: z
    .number()
    .int()
    .min(2000)
    .max(2100)
    .nullable()
    .describe('Model release year if mentioned or clearly implied; otherwise null.'),
  tagline: z
    .string()
    .nullable()
    .describe(
      'A short, neutral 1-sentence description of the device drawn ONLY from the video ' +
        '(e.g. "Flagship-grade performance in a mid-range Poco body."). Null if the video lacks detail.',
    ),
  priceUsd: z
    .number()
    .nullable()
    .describe('Price mentioned in the video in USD, if numeric. Null otherwise.'),
})

export type DeviceExtraction = z.infer<typeof deviceExtractionSchema>

export const EMPTY_EXTRACTION: DeviceExtraction = {
  isDeviceReview: false,
  brand: null,
  deviceName: null,
  category: null,
  releaseYear: null,
  tagline: null,
  priceUsd: null,
}

/**
 * Extract a structured device record from a video. Returns null on any error
 * (missing key, model failure, schema failure, network) so the caller can
 * degrade to the regex fallback.
 */
export async function extractDeviceFromVideo(
  video: YouTubeVideo,
): Promise<DeviceExtraction | null> {
  if (!isGroqConfigured()) return null
  if (await isGroqCircuitOpen()) {
    console.warn('[ai-extract] Groq circuit breaker OPEN — skipping extraction, falling back to regex.')
    return null
  }

  const title = video.title || ''
  const description = (video.description || '').slice(0, 4000)

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })

  // Retry once: gpt-oss-* occasionally echoes the JSON schema back instead of
  // a valid answer (a provider-side flake). A single retry fixes most of those.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { object } = await generateObject({
        model: groq(EXTRACT_MODEL),
        schema: deviceExtractionSchema,
        temperature: 0.1,
        system:
          'You are the Device Analyzer agent for FweezyTech, a tech-review site. ' +
          'You read a YouTube video title + description and decide whether it is about a ' +
          'specific consumer device, then extract structured facts about that device. ' +
          'Be conservative: if the video is not clearly about ONE specific device set ' +
          'isDeviceReview=false and leave the rest null. Never invent specs.',
        prompt: [
          'Analyze this YouTube video:',
          '',
          `Title: ${title}`,
          `Description:\n${description || '(none)'}`,
          '',
          'Answer the schema. Only set fields you are confident about.',
        ].join('\n'),
      })

      const result: DeviceExtraction = object ?? { ...EMPTY_EXTRACTION }
      // Guard against releaseYear hallucination: keep the year only when it is
      // actually mentioned in the title or description the model was given.
      if (
        result.releaseYear != null &&
        !`${title} ${description}`.includes(String(result.releaseYear))
      ) {
        result.releaseYear = null
      }
      await recordGroqSuccess()
      return result
    } catch (err) {
      if (attempt === 0) {
        console.warn('[ai-extract] Extraction attempt failed, retrying once:', (err as Error).message)
      } else {
        console.warn('[ai-extract] Extraction failed, falling back to regex:', (err as Error).message)
        await recordGroqFailure()
        return null
      }
    }
  }
  return null
}