'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

type Rating = {
  id: number
  device_slug: string
  device_name: string
  score: number
  created_at: string
}

export default function MyRatingsPage() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetch('/api/community/ratings?mine=true')
      .then(res => res.json())
      .then(data => {
        setRatings(data.ratings ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">My Ratings</h1>
        <div className="mt-6 animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-foreground/10 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">My Ratings</h1>
      <p className="mt-1 text-muted-foreground">Devices you've rated.</p>

      {ratings.length === 0 ? (
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
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p className="mt-4 text-foreground/40">No ratings yet.</p>
          <p className="mt-1 text-sm text-foreground/30">
            Rate devices to help the community.
          </p>
          <Link
            href="/devices"
            className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 transition-colors"
          >
            Browse Devices
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="group relative rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <Link
                href={`/devices/${rating.device_slug}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{rating.device_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-lg font-bold text-brand-primary">{rating.score}</span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch(`/api/community/ratings?deviceSlug=${encodeURIComponent(rating.device_slug)}`, { method: 'DELETE' })
                    setRatings((prev) => prev.filter((r) => r.id !== rating.id))
                  } catch {
                    // keep the row — user can retry
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-red-500/10"
                aria-label={`Remove rating for ${rating.device_name}`}
                title="Remove rating"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}