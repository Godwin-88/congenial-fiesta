'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { VideoCard } from '@/components/videos/VideoCard'

const VideoModal = dynamic(() => import('@/components/videos/VideoModal'), { ssr: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VideoFeed({ videos }: { videos: any[] }) {
  const [modalVideo, setModalVideo] = useState<{ id: string; platform: string; title: string } | null>(null)
  const [activePlatform, setActivePlatform] = useState<string>('all')

  const platforms = ['all', 'youtube', 'tiktok', 'instagram', 'facebook']

  const filteredVideos = activePlatform === 'all'
    ? videos
    : videos.filter((v) => v.platform === activePlatform)

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = (e.currentTarget as HTMLElement).closest('[data-video-id]')
    if (card) {
      const id = card.getAttribute('data-video-id')
      const platform = card.getAttribute('data-platform')
      if (id && platform) {
        setModalVideo({ id, platform, title: '' })
      }
    }
  }, [])

  return (
    <>
      {/* Platform Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activePlatform === p
                ? 'bg-brand-primary text-white'
                : 'bg-muted text-foreground/60 hover:bg-muted/80'
            }`}
          >
            {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="mt-12 text-center text-foreground/40">
          <p>No videos found for this platform.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" onClick={handleCardClick}>
          {filteredVideos.map((video, i) => (
            <VideoCard
              key={`${video.id}-${i}`}
              id={video.id}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              platform={video.platform}
              viewCount={video.viewCount}
              duration={video.duration}
              publishedAt={video.publishedAt}
            />
          ))}
        </div>
      )}

      {/* Subscribe CTA */}
      <div className="mt-16 rounded-2xl bg-brand-primary px-8 py-10 text-center">
        <h2 className="text-2xl font-bold text-white">Subscribe on YouTube</h2>
        <p className="mt-2 text-white/80">Never miss a review — hit subscribe on FweezyTech</p>
        <a
          href={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL ?? 'https://youtube.com/@fweezytech'}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full bg-white px-8 py-3 font-semibold text-brand-primary transition-transform hover:scale-105"
        >
          Subscribe
        </a>
      </div>

      {/* Modal */}
      <VideoModal
        videoId={modalVideo?.id ?? null}
        platform={modalVideo?.platform ?? null}
        title={modalVideo?.title ?? ''}
        onClose={() => setModalVideo(null)}
      />
    </>
  )
}