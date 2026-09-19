// Strict JSON Schema derivation for LLM structured output.
// ============================================================================
// Vendors that implement strict structured outputs (Groq, OpenAI) reject a
// schema unless EVERY object declares `additionalProperties: false` and lists
// EVERY key of `properties` in `required`.
//
// The AI SDK's automatic zod conversion does not do this: a field declared
// `.optional()` becomes a property that is absent from `required`, and the
// request fails with
//
//   invalid JSON schema for response_format:
//   /properties/specs_design/anyOf/0/required: `required` is required to be
//   supplied and to be an array including every key in properties ...
//
// This module rewrites a zod-derived JSON Schema into that strict form, so the
// wire schema (what the model may emit) and the zod schema (what we accept)
// stay derived from one definition.

import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

type JsonSchema = Record<string, unknown>

const COMPOSITION_KEYS = ['anyOf', 'oneOf', 'allOf'] as const

function isPlainObject(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Force a JSON Schema node into strict form, recursing through properties,
 * composition branches, array items and `additionalProperties` schemas.
 *
 * A property that the model genuinely cannot know is expressed as
 * `{"type": "null"}` in a branch — not by omitting the key — which is why the
 * source zod schema uses `.nullable()` rather than `.optional()`.
 */
function strictify(node: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...node }

  if (isPlainObject(out.properties)) {
    const props = out.properties as Record<string, JsonSchema>
    const next: Record<string, JsonSchema> = {}
    for (const [key, value] of Object.entries(props)) next[key] = strictify(value)
    out.properties = next
    // Strict mode: every declared property is required and no extra keys allowed.
    out.required = Object.keys(next)
    out.additionalProperties = false
  }

  for (const key of COMPOSITION_KEYS) {
    const branch = out[key]
    if (Array.isArray(branch)) {
      out[key] = branch.map((entry) => (isPlainObject(entry) ? strictify(entry) : entry))
    }
  }

  if (isPlainObject(out.items)) {
    out.items = strictify(out.items)
  }

  // `z.record(...)` puts a schema here rather than a boolean.
  if (isPlainObject(out.additionalProperties)) {
    out.additionalProperties = strictify(out.additionalProperties)
  }

  return out
}

/**
 * Derive a strict-mode-compliant JSON Schema from a zod schema.
 * `$refStrategy: 'none'` inlines every definition — vendors that require strict
 * schemas generally do not resolve `$ref`.
 */
export function toStrictJsonSchema(schema: ZodType): JsonSchema {
  const json = zodToJsonSchema(schema, { $refStrategy: 'none' }) as JsonSchema
  delete json.$schema
  return strictify(json)
}

/**
 * Assert a schema is strict-compliant. Used by the verification script so a
 * regression here fails loudly instead of surfacing as a runtime 400 from the
 * provider.
 */
export function findStrictnessViolations(
  node: unknown,
  path = '',
): string[] {
  if (!isPlainObject(node)) return []
  const problems: string[] = []

  if (isPlainObject(node.properties)) {
    const keys = Object.keys(node.properties as JsonSchema).sort()
    const required = Array.isArray(node.required) ? [...(node.required as string[])].sort() : []
    const missing = keys.filter((k) => !required.includes(k))
    if (missing.length > 0) {
      problems.push(`${path || '/'}: properties missing from required → ${missing.join(', ')}`)
    }
    if (node.additionalProperties !== false) {
      problems.push(`${path || '/'}: additionalProperties is not false`)
    }
  }

  for (const key of COMPOSITION_KEYS) {
    const branch = node[key]
    if (Array.isArray(branch)) {
      branch.forEach((entry, i) => {
        problems.push(...findStrictnessViolations(entry, `${path}/${key}/${i}`))
      })
    }
  }
  if (isPlainObject(node.items)) {
    problems.push(...findStrictnessViolations(node.items, `${path}/items`))
  }
  if (isPlainObject(node.additionalProperties)) {
    problems.push(...findStrictnessViolations(node.additionalProperties, `${path}/additionalProperties`))
  }
  if (isPlainObject(node.properties)) {
    for (const [key, value] of Object.entries(node.properties as JsonSchema)) {
      problems.push(...findStrictnessViolations(value, `${path}/properties/${key}`))
    }
  }

  return problems
}