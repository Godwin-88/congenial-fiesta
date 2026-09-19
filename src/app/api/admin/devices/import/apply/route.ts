import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { applyImport, type ImportPreview } from '@/lib/devices/import-agent'
import { resolveMajorCategory } from '@/lib/devices/category-detect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isPreview(value: unknown): value is ImportPreview {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.snapshots) &&
    v.snapshots.length > 0 &&
    typeof v.merged === 'object' &&
    v.merged !== null &&
    typeof v.identity === 'object' &&
    v.identity !== null
  )
}

/**
 * POST /api/admin/devices/import/apply
 *
 * Step 3 of the import agent: write the reviewed result. Rules enforced here
 * and in the agent (§13, §16, §24, §25):
 *  - New devices are ALWAYS created as drafts — never auto-published.
 *  - The admin's conflict resolutions win (admin has final authority).
 *  - Field-level provenance + raw payloads are stored for traceability.
 *  - Manual overrides are never silently overwritten.
 *
 * Body: {
 *   preview: ImportPreview,              // echoed from /import/specs
 *   resolutions?: Record<string, unknown>, // path → chosen value
 *   existingDeviceId?: number | null,
 *   parentDeviceId?: number | null,      // import as variant (§20)
 *   variantLabel?: string | null,
 *   relatedVideoId?: string | null      // YouTube review linked to the draft
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Your role does not allow importing specs.' }, { status: 403 })
    }

    let body: {
      preview?: unknown
      resolutions?: Record<string, unknown>
      existingDeviceId?: number | null
      parentDeviceId?: number | null
      variantLabel?: string | null
      majorCategory?: string | null
      /** Price tier from the review pipeline (validated against the enum). */
      priceTier?: string | null
      /** YouTube review video id to link on the draft (related_video_id). */
      relatedVideoId?: string | null
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!isPreview(body.preview)) {
      return NextResponse.json(
        { error: 'Missing import preview. Run the fetch step again before applying.' },
        { status: 400 },
      )
    }

    const supabase = await getAdminClient()

    // Major category resolved from the live `device_types` taxonomy — never
    // hardcoded and never guessed (null when the taxonomy has no match). An
    // explicit admin choice in the request body always wins.
    const majorCategory =
      body.majorCategory ??
      (await resolveMajorCategory(supabase, {
        text: [
          body.preview.identity.name,
          body.preview.identity.brand ?? '',
          body.preview.identity.tagline ?? '',
        ].join(' '),
      }))

    // The review video behind a YouTube merge: linked on the draft so the
    // device page can surface the review (related_video_id). Validated as a
    // YouTube id, never trusted blindly from the client.
    const relatedVideoId =
      body.relatedVideoId && /^[a-zA-Z0-9_-]{6,}$/.test(body.relatedVideoId.trim())
        ? body.relatedVideoId.trim()
        : null

    const result = await applyImport({
      supabase,
      preview: body.preview,
      resolutions: body.resolutions ?? {},
      existingDeviceId: body.existingDeviceId ?? null,
      parentDeviceId: body.parentDeviceId ?? null,
      variantLabel: body.variantLabel ?? null,
      majorCategory,
      priceTier: body.priceTier ?? null,
      relatedVideoId,
      changedBy: adminUser.display_name ?? adminUser.id,
    })

    return NextResponse.json({
      ...result,
      message: result.created
        ? 'Draft device created with full provenance. Review and publish when verified.'
        : 'Specifications applied. Review and publish when verified.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}