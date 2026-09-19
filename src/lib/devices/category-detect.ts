// Major-category detection — taxonomy-driven, nothing hardcoded.
// ============================================================================
// The valid major categories and their vocabulary come from the `device_types`
// lookup table (migration 019, admin-manageable). This module never hardcodes a
// device word: it matches the device text against the live taxonomy labels and
// slugs, and prefers an AI hint only when the model returns one of the live
// taxonomy slugs. `devices.major_category` is nullable, so "no match" is a
// valid answer — we never guess a category the taxonomy does not know.

import type { SupabaseClient } from '@supabase/supabase-js'
import { MAJOR_CATEGORIES } from '@/types/cms'

/** One major category plus every term the taxonomy associates with it. */
export interface MajorTaxonomyEntry {
  slug: string
  /** Lowercased vocabulary: device-type slugs, labels and singular labels. */
  terms: string[]
}

/** Raw row shape from the `device_types` table (migrations 019 + 045). */
export interface DeviceTypeRow {
  slug: string
  label: string
  major_category: string
  /** Model-family / brand vocabulary (migration 045). Admin-extensible data. */
  aliases?: string[] | null
}

/**
 * Load the live taxonomy from `device_types`. Falls back to the app-level
 * MAJOR_CATEGORIES constant only when the table is unreachable or empty, so the
 * detector still behaves sensibly before migration 019 has been applied.
 */
export async function loadMajorTaxonomy(
  supabase: SupabaseClient,
): Promise<MajorTaxonomyEntry[]> {
  const { data } = await supabase
    .from('device_types')
    .select('slug, label, major_category, aliases')
  const rows = (data ?? []) as DeviceTypeRow[]

  if (rows.length === 0) {
    return MAJOR_CATEGORIES.map((c) => ({
      slug: c.slug,
      terms: [c.slug.toLowerCase(), c.label.toLowerCase()],
    }))
  }

  let usable = rows

  // Aliases only exist once migration 045 has run; retry without the column so
  // the detector still works on a database that predates it.
  if (!('aliases' in usable[0])) {
    const { data: fallback } = await supabase
      .from('device_types')
      .select('slug, label, major_category')
    if (fallback && fallback.length > 0) usable = fallback as DeviceTypeRow[]
  }

  const byMajor = new Map<string, Set<string>>()
  for (const row of usable) {
    if (!row || !row.major_category) continue
    if (!byMajor.has(row.major_category)) byMajor.set(row.major_category, new Set())
    const set = byMajor.get(row.major_category)
    if (!set) continue
    if (row.slug) set.add(row.slug.toLowerCase())
    if (row.label) {
      set.add(row.label.toLowerCase())
      const singular = row.label.toLowerCase().replace(/s$/, '')
      if (singular.length > 2) set.add(singular)
    }
    // Curated aliases live in the DB (migration 045), so an admin can teach the
    // detector a new model family without a code change.
    for (const alias of row.aliases ?? []) {
      if (alias && alias.trim().length > 1) set.add(alias.trim().toLowerCase())
    }
  }

  return Array.from(byMajor.entries()).map(([slug, terms]) => ({
    slug,
    terms: Array.from(terms),
  }))
}

const BACKSLASH = String.fromCharCode(92)
const REGEX_SPECIALS = new Set<string>([
  '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']',
])

/** Escape the regex metacharacters that can occur in taxonomy terms. */
function escapeTerm(term: string): string {
  let out = ''
  for (const ch of term) out += REGEX_SPECIALS.has(ch) ? BACKSLASH + ch : ch
  return out
}

/** Whole-word matcher for one taxonomy term (avoids "tv" matching "atv"). */
function termRegex(term: string): RegExp {
  return new RegExp('(^|[^a-z0-9])' + escapeTerm(term) + '([^a-z0-9]|$)')
}

/**
 * Pick the best major category for a device.
 *
 * @param text     Device name / video title / description to classify.
 * @param taxonomy Live taxonomy (see `loadMajorTaxonomy`).
 * @param aiHint   Optional slug returned by the Groq Device Analyzer. Honoured
 *                 only when it matches one of the live taxonomy slugs.
 * @returns the winning major-category slug, or `null` when nothing matches.
 */
export function detectMajorCategory(
  text: string,
  taxonomy: MajorTaxonomyEntry[],
  aiHint?: string | null,
): string | null {
  const hint = aiHint ? aiHint.trim().toLowerCase() : ''
  if (hint) {
    const hit = taxonomy.find((t) => t.slug.toLowerCase() === hint)
    if (hit) return hit.slug
  }

  const haystack = ' ' + String(text ?? '').toLowerCase() + ' '
  if (haystack.trim().length === 0) return null

  let best: { slug: string; score: number } | null = null
  for (const entry of taxonomy) {
    let score = 0
    for (const term of entry.terms) {
      if (!term || term.length < 2) continue
      if (termRegex(term).test(haystack)) score += term.length
    }
    if (score > 0 && (!best || score > best.score)) best = { slug: entry.slug, score }
  }

  return best ? best.slug : null
}

/**
 * Convenience wrapper: load the taxonomy and classify in one call.
 * Never throws — returns null when the taxonomy cannot be loaded.
 */
export async function resolveMajorCategory(
  supabase: SupabaseClient,
  args: { text: string; aiHint?: string | null },
): Promise<string | null> {
  try {
    const taxonomy = await loadMajorTaxonomy(supabase)
    return detectMajorCategory(args.text, taxonomy, args.aiHint)
  } catch {
    return null
  }
}
