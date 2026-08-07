'use client'

import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Profile</h1>
        <p className="mt-4 text-muted-foreground">
          Please{' '}
          <Link href="/auth/login" className="text-brand-primary hover:underline">
            sign in
          </Link>{' '}
          to view your profile.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Profile</h1>
      <p className="mt-1 text-muted-foreground">Your account information.</p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-brand-primary flex items-center justify-center
                          text-primary-foreground text-2xl font-bold shrink-0">
            {(user.email?.[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {user.email?.split('@')[0] ?? 'User'}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm text-foreground font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Last Sign In</span>
            <span className="text-sm text-foreground font-medium">
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Account Created</span>
            <span className="text-sm text-foreground font-medium">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-sm text-foreground font-mono text-xs truncate max-w-[200px]">
              {user.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}