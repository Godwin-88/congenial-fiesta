// Agentic Form Prefill — prompt construction & LLM driver
// =======================================================
// "Prefill" means: the admin AI agent converts a pasted spec sheet / device
// description (or a natural-language request) into structured form fields,
// returned to the client so the admin can *review and apply* them. This module
// NEVER writes to the database — it only produces a validated payload.

import { createGroq } from '@ai-sdk/groq'
import { generateObject, LanguageModel } from 'ai'

import { schemaForCollection, type PrefillCollection, type DevicePrefill, type ArticlePrefill } from '@/lib/chat/prefill-schemas'

const MODEL = process.env.GROQ_PREFILL_MODEL ?? process.env.GROQ_MODEL_PRIMARY ?? 'llama-3.3-70b-versatile'

export function buildPrefillSystemPrompt(collection: PrefillCollection): string {
  const deviceRules = `
RULES — DEVICE SPEC EXTRACTION
- Extract ONLY facts explicitly present in the pasted text or the user's request.
- Keep units and numbers verbatim ("6.3 inches", "120Hz", "KSh 150,000").
- Map common synonyms to the canonical field labels (e.g. "refresh rate" → "Refresh Rate",
  "chipset/SOC/processor" → "Chipset", "RAM" → "RAM", "storage" → "Storage",
  "main camera" → "Main", "ultrawide" → "Ultrawide").
- brandName = the manufacturer (Apple, Samsung, Xiaomi, OnePlus, Google, Nothing…).
- Never invent prices, scores, availability, buy links, or verdicts if they are not present.
- If a spec value is genuinely unknown, leave it absent.
- For the releaseYear, only set it if a year appears in the source.`
  const articleRules = `
RULES — ARTICLE EXTRACTION
- Extract the title, a concise excerpt, the category, tags, and the body (plain-text paragraphs
  separated by a blank line) from the pasted source.
- Only extract facts present in the source; never invent citations or facts.`
  const rules = collection === 'devices' ? deviceRules : articleRules

  return `You are the FweezyTech CMS content-preparation agent. Your job is to turn a pasted \
specification, draft review, or natural-language request into a structured object that will prefill \
the admin ${collection} form. The admin will review every field before applying — be conservative, \
do not guess. Output JSON matching the schema exactly.

${rules}

Return ONLY valid JSON. Omit empty/unknown fields.`
}

export interface PrefillResult {
  collection: PrefillCollection
  fields: DevicePrefill | ArticlePrefill
  usage?: { inputTokens?: number; outputTokens?: number }
}

/**
 * Ask Groq to extract structured form fields from the pasted source.
 * Returns null on any failure (missing key, model error, schema rejection)
 * so callers can surface a friendly message.
 */
export async function runPrefillExtraction(
  collection: PrefillCollection,
  sourceText: string,
): Promise<PrefillResult | null> {
  if (!process.env.GROQ_API_KEY) return null

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
  const schema = schemaForCollection(collection)

  // Attempt primary model; fall back once on schema/parse errors to avoid
  // strict-mode flakiness (same recovery pattern as ai-extract).
  const attempts: LanguageModel[] = [
    groq(MODEL),
    groq(process.env.GROQ_PREFILL_FALLBACK ?? 'llama-3.1-8b-instant') as LanguageModel,
  ]

  let lastError: unknown = null
  for (const model of attempts) {
    try {
      const result = await generateObject({
        model,
        schema,
        system: buildPrefillSystemPrompt(collection),
        prompt: `Source text:\n\n${sourceText.slice(0, 6000)}`,
      })
      return {
        collection,
        fields: result.object as DevicePrefill | ArticlePrefill,
        usage: result.usage,
      }
    } catch (err) {
      lastError = err
      // continue to fallback
    }
  }
  console.error('[prefill] extraction failed:', lastError)
  return null
}