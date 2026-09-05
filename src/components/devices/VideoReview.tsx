'use client'

import { useState } from 'react'
import { Play, ExternalLink } from 'lucide-react'
import Image from 'next/image'

interface VideoReviewProps {
  deviceName: string
  videoId?: string
  tiktokUrl?: string
}

/**
 * Device video review with a poster-play lazy-load.
 * The YouTube iframe is NOT mounted until the user taps the play overlay —
 * saves bandwidth and layout shift on mobile (thumbnail described below),
 * and keeps the iframe from hammering YouTube on every page view.
 */
export default function VideoReview({ deviceName, videoId, tiktokUrl }: VideoReviewProps) {
  const [play, setPlay] = useState(false)

  return (
    <div className="space-y-6">
      {videoId && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {!play ? (
            <button
              type="button"
              onClick={() => setPlay(true)}
              aria-label={`Play ${deviceName} review on YouTube`}
              className="group absolute inset-0 flex h-full w-full items-center justify-center"
            >
              {/* Poster thumbnail (lazy from YouTube, so no iframe until interaction) */}
              <Image
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                unoptimized
              />
              {/* Dark scrim + centered play chip */}
              <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-transform duration-200 group-hover:scale-110">
                <Play size={26} className="ml-0.5 fill-current" />
              </span>
              {/* External link fallback */}
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                <ExternalLink size={12} /> Watch on YouTube
              </span>
            </button>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={`${deviceName} Review by Millan Wafulla`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="eager"
            />
          )}
        </div>
      )}

      {tiktokUrl && (
        <div>
          <blockquote className="tiktok-embed" cite={tiktokUrl}>
            <section>
              <a target="_blank" rel="noopener noreferrer" href={tiktokUrl}>
                View on TikTok
              </a>
            </section>
          </blockquote>
        </div>
      )}
    </div>
  )
}