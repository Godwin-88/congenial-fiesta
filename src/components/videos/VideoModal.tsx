'use client'

import { useEffect, useCallback } from 'react'
import Script from 'next/script'

type VideoModalProps = {
  videoId: string | null
  platform: string | null
  title: string
  onClose: () => void
}

export default function VideoModal({ videoId, platform, title, onClose }: VideoModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (videoId) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [videoId, handleKeyDown])

  if (!videoId || !platform) return null

  const platformUrl = getPlatformUrl(platform, videoId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-4xl rounded-xl bg-black overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Video embed */}
        <div className="aspect-video w-full">
          {platform === 'youtube' ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : platform === 'tiktok' ? (
            <div className="flex h-full w-full items-center justify-center bg-background/10">
              <blockquote
                className="tiktok-embed"
                cite={videoId}
                data-video-id={getTikTokId(videoId)}
                style={{ maxWidth: '605px', minWidth: '325px' }}
              >
                <section>
                  <a target="_blank" rel="noopener noreferrer" href={videoId}>
                    Watch on TikTok
                  </a>
                </section>
              </blockquote>
              <Script async src="https://www.tiktok.com/embed.js" />
            </div>
          ) : platform === 'instagram' ? (
            <iframe
              src={`https://www.instagram.com/p/${getInstagramShortcode(videoId)}/embed`}
              title={title}
              allowFullScreen
              className="h-full w-full"
            />
          ) : platform === 'facebook' ? (
            <div className="flex h-full w-full items-center justify-center bg-background/10">
              <iframe
                src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoId)}&show_text=false`}
                title={title}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background/10">
              <p className="text-lg text-foreground/80">
                Watch this on {platform}
              </p>
              <a
                href={videoId}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-brand-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                Watch on {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </a>
            </div>
          )}
        </div>

        {/* Video title and platform link */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white line-clamp-1">{title}</h3>
          <a
            href={platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-foreground/60 hover:text-brand-primary transition-colors"
          >
            Watch on {platform.charAt(0).toUpperCase() + platform.slice(1)} ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// Extract TikTok video ID from a full TikTok URL
function getTikTokId(url: string): string {
  // TikTok URLs look like: https://www.tiktok.com/@user/video/1234567890
  const match = url.match(/\/video\/(\d+)/)
  return match ? match[1] : url
}

// Extract Instagram shortcode from a full Instagram URL
function getInstagramShortcode(url: string): string {
  // Instagram URLs look like: https://www.instagram.com/p/CxYzAbCdEf/
  const match = url.match(/\/p\/([^/?]+)/)
  return match ? match[1] : url
}

function getPlatformUrl(platform: string, videoId: string): string {
  switch (platform) {
    case 'youtube':
      return `https://youtube.com/watch?v=${videoId}`
    case 'tiktok':
    case 'instagram':
    case 'facebook':
      return videoId // videoId is the full URL for these platforms
    default:
      return videoId
  }
}