// Source adapter: Manufacturer (official spec sheet paste / product URL).
// ============================================================================
// Spec §10d: manufacturer information gets the highest authority for specs the
// manufacturer explicitly documents. There is no universal manufacturer API,
// so this adapter accepts either a product-page URL (raw text is fetched) or
// pasted spec-sheet text from the admin. Unstructured text is turned into the
// canonical schema by the agent brain (zod-gated, "never invent") and then
// validated by the same schema gate as every other source.

import type { SourceAdapter, SourceMatch, SpecSnapshot } from '../types'
import * as norm from '@/lib/devices/spec-normalize'

export async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20000)
  } catch {
    return null
  }
}

/** Encode pasted text into an adapter match (search() always returns empty —
 *  there is nothing to search on a paste source). */
export function pasteMatch(text: string, label = 'Pasted spec sheet'): SourceMatch {
  return {
    externalId: `paste:${Buffer.from(text).toString('base64url').slice(0, 200000)}`,
    name: label,
    brand: null,
    releaseYear: null,
    url: null,
    thumbnail: null,
    sourceSlug: 'manufacturer',
    sourceLabel: 'Manufacturer (official specs)',
  }
}

export function decodePaste(externalId: string): string | null {
  if (!externalId.startsWith('paste:')) return null
  try {
    return Buffer.from(externalId.slice(6), 'base64url').toString('utf-8')
  } catch {
    return null
  }
}

export function createManufacturerAdapter(): SourceAdapter {
  return {
    slug: 'manufacturer',
    label: 'Manufacturer (official specs)',
    isConfigured: () => true,

    async search(): Promise<SourceMatch[]> {
      return []
    },

    async fetchSpecs(match: SourceMatch): Promise<SpecSnapshot | null> {
      let text = decodePaste(match.externalId)
      if (!text && match.url) text = await fetchPageText(match.url)
      if (!text || text.length < 20) return null
      return {
        match,
        specs: {}, // filled by the brain during preview (needs LLM extraction)
        identity: {
          name: match.name,
          brand: match.brand ?? null,
          modelNumber: null,
          releaseYear: null,
          variantLabel: null,
          region: null,
          tagline: null,
        },
        raw: { text: text.slice(0, 20000), url: match.url },
        sourceUrl: match.url ?? null,
        providedPaths: [],
      }
    },
  }
}

export { norm as manufacturerNorm }
