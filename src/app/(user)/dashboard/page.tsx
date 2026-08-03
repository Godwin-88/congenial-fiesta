'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useComparisonTray } from '@/context/ComparisonTrayContext'
import { Bookmark, GitCompare, Star, MessageSquare, User } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const { savedComparisons, fetchSavedComparisons } = useComparisonTray()

  useEffect(() => {
    if (user) {
      fetchSavedComparisons()
    }
  }, [user, fetchSavedComparisons])

  const displayName = user?.email?.split('@')[0] ?? 'User'

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-1 text-muted-foreground">
        Welcome back, {displayName}! Here's your activity overview.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/my-comparisons"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{savedComparisons.length}</p>
              <p className="text-sm text-muted-foreground">Saved Comparisons</p>
            </div>
            <GitCompare size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/saved"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-sm text-muted-foreground">Saved Items</p>
            </div>
            <Bookmark size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/my-ratings"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-sm text-muted-foreground">Ratings Given</p>
            </div>
            <Star size={20} className="text-muted-foreground group-hover:text-brand-primary transition-colors" />
          </div>
        </Link>

        <Link
          href="/my-comments"
          className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-sm text-muted-foreground">Comments</p>
            </div>
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
