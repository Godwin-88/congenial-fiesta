import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createServerClient } from '@supabase/ssr'
import { fetchYouTubeVideos } from '@/lib/youtube/client'
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

export const GET = verifySignatureAppRouter(async () => {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return NextResponse.json({ error: 'Missing signing key' }, { status: 500 })
  }

  const supabase = getAdminClient()

  // Fetch latest YouTube videos (RSS + API fallback)
  let videos: Awaited<ReturnType<typeof fetchYouTubeVideos>> = []
  try {
    videos = await fetchYouTubeVideos(50)
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

  return NextResponse.json({ status: 'ok', ...result })
})