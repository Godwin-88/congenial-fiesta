'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Rating } from '@/lib/community/ratings'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-brand-primary text-brand-primary' : 'fill-muted text-muted'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function relativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RatingCard({ rating, currentUserId }: { rating: Rating; currentUserId: string | null }) {
  const [helpfulCount, setHelpfulCount] = useState(rating.helpfulCount)
  const [userVote, setUserVote] = useState(rating.userVote)
  const [hovered, setHovered] = useState<'up' | 'down' | null>(null)

  const handleVote = async (vote: 1 | -1) => {
    if (!currentUserId) return

    try {
      const res = await fetch('/api/community/ratings/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratingId: rating.id, vote }),
      })

      if (res.ok) {
        if (userVote === vote) {
          setHelpfulCount((prev) => prev - 1)
          setUserVote(null)
        } else {
          const delta = userVote === (vote === 1 ? -1 : 1) ? 0 : 1
          setHelpfulCount((prev) => prev + delta)
          setUserVote(vote)
        }
      }
    } catch {
      // error silently
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
          {rating.avatarUrl ? (
            <img src={rating.avatarUrl} alt={rating.displayName} className="h-full w-full rounded-full object-cover" />
          ) : (
            rating.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{rating.displayName}</span>
            {rating.verifiedOwner && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">Verified Owner</span>
            )}
          </div>
          <div className="mt-1">
            <StarRating rating={rating.rating} />
          </div>
          {rating.experience && (
            <p className="mt-2 text-sm text-foreground/80">{rating.experience}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{relativeTime(rating.createdAt)}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleVote(1)}
                onMouseEnter={() => setHovered('up')}
                onMouseLeave={() => setHovered(null)}
                className={userVote === 1 || hovered === 'up' ? 'text-green-400' : 'text-muted-foreground'}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">{helpfulCount}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleVote(-1)}
                onMouseEnter={() => setHovered('down')}
                onMouseLeave={() => setHovered(null)}
                className={userVote === -1 || hovered === 'down' ? 'text-red-400' : 'text-muted-foreground'}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
