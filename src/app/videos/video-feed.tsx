'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { VideoCard } from '@/components/videos/VideoCard'

const VideoModal = dynamic(() => import('@/components/videos/VideoModal'), { ssr: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VideoFeed({ videos }: { videos: any[] }) {
  const [modalVideo, setModalVideo] = useState<{ id: string; platform: string; title: string } | null>(null)

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = (e.target as HTMLElement).closest('[data-video-id]')
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
      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="mt-12 text-center text-foreground/40">
          <p>No videos found.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3" onClick={handleCardClick}>
          {videos.map((video, i) => (
            <VideoCard
              key={`${video.dbId}-${i}`}
              id={video.id}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              platform={video.platform}
              viewCount={video.viewCount}
              duration={video.duration}
              publishedAt={video.publishedAt}
              priority={i < 3}
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