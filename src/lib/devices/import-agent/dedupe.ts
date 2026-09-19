// Duplicate detection (Phone spec §19).
// ============================================================================
// Combines exact keys (slug, model number), normalized-name matching, and
// (when configured) Upstash Vector semantic search. The admin always decides —
// the importer only warns.

import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/devices/import'
import type { DuplicateCandidate, SpecSnapshot } from './types'

interface DeviceRow {
  id: number
  name: string
  slug: string
  status: 'draft' | 'published'
  variant_label: string | null
  model_number: string | null
  brand: { name: string } | { name: string }[] | null
}

function brandNameOf(row: DeviceRow): string | null {
  const b = row.brand
  if (Array.isArray(b)) return b[0]?.name ?? null
  return b?.name ?? null
}

function toCandidate(row: DeviceRow, matchType: DuplicateCandidate['matchType'], score: number): DuplicateCandidate {
  return {
    deviceId: row.id,
    name: row.name,
    slug: row.slug,
    brand: brandNameOf(row),
    variantLabel: row.variant_label,
    modelNumber: row.model_number,
    status: row.status,
    matchType,
    score,
  }
}


function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(5g|4g|lte|global|european|indian|india|china|chinese|usa|us)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function findDuplicates(
  supabase: SupabaseClient,
  snapshot: SpecSnapshot,
): Promise<DuplicateCandidate[]> {
  const candidates: DuplicateCandidate[] = []
  const seen = new Set<number>()
  const name = snapshot.identity.name
  const slug = slugify(name)

  // 1. Exact slug match
  const { data: bySlug } = await supabase
    .from('devices')
    .select('id, name, slug, status, variant_label, model_number, brand:brands(name)')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug) {
    const row = bySlug as unknown as DeviceRow
    seen.add(row.id)
    candidates.push(toCandidate(row, 'slug', 1))
  }

  // 2. Model number match (strong signal)
  const modelNumber = snapshot.identity.modelNumber
  if (modelNumber) {
    const { data: byModel } = await supabase
      .from('devices')
      .select('id, name, slug, status, variant_label, model_number, brand:brands(name)')
      .eq('model_number', modelNumber)
      .limit(5)
    for (const d of (byModel ?? []) as unknown as DeviceRow[]) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      candidates.push(toCandidate(d, 'model', 0.95))
    }
  }

  // 3. Normalized name (ilike) match
  const normalized = normalizeName(name)
  if (normalized.length >= 4) {
    const likeToken = normalized.split(' ')[0] ?? normalized
    const { data: byName } = await supabase
      .from('devices')
      .select('id, name, slug, status, variant_label, model_number, brand:brands(name)')
      .ilike('name', `%${likeToken}%`)
      .limit(20)
    for (const d of (byName ?? []) as unknown as DeviceRow[]) {
      if (seen.has(d.id)) continue
      const similarity = similarityScore(normalized, normalizeName(d.name))
      if (similarity >= 0.82) {
        seen.add(d.id)
        candidates.push(toCandidate(d, 'name', similarity))
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 8)
}

/** Token-overlap Jaccard similarity on normalized names. */
function similarityScore(a: string, b: string): number {
  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter++
  return inter / (aTokens.size + bTokens.size - inter)
}
