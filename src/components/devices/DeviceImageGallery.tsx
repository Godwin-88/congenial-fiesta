'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

export interface GalleryImage {
  url: string
  alt?: string | null
  isPrimary?: boolean
}

interface DeviceImageGalleryProps {
  images?: GalleryImage[]
  deviceName: string
}

/**
 * Interactive device photo gallery.
 * - Click thumbnails (or use arrow keys when focused) to switch the main image.
 * - Prev/next arrows, image counter, and a fullscreen lightbox.
 * - Keyboard: ArrowLeft / ArrowRight navigate, Escape closes the lightbox.
 */
export default function DeviceImageGallery({ images, deviceName }: DeviceImageGalleryProps) {
  const list = (Array.isArray(images) ? images : []).filter(
    (img) => img && typeof img.url === 'string' && img.url.trim().length > 0,
  )
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      list.findIndex((img) => img.isPrimary),
    ),
  )
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!list.length) return
    // keep the selected index in range when images change
    setIndex((prev) => Math.min(prev, list.length - 1))
  }, [list.length])

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!list.length) return
      setIndex((prev) => (prev + dir + list.length) % list.length)
    },
    [list.length],
  )

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, go])

  if (!list.length) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
        No image
      </div>
    )
  }

  const current = list[index] ?? list[0]
  const alt = current.alt?.trim()
    ? String(current.alt)
    : `${deviceName} product photo ${index + 1}`

  return (
    <div>
      {/* Main image */}
      <div
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted"
        tabIndex={0}
        role="region"
        aria-label={`${deviceName} image gallery`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            go(-1)
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            go(1)
          }
        }}
      >
        <Image
          src={String(current.url)}
          alt={alt}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-8 transition-opacity duration-200"
        />

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <ChevronRight size={20} />
        </button>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="View fullscreen"
          className="absolute right-3 top-3 rounded-full border border-border bg-background/80 p-2 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Maximize2 size={16} />
        </button>

        {/* counter */}
        <div className="absolute bottom-3 left-3 rounded-full bg-background/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
          {index + 1} / {list.length}
        </div>
      </div>
      {/* Thumbnails */}
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Image thumbnails">
          {list.map((img, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? 'border-brand-primary' : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <Image
                src={String(img.url)}
                alt={img.alt?.trim() ? String(img.alt) : `${deviceName} thumb ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image viewer"
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close fullscreen"
            className="absolute right-4 top-4 rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:text-white"
          >
            <X size={22} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:text-white"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="relative h-[80vh] w-[80vw] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={String(current.url)}
              alt={alt}
              fill
              sizes="80vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="Next image"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:text-white"
          >
            <ChevronRight size={28} />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
            {index + 1} / {list.length}
          </div>
        </div>
      )}
    </div>
  )
}