'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

type Comment = {
  id: number
  content_type: string
  content_slug: string
  body: string
  created_at: string
}

export default function MyCommentsPage() {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetch('/api/community/comments?mine=true')
      .then(res => res.json())
      .then(data => {
        setComments(data.comments ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">My Comments</h1>
        <div className="mt-6 animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">My Comments</h1>
      <p className="mt-1 text-muted-foreground">Comments you've posted on articles and devices.</p>

      {comments.length === 0 ? (
        <div className="mt-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto text-muted-foreground/40"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="mt-4 text-foreground/40">No comments yet.</p>
          <p className="mt-1 text-sm text-foreground/30">
            Join the conversation on articles and device reviews.
          </p>
          <Link
            href="/articles"
            className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 transition-colors"
          >
            Browse Articles
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-sm text-foreground">{comment.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString()}
                </p>
                <Link
                  href={`/${comment.content_type === 'article' ? 'articles' : 'devices'}/${comment.content_slug}`}
                  className="text-xs text-brand-primary hover:underline"
                >
                  View context
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}