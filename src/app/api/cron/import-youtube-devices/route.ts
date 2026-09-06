import { NextResponse, NextRequest } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createServerClient } from '@supabase/ssr'
import { fetchYouTubeVideos, fetchAllYouTubeVideos } from '@/lib/youtube/client'
import { importDevicesFromYouTube } from '@/lib/devices/import'

function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

// Agent pipeline needs time for Groq extraction + image curation.
export const maxDuration = 120

const cronHandler = verifySignatureAppRouter(async (req: NextRequest) => {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return NextResponse.json({ error: 'Missing signing key' }, { status: 500 })
  }

  const supabase = getAdminClient()

  // Admin-triggered runs push a JSON body ({ source, fetchAll }); scheduled
  // daily runs send none. Guard so a missing/empty body never throws.
  let body: { source?: string; fetchAll?: boolean } = {}
  try {
    if (req) body = (await req.json()) as { source?: string; fetchAll?: boolean }
  } catch {
    body = {}
  }
  const fetchAll = body.fetchAll === true

  // Fetch YouTube videos. Admin "all videos" runs scan the whole channel;
  // everything else uses the fast latest-50 merge.
  let videos: Awaited<ReturnType<typeof fetchYouTubeVideos>> = []
  try {
    videos = fetchAll
      ? await fetchAllYouTubeVideos()
      : await fetchYouTubeVideos(50)
  } catch (err) {
    console.error('Failed to fetch YouTube videos:', err)
    return NextResponse.json({ status: 'error', error: 'YouTube fetch failed' }, { status: 500 })
  }

  // Agent pipeline: Groq Device Analyzer (extraction) + Image Curator (Groq
  // web search finds the best official press renders). Devices are created as
  // DRAFTS for admin review — never auto-published.
  const result = await importDevicesFromYouTube(supabase, videos, {
    aiExtract: true,
    curateImages: true,
  })

  return NextResponse.json({
    status: 'ok',
    source: body.source ?? 'scheduled',
    scope: fetchAll ? 'all' : 'latest-50',
    ...result,
  })
})

export const GET = cronHandler
export const POST = cronHandler
