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
import { z } from 'zod'
import { isGroqCircuitOpen, recordGroqFailure, recordGroqSuccess } from '@/lib/devices/ai-extract'
import type { SourceMatch } from './types'
import {
  textSpecsSchema,
  TEXT_SPECS_FIELD_DICTIONARY,
  type TextSpecsExtraction,
} from './text-specs'
import { generateObject } from 'ai'

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
//
// TRANSPORT REALITY: generateObject sends the schema as a strict
// `response_format: json_schema` (strictJsonSchema defaults to true in
// @ai-sdk/groq). The deployed endpoint rejects structured output for
// gpt-oss-family models — even a trivial one-property schema fails — so this
// path uses generateText with a JSON contract in the prompt, then parses the
// result. Zod validation is the hard gate: an unparsable or invalid reply is
// reported, never stored (Phone spec §14).

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
 * Ask the model for the canonical JSON with plain text output, then parse it.
 * Strips markdown code fences before JSON.parse. Throws when the reply is not
 * usable JSON so the caller can retry once.
 */
async function generateTextWithSchemaFallback(
  groq: ReturnType<typeof createGroq>,
  text: string,
): Promise<{ object: unknown }> {
  const { generateText } = await import('ai')
  const { text: raw } = await generateText({
    model: groq(MATCH_MODEL),
    temperature: 0,
    // gpt-oss models are reasoning models: the final answer must be requested
    // explicitly, otherwise the response may be reasoning trace or empty.
    // maxOutputTokens (not maxTokens) is the AI SDK v6 name. The free tier
    // buckets prompt + max_tokens against 8k TPM (a 6000 cap produced
    // "Requested 8374" 400s); 4500 keeps prompt (~2.4k) + output under it.
    maxOutputTokens: 4500,
    system:
      'You extract device specifications from manufacturer spec sheets for a phone database. ' +
      'STRICT RULE: copy values ONLY from the provided text. If a field is not stated in the ' +
      'text, set it to null — NEVER infer, estimate or use knowledge of similar devices. ' +
      'Do not merge unrelated values. ' +
      'Use EXACTLY the keys listed in the field dictionary below — any other key name is discarded. ' +
      'Every key must be present in your response; use null for anything the text does not state. ' +
      'String values may keep their units ("161.42 mm"); a normalizer parses them later. ' +
      'Your FINAL response must be ONLY the JSON object, no markdown fences, no commentary. ' +
      'Ignore navigation menus, footers, legal notes and marketing boilerplate.\n\n' +
      'FIELD DICTIONARY:\n' +
      TEXT_SPECS_FIELD_DICTIONARY,
    // 6k chars keeps prompt + dictionary + JSON output inside the 8k TPM
    // free-tier budget. Core specs (design/display/processor/memory/battery)
    // come first in manufacturer sheets, so truncation costs tail sections only.
    prompt:
      'Extract the specs from the following sheet as one JSON object with keys: ' +
      'name, brand, model_number, release_year, tagline, specs_design, specs_display, ' +
      'specs_processor, specs_memory, specs_camera, specs_battery, specs_connectivity, ' +
      'specs_network, specs_software. Your FINAL answer is that JSON object and nothing else.\n\n' +
      text,
  })
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  try {
    return { object: JSON.parse(cleaned) as unknown }
  } catch {
    throw new Error(`model reply was not usable JSON (first 200 chars): ${cleaned.slice(0, 200)}`)
  }
}

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

  // Retry once: gpt-oss-* occasionally returns an empty reasoning trace or a
  // provider-side validation flake (mirrors the ai-extract.ts pattern).
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // The free tier allows 8k tokens per request. The field dictionary is now
      // short, but a full OnePlus paste is ~6.7k chars (~1.7k tokens) — keep the
      // sheet slice conservative so prompt + dictionary + output stay in budget.
      const { object } = await generateTextWithSchemaFallback(groq, text.slice(0, 6000))
      await recordGroqSuccess()

      // Second gate: the provider guarantees the shape, zod guarantees the
      // semantics. A mismatch is reported rather than silently stored.
      const parsed = textSpecsSchema.safeParse(object)
      if (!parsed.success) {
        const message = `model output failed validation: ${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`
        console.warn('[brain] text extraction validation failed:', message)
        if (attempt === 0) continue
        return { failure: { reason: 'llm_error', message } }
      }
      return { extraction: parsed.data }
    } catch (err) {
      const message = (err as Error).message
      console.warn('[brain] text extraction failed:', message)
      // A TPM rejection will fail identically on retry (same request size in
      // the same minute bucket) — bail out instead of burning the retry.
      if (message.includes('tokens per minute')) {
        return { failure: { reason: 'llm_error', message } }
      }
      if (attempt === 0) continue
      await recordGroqFailure()
      return { failure: { reason: 'llm_error', message } }
    }
  }
  await recordGroqFailure()
  return { failure: { reason: 'llm_error', message: 'extraction failed after retry' } }
}
