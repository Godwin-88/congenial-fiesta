import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import {
  fetchSnapshots,
  previewImport,
  YOUTUBE_SOURCE_SLUG,
  type SourceMatch,
  type SpecSnapshot,
} from '@/lib/devices/import-agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isSourceMatch(value: unknown): value is SourceMatch {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.externalId === 'string' && typeof v.sourceSlug === 'string' && typeof v.name === 'string'
}

/** Validate an untrusted YouTube snapshot echoed back from the client. */
function isYouTubeSnapshot(value: unknown): value is SpecSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const match = v.match as Record<string, unknown> | undefined
  const identity = v.identity as Record<string, unknown> | undefined
  return (
    !!match &&
    match.sourceSlug === YOUTUBE_SOURCE_SLUG &&
    typeof match.externalId === 'string' &&
    typeof match.name === 'string' &&
    !!identity &&
    typeof identity.name === 'string' &&
    identity.name.trim().length > 0 &&
    (v.specs === undefined || (typeof v.specs === 'object' && v.specs !== null)) &&
    (v.providedPaths === undefined || Array.isArray(v.providedPaths))
  )
}

/**
 * POST /api/admin/devices/import/specs
 *
 * Step 2 of the import agent: fetch the selected matches, normalize them into
 * canonical spec sections, then merge with conflict detection (§15, §40),
 * duplicate detection (§19) and missing-field reporting (§14).
 *
 * Pure preview — no database writes. The returned `preview` object is echoed
 * back to /import/apply once the admin has resolved conflicts.
 *
 * A YouTube-sourced device can be merged directly: pass the candidate's
 * snapshot as `youtubeSnapshot`. It is inserted as an additional SpecSnapshot
 * (lowest priority — authoritative sources win) so the preview shows the
 * true multi-source merger: YouTube name + title/description specs blended
 * with MobileAPI.dev / GSMArena / manufacturer results.
 *
 * Body: {
 *   selections: SourceMatch[],           // one match per source (or one total)
 *   manufacturerText?: string,           // optional pasted spec sheet (§10d)
 *   manufacturerUrl?: string,
 *   existingDeviceId?: number | null     // when updating an existing device
 *   youtubeSnapshot?: SpecSnapshot | null // YouTube candidate snapshot to merge
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Your role does not allow importing specs.' }, { status: 403 })
    }

    let body: {
      selections?: unknown
      manufacturerText?: string
      manufacturerUrl?: string
      /** Device name the admin typed (labels a paste-only import). */
      manufacturerLabel?: string
      query?: string
      existingDeviceId?: number | null
      /** YouTube candidate snapshot to merge with the adapter sources. */
      youtubeSnapshot?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const selections = Array.isArray(body.selections) ? body.selections.filter(isSourceMatch) : []
    const manufacturerText = (body.manufacturerText ?? '').trim() || null
    const youtubeSnapshot = isYouTubeSnapshot(body.youtubeSnapshot) ? body.youtubeSnapshot : null
    if (selections.length === 0 && !manufacturerText && !youtubeSnapshot) {
      return NextResponse.json({ error: 'Select at least one source match, paste manufacturer specs, or include the YouTube device.' }, { status: 400 })
    }
    if (manufacturerText && manufacturerText.length > 20000) {
      return NextResponse.json({ error: 'Pasted specifications are too long (max 20000 characters).' }, { status: 400 })
    }

    const supabase = await getAdminClient()

    // 1. Fetch + normalize each selected source (adapters are replaceable).
    const { snapshots, errors, extractionDiagnostics } = await fetchSnapshots({
      selections,
      manufacturerText,
      manufacturerLabel: (body.manufacturerLabel ?? body.query ?? '').trim() || null,
      manufacturerUrl: body.manufacturerUrl ?? null,
    })

    // Merge order: authoritative adapter sources first, then the YouTube
    // review (lowest priority — it supplies the name and only what the
    // video actually stated; spec-sheet sources win factual conflicts).
    const allSnapshots = youtubeSnapshot ? [...snapshots, youtubeSnapshot] : snapshots

    if (allSnapshots.length === 0) {
      return NextResponse.json(
        { error: 'No specifications could be retrieved from the selected sources.', errors },
        { status: 502 },
      )
    }

    // 2. Merge + conflict + duplicate + missing-field preview.
    const preview = await previewImport(supabase, {
      snapshots: allSnapshots,
      existingDeviceId: body.existingDeviceId ?? null,
      manufacturerText,
    })

    if (!preview) {
      return NextResponse.json({ error: 'Nothing to preview.' }, { status: 422 })
    }

    return NextResponse.json({
      preview,
      errors,
      extractionDiagnostics,
      message:
        preview.conflicts.length > 0
          ? `${preview.conflicts.length} field conflict(s) need your decision before applying.`
          : preview.merged && Object.keys(preview.merged).length === 0 && extractionDiagnostics?.message
            ? extractionDiagnostics.message
            : 'Specifications ready to review.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}