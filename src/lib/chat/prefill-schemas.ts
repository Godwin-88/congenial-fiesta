// Agentic Form Prefill — Zod schemas & shared types
// ==================================================
// The admin AI assistant generates *structured field payloads* matched to the
// actual admin form state (create/edit pages). Zod `strict()` schemas govern
// the output: anything the LLM invented that does not map to a real form field
// is stripped/dropped, so a hallucinated key can never reach the form.
//
// NOTE: nothing in this module touches the database. Prefill only returns
// form-staging payloads; saving/publishing stays on the admin buttons.

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Field constants (labels MUST match the admin form inputs 1:1 — see
// src/app/admin/devices/create/page.tsx & [id]/edit/page.tsx)
// ---------------------------------------------------------------------------

export const PRICE_TIERS = ['flagship', 'mid-range', 'budget', 'ultra-premium'] as const
export const MAJOR_CAT_SLUGS = ['phones', 'televisions', 'sound', 'macs'] as const
export const ARTICLE_CATEGORIES = ['review', 'comparison', 'news', 'buying-guide', 'opinion'] as const
export const CAMERA_TYPES = ['Main', 'Telephoto', 'Ultrawide', 'Macro', 'Depth'] as const

export const SPEC_FIELDS = {
  design: ['Dimensions', 'Weight', 'Front', 'Back', 'Side', 'Ports', 'Speakers', 'Colours', 'IP Rating'],
  display: ['Size', 'Type', 'Resolution', 'Refresh Rate', 'Pixel Density', 'Screen-to-body ratio', 'Peak Brightness', 'HDR', 'Color depth', 'Protection'],
  processor: ['Chipset', 'CPU', 'GPU', 'Node size', 'NPU'],
  memory: ['RAM', 'RAM type', 'Storage', 'Storage type', 'Expandable'],
  battery: ['Capacity', 'Battery type', 'Wired charging', 'Wireless charging', 'Reverse charging', 'Charging protocols'],
  connectivity: ['WiFi', 'Bluetooth', 'NFC', 'USB', 'Positioning', 'IR blaster'],
  network: ['SIM', 'Technology', '2G bands', '3G bands', '4G bands', '5G bands'],
  software: ['OS', 'UI layer', 'Major OS upgrades', 'Security patches'],
} as const

export type SpecKey = keyof typeof SPEC_FIELDS

// Build a partial object schema for one spec section; Zod's default strip()
// drops any key that is not one of the declared field labels.
function specSection(section: SpecKey) {
  const fields = SPEC_FIELDS[section] as readonly string[]
  const shape = Object.fromEntries(
    fields.map((field) => [field, z.string().describe(field)]),
  ) as Record<string, z.ZodString>
  return z.object(shape).partial()
}

export function isSpecKey(value: string): value is SpecKey {
  return value in SPEC_FIELDS
}

// ---------------------------------------------------------------------------
// Device schema — mirrors the device create/edit form state
// ---------------------------------------------------------------------------

export const devicePrefillSchema = z.object({
  name: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Exact device model name, e.g. "Apple iPhone 16 Pro Max". Include brand prefix. Null if unknown.'),
  brandName: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Canonical brand name, e.g. "Apple", "Samsung", "Xiaomi", "OnePlus". Null if unknown.'),
  releaseYear: z.number().int().min(2000).max(2100).nullable().optional(),
  priceKes: z
    .number()
    .nullable()
    .optional()
    .describe('Price in Kenyan Shillings (KES) if the source states it. Never invent a price.'),
  priceUsd: z.number().nullable().optional(),
  priceTier: z.enum(PRICE_TIERS).nullable().optional(),
  majorCategory: z.enum(MAJOR_CAT_SLUGS).nullable().optional(),
  tagline: z.string().nullable().optional(),
  scores: z
    .object({
      display: z.number().min(0).max(10).nullable().optional(),
      performance: z.number().min(0).max(10).nullable().optional(),
      camera: z.number().min(0).max(10).nullable().optional(),
      battery: z.number().min(0).max(10).nullable().optional(),
      value: z.number().min(0).max(10).nullable().optional(),
    })
    .optional(),
  verdict: z
    .object({
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
      bottomLine: z.string().nullable().optional(),
      full: z.string().nullable().optional().describe('Full review verdict as plain-text paragraphs separated by blank lines.'),
    })
    .optional(),
  specs: z
    .object({
      design: specSection('design').optional(),
      display: specSection('display').optional(),
      processor: specSection('processor').optional(),
      memory: specSection('memory').optional(),
      battery: specSection('battery').optional(),
      connectivity: specSection('connectivity').optional(),
      network: specSection('network').optional(),
      software: specSection('software').optional(),
      camera: z
        .object({
          rear: z
            .array(
              z.object({
                type: z.enum(CAMERA_TYPES),
                sensorType: z.string(),
              }),
            )
            .optional(),
          selfie: z.string().nullable().optional(),
          video: z.string().nullable().optional(),
          extras: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
  buyLinks: z
    .array(
      z.object({
        retailer: z.string().optional(),
        url: z.string().optional(),
        price: z.string().optional(),
      }),
    )
    .optional()
    .describe('Buy/affiliate links only if the source provides retailer names and/or prices.'),
  relatedVideoId: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
}).strict()

export type DevicePrefill = z.infer<typeof devicePrefillSchema>

export function sectionSetterName(section: SpecKey): string {
  return `setSpecs${section.charAt(0).toUpperCase()}${section.slice(1)}`
}
// ---------------------------------------------------------------------------
// Article schema — mirrors the article create/edit form state
// ---------------------------------------------------------------------------

export const articlePrefillSchema = z.object({
  title: z.string().min(1).nullable().optional(),
  excerpt: z.string().nullable().optional(),
  category: z.enum(ARTICLE_CATEGORIES).nullable().optional(),
  tags: z.array(z.string()).optional(),
  bodyText: z
    .string()
    .nullable()
    .optional()
    .describe('Main article body as plain text, paragraphs separated by blank lines.'),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
}).strict()

export type ArticlePrefill = z.infer<typeof articlePrefillSchema>

// ---------------------------------------------------------------------------
// Aggregated registry + types
// ---------------------------------------------------------------------------

export const prefillCollections = ['devices', 'articles'] as const
export type PrefillCollection = (typeof prefillCollections)[number]

export function schemaForCollection(collection: PrefillCollection) {
  return collection === 'devices' ? devicePrefillSchema : articlePrefillSchema
}