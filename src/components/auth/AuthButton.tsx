'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import AuthModal from '@/components/auth/AuthModal'

interface AuthButtonProps {
  redirectTo?: string
}

export default function AuthButton({ redirectTo }: AuthButtonProps) {
  const { user, isLoading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    )
  }

  if (!user) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowModal(true)}
          className="inline-flex"
        >
          Sign In / Sign Up
        </Button>
        <AuthModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          redirectTo={redirectTo}
        />
      </>
    )
  }

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white transition-opacity hover:opacity-80"
        aria-label={displayName}
      >
        {initial}
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <a
              href="/saved"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Saved
            </a>
            <button
              onClick={async () => {
                setDropdownOpen(false)
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/')
                router.refresh()
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}