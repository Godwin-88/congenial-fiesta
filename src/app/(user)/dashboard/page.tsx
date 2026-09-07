'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useComparisonTray } from '@/context/ComparisonTrayContext'
import { Bookmark, GitCompare, Star, MessageSquare, User, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const { savedComparisons, fetchSavedComparisons } = useComparisonTray()
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [ratingsCount, setRatingsCount] = useState<number | null>(null)
  const [commentsCount, setCommentsCount] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      fetchSavedComparisons()

      fetch('/api/user/saved')
        .then((res) => res.json())
        .then((data) => setSavedCount(data.data?.length ?? 0))
        .catch(() => setSavedCount(0))

      fetch('/api/community/ratings?mine=true')
        .then((res) => res.json())
        .then((data) => setRatingsCount(data.ratings?.length ?? 0))
        .catch(() => setRatingsCount(0))

      fetch('/api/community/comments?mine=true')
        .then((res) => res.json())
        .then((data) => setCommentsCount(data.comments?.length ?? 0))
        .catch(() => setCommentsCount(0))
    }
  }, [user, fetchSavedComparisons])

  const displayName = user?.email?.split('@')[0] ?? 'User'
  const recentComparison = savedComparisons[0]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-1 text-muted-foreground">
        Welcome back, {displayName}! Here's your activity overview.
      </p>

      {/* Continue where you left off */}
      {recentComparison && (
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Continue comparing</p>
            <p className="mt-1 truncate font-medium text-foreground">{recentComparison.name}</p>
            <p className="text-sm text-muted-foreground">
              {recentComparison.devices.length} devices · saved{' '}
              {recentComparison.updated_at ? new Date(recentComparison.updated_at).toLocaleDateString() : ''}
            </p>
          </div>
          <Link
            href={`/compare?devices=${recentComparison.device_slugs.sort().join(',')}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 transition-colors"
          >
            Compare Now
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/my-comparisons"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground">{savedComparisons.length}</p>
            <p className="text-sm text-muted-foreground">Saved Comparisons</p>
            <GitCompare size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/saved"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground">{savedCount ?? '…'}</p>
            <p className="text-sm text-muted-foreground">Saved Items</p>
            <Bookmark size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/my-ratings"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground">{ratingsCount ?? '…'}</p>
            <p className="text-sm text-muted-foreground">Ratings Given</p>
            <Star size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/my-comments"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-foreground">{commentsCount ?? '…'}</p>
            <p className="text-sm text-muted-foreground">Comments</p>
            <MessageSquare size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/devices"
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
          >
            Browse Devices
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Start Comparison
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground break-all">{user?.email}</p>
        <Link
          href="/profile"
          className="mt-3 inline-flex items-center gap-2 text-sm text-brand-primary hover:underline"
        >
          <User size={14} />
          Edit Profile
        </Link>
      </div>
    </div>
  )
}
