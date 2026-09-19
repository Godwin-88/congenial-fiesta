import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { fetchYouTubeVideos } from '@/lib/youtube/client'
import { extractDeviceFromVideo } from '@/lib/devices/ai-extract'
import { analyzeYouTubeVideo, youtubeWatchUrl } from '@/lib/devices/import-agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * How many videos the AI analyser inspects per scan. Each inspected video is one
 * Groq call, so this is a cost + latency guard, not a functional limit.
 */
const DEFAULT_SCAN_LIMIT = 8
const MAX_SCAN_LIMIT = 20

/**
 * POST /api/admin/devices/import/youtube
 *
 * Step 1 of the merged YouTube pipeline: SCAN ONLY, no database writes.
 *
 * For each scanned video it returns a device candidate carrying:
 *  - the device NAME resolved from the video title (regex + Groq Device Analyzer),
 *  - the MAJOR CATEGORY resolved against the live `device_types` taxonomy,
 *  - canonical SPECS the creator actually wrote into the description (validated by
 *    the spec schema, so anything unstated stays null).
 *
 * The admin then loads a candidate into the create form, where the SAME import
 * agent (Import Specifications panel) supplements whatever the video did not
 * state. Nothing is written until the admin saves.
 *
 * Body: { fetchAll?: boolean, limit?: number, videoId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json(
        { error: 'Your role does not allow importing devices.' },
        { status: 403 },
      )
    }

    let body: { fetchAll?: boolean; limit?: number; videoId?: string } = {}
    try {
      body = (await request.json()) as { fetchAll?: boolean; limit?: number; videoId?: string }
    } catch {
      body = {}
    }

    const requested = body.limit ?? DEFAULT_SCAN_LIMIT
    const limit = Math.min(Math.max(requested, 1), MAX_SCAN_LIMIT)

    const supabase = await getAdminClient()

    // 1. Fetch the channel feed (RSS / Innertube / Data API fallbacks).
    let videos = await fetchYouTubeVideos(body.fetchAll ? 200 : limit)
    if (body.videoId) videos = videos.filter((v) => v.id === body.videoId)
    videos = videos.slice(0, limit)

    if (videos.length === 0) {
      return NextResponse.json(
        { error: 'No videos returned from the channel feed.' },
        { status: 502 },
      )
    }

    // 2. Analyse each video, keeping only real device candidates.
    const candidates: Array<Record<string, unknown>> = []
    let analysed = 0
    for (const video of videos) {
      analysed++
      const extraction = await extractDeviceFromVideo(video)
      const candidate = await analyzeYouTubeVideo(supabase, video, extraction)
      if (candidate.error || !candidate.name) continue

      candidates.push({
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt,
        url: youtubeWatchUrl(video.id),
        name: candidate.name,
        brandName: candidate.brandName,
        brandSlug: candidate.brandSlug,
        releaseYear: candidate.releaseYear,
        tagline: candidate.tagline,
        priceTier: candidate.priceTier,
        majorCategory: candidate.majorCategory,
        specs: candidate.specs,
        providedPaths: candidate.providedPaths,
      })

      if (candidates.length >= limit) break
    }

    return NextResponse.json({
      analysed,
      candidates,
      message: candidates.length
        ? 'Pick a device to load into the create form.'
        : 'No device reviews found in the scanned videos. Try a wider scope.',
    })
  } catch (e) {
    console.error('[import/youtube] scan failed:', e)
    const message = e instanceof Error ? e.message : 'Unauthorized'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
