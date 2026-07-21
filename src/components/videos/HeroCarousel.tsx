'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { formatViewCount } from '@/lib/youtube/client'
import type { YouTubeVideo } from '@/lib/youtube/client'

type HeroCarouselProps = {
  videos: YouTubeVideo[]
  onPlay: (video: YouTubeVideo) => void
}

export default function HeroCarousel({ videos, onPlay }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % videos.length)
  }, [videos.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + videos.length) % videos.length)
  }, [videos.length])

  useEffect(() => {
    if (isPaused || videos.length <= 1) return
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [isPaused, next, videos.length])

  if (videos.length === 0) return null

  const video = videos[current]

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Background blur */}
      <div className="absolute inset-0">
        {video.thumbnailUrl && (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            className="object-cover blur-2xl opacity-40 scale-110"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center px-6 py-20 sm:py-32 text-center">
        <h2 className="max-w-3xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl line-clamp-2">
          {video.title}
        </h2>
        <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
          <span>{formatViewCount(video.viewCount)}</span>
          <span>{video.duration}</span>
        </div>
        <button
          onClick={() => onPlay(video)}
          className="mt-6 rounded-full bg-white px-8 py-3 font-semibold text-black transition-transform hover:scale-105"
        >
          Watch Now
        </button>
      </div>

      {/* Dot indicators */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === current ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Keyboard nav */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
        aria-label="Previous video"
      >
        ←
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
        aria-label="Next video"
      >
        →
      </button>
    </section>
  )
}