'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import AuthButton from '@/components/auth/AuthButton'
import CommentCard from '@/components/community/CommentCard'
import CommentsSkeleton from '@/components/community/CommentsSkeleton'
import { useAuth } from '@/context/AuthContext'
import type { Comment } from '@/lib/community/comments'

interface CommentsSectionProps {
  contentType: 'article' | 'video' | 'device'
  contentSlug: string
}

export default function CommentsSection({ contentType, contentSlug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [sort, setSort] = useState<'top' | 'newest'>('top')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetch(`/api/community/comments?contentType=${encodeURIComponent(contentType)}&contentSlug=${encodeURIComponent(contentSlug)}&sort=${sort}`)
      .then((res) => res.json())
      .then((data) => {
        setComments(data.comments ?? [])
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [contentType, contentSlug, sort])

  const handleSubmit = async () => {
    const body = document.getElementById(`comment-form-${contentSlug}`) as HTMLTextAreaElement
    if (!body || !body.value.trim() || !user) return

    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentSlug,
          body: body.value,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.comment) {
          setComments((prev) => (prev ? [data.comment, ...prev] : [data.comment]))
          body.value = ''
        }
      }
    } catch {
      // error silently
    }
  }

  const totalComments = (comments ?? []).reduce(
    (sum, c) => sum + 1 + c.replies.length,
    0,
  )

  return (
    <section className="mt-12">
      <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Discussion ({totalComments})</h2>

      <Tabs value={sort} onValueChange={(v) => setSort(v as 'top' | 'newest')} className="mb-4">
        <TabsList>
          <TabsTrigger value="top">Top</TabsTrigger>
          <TabsTrigger value="newest">Newest</TabsTrigger>
        </TabsList>
      </Tabs>

      {user && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <textarea
            id={`comment-form-${contentSlug}`}
            placeholder="Add to the discussion…"
            maxLength={2000}
            className="h-24 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">2000 character limit</span>
            <Button size="sm" onClick={handleSubmit}>Post Comment</Button>
          </div>
        </div>
      )}

      {!user && (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-foreground/70 mb-3">Sign in to join the discussion</p>
          <AuthButton />
        </div>
      )}

      {isLoading ? (
        <CommentsSkeleton />
      ) : comments && comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? null}
              onReply={(id) => setReplyingTo(id === replyingTo ? 0 : id)}
              replyingTo={replyingTo}
              depth={0}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
      )}
    </section>
  )
}
