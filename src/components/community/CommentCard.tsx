'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Comment } from '@/lib/community/comments'

function linkify(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-primary underline">$1</a>')
}

function absoluteTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface CommentCardProps {
  comment: Comment
  currentUserId: string | null
  onReply: (parentId: number) => void
  replyingTo: number | null
  depth?: number
}

export default function CommentCard({ comment, currentUserId, onReply, replyingTo, depth = 0 }: CommentCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(comment.helpfulCount)
  const [userVote, setUserVote] = useState(comment.userVote)
  const [replyBody, setReplyBody] = useState('')
  const [hovered, setHovered] = useState<'up' | 'down' | null>(null)

  const handleVote = async (vote: 1 | -1) => {
    if (!currentUserId) return

    try {
      const res = await fetch('/api/community/comments/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, vote }),
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

  const handleReport = async () => {
    try {
      await fetch('/api/community/comments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id }),
      })
    } catch {
      // error silently
    }
  }

  const handleReply = async () => {
    if (!replyBody.trim()) return

    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: comment.contentType,
          contentSlug: comment.contentSlug,
          body: replyBody,
          parentId: comment.id,
        }),
      })

      if (res.ok) {
        setReplyBody('')
        onReply(0)
      }
    } catch {
      // error silently
    }
  }

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'pl-8 border-l border-brand-primary/20 ml-6' : ''}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
        {comment.avatarUrl ? (
          <img src={comment.avatarUrl} alt={comment.displayName} className="h-full w-full rounded-full object-cover" />
        ) : (
          comment.displayName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{comment.displayName}</span>
          {comment.isCreator && (
            <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-medium text-white">Creator</span>
          )}
        </div>
        <div
          className="mt-1 text-sm text-foreground/80"
          dangerouslySetInnerHTML={{ __html: linkify(comment.body) }}
        />
        <div className="mt-1 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{absoluteTime(comment.createdAt)}</span>
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
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
          <button
            onClick={handleReport}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Report
          </button>
        </div>

        {replyingTo === comment.id && depth === 0 && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value.slice(0, 2000))}
              placeholder="Write a reply..."
              className="h-20 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <Button size="xs" onClick={handleReply} disabled={!replyBody.trim()}>
                Post Reply
              </Button>
              <Button size="xs" variant="ghost" onClick={() => onReply(0)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {comment.replies.length > 0 && depth < 1 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                replyingTo={replyingTo}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
