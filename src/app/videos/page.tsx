import { fetchYouTubeVideos, fetchTopYouTubeVideos } from '@/lib/youtube/client'
import { fetchTikTokVideos } from '@/lib/tiktok/client'
import { fetchInstagramVideos } from '@/lib/instagram/client'
import { getCmsVideos, getFeaturedCmsVideos } from '@/lib/videos/queries'
import { VideoCard } from '@/components/videos/VideoCard'
import VideoFeed from './video-feed'

export const metadata = {
  title: 'Videos | FweezyTech',
  description: "Watch all of Fweezytech's tech reviews across YouTube, TikTok, Instagram and Facebook",
}

export default async function VideosPage() {
  const [youtubeVideos, tiktokVideos, instagramVideos, cmsVideosResult, _featuredCmsVideos] = await Promise.all([
    fetchYouTubeVideos(20).catch(() => []),
    fetchTikTokVideos(20).catch(() => []),
    fetchInstagramVideos(20).catch(() => []),
    getCmsVideos({ limit: 50 }).catch(() => ({ videos: [], totalPages: 0 })),
    getFeaturedCmsVideos().catch(() => []),
  ])

  const cmsVideos = cmsVideosResult.videos

  // Helper: auto-generate thumbnail from embed ID
  function getThumbnail(v: Record<string, unknown>): string {
    const rawThumb = String(v.thumbnail_url ?? '').trim()
    if (rawThumb && /\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]+\//.test(rawThumb)) {
      return rawThumb
    }
    const embedId = String(v.embed_id ?? v.embedId ?? '').trim()
    if (v.platform === 'youtube' && embedId) {
      let videoId = embedId
      if (videoId.startsWith('http')) {
        const youtuBeMatch = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
        if (youtuBeMatch) videoId = youtuBeMatch[1]
        const watchMatch = videoId.match(/[?&]v=([a-zA-Z0-9_-]+)/)
        if (watchMatch) videoId = watchMatch[1]
      }
      videoId = videoId.split('?')[0].split('&')[0]
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
      return ''
    }
    return ''
  }

  // Merge YouTube + CMS videos, deduplicate by embed ID
  // Deduplicate: CMS YouTube IDs should not appear twice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmsYoutubeIds = new Set(
    cmsVideos
      .filter((v: any) => v.platform === 'youtube' && (v.embed_id ?? v.embedId))
      .map((v: any) => {
        const id = String(v.embed_id ?? v.embedId ?? '').trim()
        const m = id.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || id.match(/[?&]v=([a-zA-Z0-9_-]+)/)
        return m ? m[1] : id.split('?')[0]
      }),
  )

  // Deduplicate: CMS TikTok URLs should not appear twice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmsTikTokIds = new Set(
    cmsVideos
      .filter((v: any) => v.platform === 'tiktok' && (v.embed_id ?? v.embedId))
      .map((v: any) => String(v.embed_id ?? v.embedId ?? '').trim()),
  )

  // Deduplicate: CMS Instagram URLs should not appear twice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmsInstagramIds = new Set(
    cmsVideos
      .filter((v: any) => v.platform === 'instagram' && (v.embed_id ?? v.embedId))
      .map((v: any) => String(v.embed_id ?? v.embedId ?? '').trim()),
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unifiedVideos: any[] = [
    // CMS videos first (editorial priority) — skip entries with missing/invalid embed IDs
    ...cmsVideos
      .filter((v: any) => {
        const rawId = String(v.embed_id ?? v.embedId ?? '').trim()
        if (!rawId) return false
        // YouTube: require an 11-char video ID or a youtube.com URL
        if (v.platform === 'youtube') {
          return rawId.length === 11 || /youtu\.be\/|watch\?v=/.test(rawId)
        }
        // TikTok / Instagram / Facebook: require a valid URL
        return rawId.startsWith('http')
      })
      .map((v: any) => {
      // Ensure publishedAt is always a valid date string
      const publishedAt = v.published_at ?? v.created_at ?? v.createdAt ?? ''
      const publishedDate = publishedAt
        ? new Date(publishedAt).toISOString()
        : new Date().toISOString()

      let videoId = String(v.embed_id ?? v.embedId ?? '').trim()
      if (v.platform === 'youtube' && videoId) {
        if (videoId.startsWith('http')) {
          const youtuBeMatch = videoId.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
          if (youtuBeMatch) videoId = youtuBeMatch[1]
          const watchMatch = videoId.match(/[?&]v=([a-zA-Z0-9_-]+)/)
          if (watchMatch) videoId = watchMatch[1]
        }
        videoId = videoId.split('?')[0].split('&')[0]
      }

      return {
        id: videoId,
        dbId: v.id,
        title: v.title,
        thumbnailUrl: getThumbnail(v),
        platform: v.platform,
        viewCount: v.viewCount,
        duration: v.duration,
        publishedAt: publishedDate,
      }
    }),
    // YouTube RSS videos not already in CMS
    ...youtubeVideos
      .filter((yv) => !cmsYoutubeIds.has(yv.id))
      .map((yv) => ({
        id: yv.id,
        dbId: yv.id,
        title: yv.title,
        thumbnailUrl: yv.thumbnailUrl,
        platform: 'youtube',
        viewCount: yv.viewCount,
        duration: yv.duration,
        publishedAt: yv.publishedAt,
      })),
    // TikTok videos from RSS not already in CMS
    ...tiktokVideos
      .filter((tv) => !cmsTikTokIds.has(tv.id))
      .map((tv) => ({
        id: tv.id,
        dbId: `tiktok-${tv.id}`,
        title: tv.title,
        thumbnailUrl: tv.thumbnailUrl,
        platform: 'tiktok',
        viewCount: tv.viewCount,
        duration: tv.duration,
        publishedAt: tv.publishedAt,
      })),
    // Instagram videos from RSS not already in CMS
    ...instagramVideos
      .filter((iv) => !cmsInstagramIds.has(iv.id))
      .map((iv) => ({
        id: iv.id,
        dbId: `ig-${iv.id}`,
        title: iv.title,
        thumbnailUrl: iv.thumbnailUrl,
        platform: 'instagram',
        viewCount: iv.viewCount,
        duration: iv.duration,
        publishedAt: iv.publishedAt,
      })),
  ]

  // Sort by publishedAt descending
  unifiedVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Videos</h1>
      <p className="mt-2 text-foreground/60">
        Watch all of Fweezytech's tech reviews across YouTube, TikTok, Instagram and Facebook
      </p>
      <VideoFeed videos={unifiedVideos} />
    </div>
  )
}