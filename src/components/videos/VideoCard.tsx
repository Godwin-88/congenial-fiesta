import Image from 'next/image'
import { formatViewCount } from '@/lib/youtube/client'

type VideoCardProps = {
  id: string
  title: string
  thumbnailUrl: string
  platform: string
  viewCount?: number
  duration?: string
  publishedAt: string
}

export function VideoCard({ id, title, thumbnailUrl, platform, viewCount, duration, publishedAt }: VideoCardProps) {
  const platformColors: Record<string, string> = {
    youtube: 'bg-red-600',
    tiktok: 'bg-black',
    instagram: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
    facebook: 'bg-blue-600',
  }

  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1)
  const badgeColor = platformColors[platform] ?? 'bg-muted'

  const relativeTime = getRelativeTime(publishedAt)

  return (
    <div
      className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg"
      data-video-id={id}
      data-platform={platform}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </span>
        )}
        <span
          className={`absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-semibold text-white ${badgeColor}`}
        >
          {platformLabel}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug">
          {title}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-foreground/60">
          {viewCount !== undefined && viewCount > 0 && (
            <span>{formatViewCount(viewCount)}</span>
          )}
          <span>{relativeTime}</span>
        </div>
      </div>
    </div>
  )
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}