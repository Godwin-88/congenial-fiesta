// Agentic Form Prefill — apply helper (shared by device + article forms)
// ======================================================================
// The admin AI agent returns a structured payload (DevicePrefill | ArticlePrefill).
// The form pages call `applyPrefillToForm(collection, fields, setters)` to populate
// their state. Crucially this keeps the "agent never writes to the DB" invariant:
// after applying, the admin still presses Save Draft / Publish.

import type {
  DevicePrefill,
  ArticlePrefill,
  SpecKey,
  PrefillCollection,
} from '@/lib/chat/prefill-schemas'
import type { CameraSpec, RearCameraType, SelfieCameraType } from '@/lib/camera-spec'
import { tokenToSlot, slotToken } from '@/lib/devices/camera-types'

export type DeviceSetters = {
  setName: (v: string) => void
  setSlug: (v: string) => void
  setBrandId: (v: number | null) => void
  setReleaseYear: (v: string) => void
  setPriceKes: (v: string) => void
  setPriceUsd: (v: string) => void
  setPriceTier: (v: string) => void
  setMajorCategory: (v: string) => void
  setTagline: (v: string) => void
  setScoreDisplay: (v: string) => void
  setScorePerformance: (v: string) => void
  setScoreCamera: (v: string) => void
  setScoreBattery: (v: string) => void
  setScoreValue: (v: string) => void
  setVerdictPros: (v: string[]) => void
  setVerdictCons: (v: string[]) => void
  setVerdictBottomLine: (v: string) => void
  setVerdictFull: (v: string) => void
  setSpecsDesign: (v: Record<string, string>) => void
  setSpecsDisplay: (v: Record<string, string>) => void
  setSpecsProcessor: (v: Record<string, string>) => void
  setSpecsMemory: (v: Record<string, string>) => void
  setSpecsCamera: (v: CameraSpec) => void
  setSpecsBattery: (v: Record<string, string>) => void
  setSpecsConnectivity: (v: Record<string, string>) => void
  setSpecsSoftware: (v: Record<string, string>) => void
  setSpecsNetwork: (v: Record<string, string>) => void
  setBuyLinks: (v: Array<{ retailer: string; url: string; price: string; priceDate: string }>) => void
  setRelatedVideoId: (v: string) => void
  setSeoTitle: (v: string) => void
  setSeoDescription: (v: string) => void
  // Phone Database §13/§20 — variant + provenance identity fields.
  setModelNumber: (v: string) => void
  setVariantLabel: (v: string) => void
  setRegion: (v: string) => void
  setParentDeviceId: (v: number | null) => void
  setImportStatus: (v: string) => void
  setVerifiedDate: (v: string) => void
}

export type ArticleSetters = {
  setTitle: (v: string) => void
  setSlug: (v: string) => void
  setExcerpt: (v: string) => void
  setCategory: (v: string) => void
  setTags: (v: string) => void
  setBodyJson: (v: Record<string, unknown>) => void
  setBodyHtml: (v: string) => void
  setSeoTitle: (v: string) => void
  setSeoDescription: (v: string) => void
}

/**
 * Apply a prefill payload to a device form's state setters.
 * Brand resolution + slug generation are handled by the caller (it has access
 * to the brands list and slug-manual-edit flag); this helper just maps fields.
 */
export function applyDevicePrefill(fields: DevicePrefill, s: DeviceSetters): void {
  if (fields.name) s.setName(fields.name)
  if (fields.releaseYear) s.setReleaseYear(String(fields.releaseYear))
  if (fields.priceKes) s.setPriceKes(String(fields.priceKes))
  if (fields.priceUsd) s.setPriceUsd(String(fields.priceUsd))
  if (fields.priceTier) s.setPriceTier(fields.priceTier)
  if (fields.majorCategory) s.setMajorCategory(fields.majorCategory)
  if (fields.tagline) s.setTagline(fields.tagline)

  const sc = fields.scores
  if (sc) {
    if (sc.display != null) s.setScoreDisplay(String(sc.display))
    if (sc.performance != null) s.setScorePerformance(String(sc.performance))
    if (sc.camera != null) s.setScoreCamera(String(sc.camera))
    if (sc.battery != null) s.setScoreBattery(String(sc.battery))
    if (sc.value != null) s.setScoreValue(String(sc.value))
  }

  const vd = fields.verdict
  if (vd) {
    if (vd.pros && vd.pros.length) s.setVerdictPros(vd.pros)
    if (vd.cons && vd.cons.length) s.setVerdictCons(vd.cons)
    if (vd.bottomLine) s.setVerdictBottomLine(vd.bottomLine)
    if (vd.full) s.setVerdictFull(vd.full)
  }

  const sp = fields.specs
  if (sp) {
    const specMap: Record<SpecKey, (v: Record<string, string>) => void> = {
      design: s.setSpecsDesign,
      display: s.setSpecsDisplay,
      processor: s.setSpecsProcessor,
      memory: s.setSpecsMemory,
      battery: s.setSpecsBattery,
      connectivity: s.setSpecsConnectivity,
      network: s.setSpecsNetwork,
      software: s.setSpecsSoftware,
    }
    ;(Object.keys(specMap) as SpecKey[]).forEach((key) => {
      const section = sp[key]
      if (section && Object.keys(section).length) {
        specMap[key]({ ...(section as Record<string, string>) })
      }
    })

    if (sp.camera && Object.keys(sp.camera).length) {
      const cam = sp.camera
      const merged: CameraSpec = {
        rear: (cam.rear ?? []).map((r: { type: string; sensorType: string }, i: number) => {
          // Resolve any type dialect to a canonical slot; only fall back
          // positionally (never blanket-default to 'Main').
          const slot = tokenToSlot(r.type) ?? 'main'
          return {
            id: `prefill-rear-${i}`,
            slot,
            type: slotToken(slot) as RearCameraType,
            sensorType: r.sensorType,
          }
        }),
        selfie: Array.isArray(cam.selfie)
          ? cam.selfie.map((u: { type?: string; sensorType: string }) => {
              // Dual-selfie phones: each front unit keeps its own role
              // ('Selfie' primary, 'Ultrawide' second lens), resolved to the
              // shared slot vocabulary.
              const type = (u.type ?? 'Selfie') as SelfieCameraType
              const slot = type === 'Selfie' ? 'selfie' : (tokenToSlot(type) ?? 'selfie')
              return { type, slot, sensorType: u.sensorType }
            })
          : [{ type: 'Selfie' as SelfieCameraType, slot: 'selfie' as const, sensorType: cam.selfie ?? '' }],
        video: { rear: cam.video ?? '', front: '', features: '' },
        extras: cam.extras ?? '',
      }
      s.setSpecsCamera(merged)
    }
  }

  if (fields.buyLinks && fields.buyLinks.length) {
    s.setBuyLinks(
      fields.buyLinks
        .filter((l: { url?: string }) => l?.url)
        .map((l: { retailer?: string; url?: string; price?: string }) => ({
          retailer: l.retailer ?? '',
          url: l.url ?? '',
          price: l.price ?? '',
          priceDate: '',
        })),
    )
  }
  if (fields.relatedVideoId) s.setRelatedVideoId(fields.relatedVideoId)
  if (fields.seoTitle) s.setSeoTitle(fields.seoTitle)
  if (fields.seoDescription) s.setSeoDescription(fields.seoDescription)
  // Phone Database §13/§20 — variant + provenance identity fields.
  if (fields.modelNumber) s.setModelNumber(fields.modelNumber)
  if (fields.variantLabel) s.setVariantLabel(fields.variantLabel)
  if (fields.region) s.setRegion(fields.region)
  if (fields.parentDeviceId != null) s.setParentDeviceId(fields.parentDeviceId)
  if (fields.importStatus) s.setImportStatus(fields.importStatus)
  if (fields.verifiedDate) s.setVerifiedDate(fields.verifiedDate)
}
/** Apply an article prefill payload to article form setters. */
export function applyArticlePrefill(fields: ArticlePrefill, s: ArticleSetters): void {
  if (fields.title) s.setTitle(fields.title)
  if (fields.excerpt) s.setExcerpt(fields.excerpt)
  if (fields.category) s.setCategory(fields.category)
  if (fields.tags && fields.tags.length) s.setTags(fields.tags.join(', '))
  if (fields.bodyText) {
    s.setBodyHtml(plainTextToHtml(fields.bodyText))
    s.setBodyJson(plainTextToTiptapJson(fields.bodyText))
  }
  if (fields.seoTitle) s.setSeoTitle(fields.seoTitle)
  if (fields.seoDescription) s.setSeoDescription(fields.seoDescription)
}

export function applyPrefillToForm(
  collection: PrefillCollection,
  fields: DevicePrefill | ArticlePrefill,
  setters: DeviceSetters | ArticleSetters,
): void {
  if (collection === 'devices') {
    applyDevicePrefill(fields as DevicePrefill, setters as DeviceSetters)
  } else {
    applyArticlePrefill(fields as ArticlePrefill, setters as ArticleSetters)
  }
}

/** Convert plain-text paragraphs into simple HTML `<p>` blocks (for article body). */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

/** Convert plain-text paragraphs into a minimal Tiptap doc JSON. */
export function plainTextToTiptapJson(text: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: text
      .split(/\n\s*\n/)
      .filter((p) => p.trim())
      .map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p.trim() }] })),
  }
}
export function countPrefillFields(fields: unknown): number {
  if (!fields || typeof fields !== 'object') return 0
  const o = fields as Record<string, unknown>
  let count = 0
  const top = ['name', 'brandName', 'releaseYear', 'priceKes', 'priceUsd', 'priceTier', 'majorCategory', 'tagline', 'relatedVideoId', 'seoTitle', 'seoDescription', 'modelNumber', 'variantLabel', 'region', 'importStatus', 'verifiedDate', 'title', 'excerpt', 'category']
  top.forEach((k) => {
    const v = o[k]
    if (v != null && v !== '') count += 1
  })
  if (o.scores && typeof o.scores === 'object') count += Object.keys(o.scores as object).filter((k) => (o.scores as Record<string, unknown>)[k] != null).length
  if (o.verdict && typeof o.verdict === 'object') {
    const v = o.verdict as { pros?: unknown[]; cons?: unknown[]; bottomLine?: unknown; full?: unknown }
    if (v.pros?.length) count += 1
    if (v.cons?.length) count += 1
    if (v.bottomLine) count += 1
    if (v.full) count += 1
  }
  if (o.specs && typeof o.specs === 'object') {
    const sp = o.specs as Record<string, unknown>
    ;(Object.keys(sp) as string[]).forEach((k) => {
      const v = sp[k]
      if (v && typeof v === 'object' && Object.keys(v as object).length) count += Object.keys(v as object).length
    })
  }
  if (Array.isArray(o.buyLinks)) count += o.buyLinks.length
  if (Array.isArray(o.tags)) count += o.tags.length
  if (o.bodyText && typeof o.bodyText === 'string') count += 1
  return count
}

const numberOrNull = (v?: number | null): string => (v == null || Number.isNaN(v) ? '' : String(v))