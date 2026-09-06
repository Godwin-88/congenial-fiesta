// Prefill field flatteners — turn an extraction payload into grouped UI rows.
// Kept separate from the panel so the form pages can reuse the grouping when
// showing what was applied.

export interface PrefillFieldRow {
  key: string
  label: string
  value: string
  /** Set when the value is the start of a longer text (full body / verdict). */
  truncated?: boolean
}

export interface PrefillGroup {
  id: string
  title: string
  fields: PrefillFieldRow[]
}

function toValue(v: unknown): { value: string; truncated?: boolean } {
  if (v == null) return { value: '' }
  if (typeof v === 'string' || typeof v === 'number') {
    const s = String(v)
    const truncated = s.length > 400
    return { value: truncated ? s.slice(0, 400) + '…' : s, truncated }
  }
  if (Array.isArray(v)) return { value: v.join(', ') }
  try {
    return { value: JSON.stringify(v) }
  } catch {
    return { value: String(v) }
  }
}

function pushGroup(
  groups: PrefillGroup[],
  id: string,
  title: string,
  rows: Array<[string, unknown]>,
) {
  const fields: PrefillFieldRow[] = rows
    .filter(([, v]) => v != null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
    .map(([label, v]) => {
      const { value, truncated } = toValue(v)
      return { key: `${id}.${label}`, label, value, truncated }
    })
  if (fields.length) groups.push({ id, title, fields })
}

export function flattenDeviceFields(fields: Record<string, unknown>): PrefillGroup[] {
  const groups: PrefillGroup[] = []

  pushGroup(groups, 'identity', 'Identity & Pricing', [
    ['Name', (fields.name as string) ?? ''],
    ['Brand', (fields.brandName as string) ?? ''],
    ['Release year', fields.releaseYear ?? ''],
    ['Price (KES)', fields.priceKes ?? ''],
    ['Price (USD)', fields.priceUsd ?? ''],
    ['Tier', fields.priceTier ?? ''],
    ['Category', fields.majorCategory ?? ''],
    ['Tagline', fields.tagline ?? ''],
  ])

  if (fields.scores && typeof fields.scores === 'object') {
    pushGroup(groups, 'scores', 'Scores', Object.entries(fields.scores as Record<string, unknown>))
  }

  if (fields.verdict && typeof fields.verdict === 'object') {
    const v = fields.verdict as Record<string, unknown>
    pushGroup(groups, 'verdict', 'Verdict', [
      ['Pros', v.pros as string[]],
      ['Cons', v.cons as string[]],
      ['Bottom line', v.bottomLine ?? ''],
      ['Full verdict', v.full ?? ''],
    ])
  }

  if (fields.specs && typeof fields.specs === 'object') {
    const specLabels: Record<string, string> = {
      design: 'Design',
      display: 'Display',
      processor: 'Processor',
      memory: 'Memory',
      camera: 'Camera',
      battery: 'Battery',
      connectivity: 'Connectivity',
      network: 'Network',
      software: 'Software',
    }
    Object.entries(fields.specs as Record<string, unknown>).forEach(([section, data]) => {
      if (data && typeof data === 'object') {
        pushGroup(groups, `specs.${section}`, `Specs: ${specLabels[section] ?? section}`, Object.entries(data as Record<string, unknown>))
      }
    })
  }

  if (Array.isArray(fields.buyLinks)) {
    pushGroup(
      groups,
      'buylinks',
      'Buy links',
      (fields.buyLinks as Array<{ retailer: string; url: string; price: string }>).map((l, i) => [
        `Link ${i + 1}`,
        `${l.retailer ?? ''} · ${l.url ?? ''}${l.price ? ` · ${l.price}` : ''}`,
      ]),
    )
  }

  pushGroup(groups, 'seo', 'SEO & Related', [
    ['YouTube video ID', fields.relatedVideoId ?? ''],
    ['SEO title', fields.seoTitle ?? ''],
    ['SEO description', fields.seoDescription ?? ''],
  ])

  return groups
}

export function flattenArticleFields(fields: Record<string, unknown>): PrefillGroup[] {
  const groups: PrefillGroup[] = []
  pushGroup(groups, 'identity', 'Identity', [
    ['Title', fields.title ?? ''],
    ['Excerpt', fields.excerpt ?? ''],
    ['Category', fields.category ?? ''],
    ['Tags', Array.isArray(fields.tags) ? (fields.tags as string[]) : ''],
  ])
  if (fields.bodyText) pushGroup(groups, 'body', 'Body', [['Body', fields.bodyText]])
  pushGroup(groups, 'seo', 'SEO', [
    ['SEO title', fields.seoTitle ?? ''],
    ['SEO description', fields.seoDescription ?? ''],
  ])
  return groups
}