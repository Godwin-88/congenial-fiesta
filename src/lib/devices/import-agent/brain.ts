// Import agent — brain (Groq structured extraction).
// ============================================================================
// The LLM is used ONLY where deterministic parsing genuinely cannot: resolving
// which source candidate matches the admin's search, and extracting canonical
// specs from unstructured text (pasted manufacturer spec sheets).
//
// Guarantees (inherited from ai-extract.ts patterns):
//  - Never throws: any failure returns null so callers degrade gracefully.
//  - Zod schemas gate every output — a hallucinated value cannot persist.
//  - "Never invent specifications" is enforced by schema + prompt: fields the
//    text doesn't state MUST be null (Phone spec §14).
//  - Circuit breaker prevents a Groq outage from stalling imports.

import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'
import { isGroqCircuitOpen, recordGroqFailure, recordGroqSuccess } from '@/lib/devices/ai-extract'
import type { SourceMatch } from './types'
import { textSpecsSchema, TEXT_SPECS_FIELD_DICTIONARY, type TextSpecsExtraction } from './text-specs'

export type { TextSpecsExtraction }

const MATCH_MODEL = process.env.GROQ_EXTRACT_MODEL ?? 'openai/gpt-oss-20b'

const matchResolutionSchema = z.object({
  bestIndex: z.number().int().min(-1).max(50),
  confidence: z.enum(['high', 'medium', 'low']),
  reason: z.string().max(200),
})

export type MatchResolution = z.infer<typeof matchResolutionSchema>

/**
 * Pick the candidate from one source that best matches the admin's query.
 * Returns null when the LLM is unavailable (caller falls back to the first
 * exact-ish match deterministically).
 */
export async function resolveBestMatch(
  query: string,
  candidates: SourceMatch[],
): Promise<MatchResolution | null> {
  if (!process.env.GROQ_API_KEY) return null
  if (await isGroqCircuitOpen()) return null
  if (candidates.length === 0) {
    return { bestIndex: -1, confidence: 'low', reason: 'no candidates' }
  }
  if (candidates.length === 1) {
    return { bestIndex: 0, confidence: 'medium', reason: 'only candidate' }
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  try {
    const { object } = await generateObject({
      model: groq(MATCH_MODEL),
      schema: matchResolutionSchema,
      temperature: 0,
      system:
        'You resolve which device-spec listing matches a search query for a phone database. ' +
        'Match on brand, model name and variant. NEVER guess: if no candidate clearly matches ' +
        'the query, set bestIndex to -1. Do not invent device names.',
      prompt: [
        'Query: ' + query,
        'Candidates:',
        ...candidates.map((c, i) => `${i}. ${c.brand ?? ''} ${c.name}`.trim() + (c.variantLabel ? ` (${c.variantLabel})` : '')),
      ].join('\n'),
    })
    await recordGroqSuccess()
    const idx = object.bestIndex
    return idx >= 0 && idx < candidates.length ? object : { ...object, bestIndex: -1 }
  } catch (err) {
    console.warn('[brain] match resolution failed:', (err as Error).message)
    await recordGroqFailure()
    return null
  }
}

// ── Free-text spec extraction (manufacturer paste / product pages) ──────────
// Schema + field dictionary live in text-specs.ts; normalization of the
// unit-bearing strings into typed canonical values happens in
// normalize-extract.ts before validateSpecs.

/**
 * Why extraction failed. Returned (instead of a bare null) so the UI can tell
 * "no key configured" apart from "the model produced nothing usable".
 */
export type ExtractionFailure =
  | { reason: 'no_key' }
  | { reason: 'circuit_open' }
  | { reason: 'too_short' }
  | { reason: 'llm_error'; message: string }

/**
 * Extract a canonical specs structure from free text. The prompt is anchored:
 * values must come from the text; absent values must be null. The orchestrator
 * normalizes units then runs zod `validateSpecs` on the result before storing,
 * so a malformed or invented value cannot reach the database.
 *
 * Returns { extraction } on success or { failure } so callers can surface the
 * reason instead of a silent "0 fields".
 */
export async function extractSpecsFromText(
  text: string,
): Promise<{ extraction: TextSpecsExtraction } | { failure: ExtractionFailure }> {
  if (!process.env.GROQ_API_KEY) return { failure: { reason: 'no_key' } }
  if (await isGroqCircuitOpen()) return { failure: { reason: 'circuit_open' } }
  if (text.length < 20) return { failure: { reason: 'too_short' } }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  try {
    const { object } = await generateObject({
      model: groq(MATCH_MODEL),
      schema: textSpecsSchema,
      temperature: 0,
      system:
        'You extract device specifications from manufacturer spec sheets for a phone database. ' +
        'STRICT RULE: copy values ONLY from the provided text. If a field is not stated in the ' +
        'text, set it to null — NEVER infer, estimate or use knowledge of similar devices. ' +
        'Do not merge unrelated values. ' +
        'Use EXACTLY the keys listed in the field dictionary below — any other key name is discarded. ' +
        'String values may keep their units ("161.42 mm"); a normalizer parses them later. ' +
        'Ignore navigation menus, footers, legal notes and marketing boilerplate.\n\n' +
        'FIELD DICTIONARY:\n' +
        TEXT_SPECS_FIELD_DICTIONARY,
      // 12k chars covers a full spec sheet (a OnePlus 15 paste is ~10k) while
      // keeping nav/footer junk out of the tail. Head junk is stripped by the caller.
      prompt: text.slice(0, 12000),
    })
    await recordGroqSuccess()
    return { extraction: object }
  } catch (err) {
    const message = (err as Error).message
    console.warn('[brain] text extraction failed:', message)
    await recordGroqFailure()
    return { failure: { reason: 'llm_error', message } }
  }
}
