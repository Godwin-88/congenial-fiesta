import { fetchYouTubeVideos, fetchTopYouTubeVideos } from '@/lib/youtube/client'
import { getCmsVideos, getFeaturedCmsVideos } from '@/lib/videos/queries'
import { VideoCard } from '@/components/videos/VideoCard'
import VideoFeed from './video-feed'

export const metadata = {
  title: 'Videos | FweezyTech',
  description: "Watch all of Fweezy's tech reviews across YouTube, TikTok, Instagram and Facebook",
}

export default async function VideosPage() {
  const [youtubeVideos, cmsVideosResult, _featuredCmsVideos] = await Promise.all([
    fetchYouTubeVideos(20).catch(() => []),
    getCmsVideos({ limit: 50 }).catch(() => ({ videos: [], totalPages: 0 })),
    getFeaturedCmsVideos().catch(() => []),
  ])

  const cmsVideos = cmsVideosResult.videos

  // Merge YouTube + CMS videos, deduplicate by embed ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmsYoutubeIds = new Set(cmsVideos.filter((v: any) => v.platform === 'youtube').map((v: any) => v.embedId))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unifiedVideos: any[] = [
    // CMS videos first (editorial priority)
    ...cmsVideos.map((v: any) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl ?? '',
      platform: v.platform,
      viewCount: v.viewCount,
      duration: v.duration,
      publishedAt: v.publishedAt ?? v.createdAt,
    })),
    // YouTube API videos not already in CMS
    ...youtubeVideos
      .filter((yv) => !cmsYoutubeIds.has(yv.id))
      .map((yv) => ({
        id: yv.id,
        title: yv.title,
        thumbnailUrl: yv.thumbnailUrl,
        platform: 'youtube',
        viewCount: yv.viewCount,
        duration: yv.duration,
        publishedAt: yv.publishedAt,
      })),
  ]

  // Sort by publishedAt descending
  unifiedVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Videos</h1>
      <p className="mt-2 text-foreground/60">
        Watch all of Fweezy's tech reviews across YouTube, TikTok, Instagram and Facebook
      </p>
      <VideoFeed videos={unifiedVideos} />
    </div>
  )
}