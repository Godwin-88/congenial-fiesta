import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import {
  previewImport,
  applyImport,
  collectProvidedPaths,
  youtubeWatchUrl,
  YOUTUBE_SOURCE_SLUG,
  YOUTUBE_SOURCE_LABEL,
  type SpecSnapshot,
} from '@/lib/devices/import-agent'
import { resolveMajorCategory } from '@/lib/devices/category-detect'
import { validateSpecs, type DeviceSpecs } from '@/lib/devices/spec-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALLOWED_TIERS = new Set(['flagship', 'mid-range', 'budget', 'ultra-premium'])
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{6,}$/

type BatchItem = {
  videoId?: unknown
  name?: unknown
  brandName?: unknown
  releaseYear?: unknown
  tagline?: unknown
  priceTier?: unknown
  majorCategory?: unknown
  specs?: unknown
  existingDeviceId?: unknown
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function asIntOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null
}

/** Build a validated YouTube snapshot from one client batch item. */
function buildYouTubeBatchSnapshot(item: BatchItem): SpecSnapshot | null {
  const name = asNonEmptyString(item.name)
  if (!name) return null
  const videoId = asNonEmptyString(item.videoId)
  const brandName = asNonEmptyString(item.brandName)
  const url = videoId ? youtubeWatchUrl(videoId) : null
  const { valid } = validateSpecs(
    (item.specs && typeof item.specs === 'object' ? item.specs : {}) as Record<string, Record<string, unknown>>,
  )
  const specs = (valid ?? {}) as Partial<DeviceSpecs>
  return {
    match: {
      externalId: videoId ?? name,
      name,
      brand: brandName,
      releaseYear: asIntOrNull(item.releaseYear),
      modelNumber: null,
      region: null,
      variantLabel: null,
      url,
      thumbnail: null,
      sourceSlug: YOUTUBE_SOURCE_SLUG,
      sourceLabel: YOUTUBE_SOURCE_LABEL,
    },
    identity: {
      name,
      brand: brandName,
      modelNumber: null,
      releaseYear: asIntOrNull(item.releaseYear),
      variantLabel: null,
      region: null,
      tagline: asNonEmptyString(item.tagline),
    },
    specs,
    raw: { videoId, from: 'youtube-batch' },
    sourceUrl: url,
    providedPaths: collectProvidedPaths(specs),
  }
}

export type BatchItemResult = {
  name: string
  videoId: string | null
  status: 'created' | 'updated' | 'skipped'
  deviceId: number | null
  fieldsImported: number
  conflicts: number
  reason: string | null
}


/**
 * POST /api/admin/devices/import/youtube-batch
 *
 * Batch-save scanned YouTube devices as DRAFTs (never published). Each item
 * flows through the SAME import-agent pipeline as a single apply: preview
 * (merge + conflicts + duplicates) then applyImport (draft upsert +
 * provenance + raw payload + import_runs + change history). Items WITH
 * conflicts are skipped and reported so the admin opens that device's edit
 * page and resolves them with the Import Specifications panel.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Your role does not allow importing devices.' }, { status: 403 })
    }

    let body: { items?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const items = Array.isArray(body.items) ? (body.items as BatchItem[]) : []
    if (items.length === 0) {
      return NextResponse.json({ error: 'No devices supplied.' }, { status: 400 })
    }
    if (items.length > 50) {
      return NextResponse.json({ error: 'Batch is limited to 50 devices per request.' }, { status: 400 })
    }

    const supabase = await getAdminClient()
    const changedBy = adminUser.display_name ?? adminUser.id
    const results: BatchItemResult[] = []

    for (const item of items) {
      const row = (item ?? {}) as BatchItem
      const name = asNonEmptyString(row.name) ?? '(unnamed)'
      const videoId = asNonEmptyString(row.videoId)
      if (videoId && !VIDEO_ID_RE.test(videoId)) {
        results.push({ name, videoId, status: 'skipped', deviceId: null, fieldsImported: 0, conflicts: 0, reason: 'Invalid video id.' })
        continue
      }
      const snapshot = buildYouTubeBatchSnapshot(row)
      if (!snapshot) {
        results.push({ name, videoId, status: 'skipped', deviceId: null, fieldsImported: 0, conflicts: 0, reason: 'Missing device name.' })
        continue
      }
      const existingDeviceId =
        typeof row.existingDeviceId === 'number' && Number.isInteger(row.existingDeviceId)
          ? row.existingDeviceId
          : null
      try {
        const preview = await previewImport(supabase, { snapshots: [snapshot], existingDeviceId })
        if (!preview) {
          results.push({ name, videoId, status: 'skipped', deviceId: null, fieldsImported: 0, conflicts: 0, reason: 'Nothing to preview.' })
          continue
        }
        if (preview.conflicts.length > 0 && !existingDeviceId) {
          results.push({
            name, videoId, status: 'skipped', deviceId: null,
            fieldsImported: preview.fieldsImported, conflicts: preview.conflicts.length,
            reason: 'Needs conflict review — load it individually instead.',
          })
          continue
        }
        const majorCategory = asNonEmptyString(row.majorCategory) ?? (await resolveMajorCategory(supabase, {
          text: [preview.identity.name, preview.identity.brand ?? '', preview.identity.tagline ?? ''].join(' '),
        }))
        const priceTier = asNonEmptyString(row.priceTier)
        const result = await applyImport({
          supabase,
          preview,
          resolutions: {},
          existingDeviceId,
          majorCategory,
          priceTier: priceTier && ALLOWED_TIERS.has(priceTier) ? priceTier : null,
          relatedVideoId: videoId,
          changedBy,
        })
        results.push({
          name, videoId,
          status: result.created ? 'created' : 'updated',
          deviceId: result.deviceId,
          fieldsImported: result.fieldsImported,
          conflicts: result.conflictsFlagged,
          reason: null,
        })
      } catch (err) {
        results.push({
          name, videoId, status: 'skipped', deviceId: null, fieldsImported: 0, conflicts: 0,
          reason: (err as Error).message.slice(0, 200),
        })
      }
    }

    const created = results.filter((r) => r.status === 'created').length
    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        created,
        updated: results.filter((r) => r.status === 'updated').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
      },
      message:
        created > 0
          ? `${created} draft${created === 1 ? '' : 's'} saved. Open each to enrich specs with the agent.`
          : 'No drafts saved — review the skipped reasons below.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
