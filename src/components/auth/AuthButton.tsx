'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()

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
  const isOnDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (isOnDashboard) {
            setDropdownOpen(!dropdownOpen)
          } else {
            router.push('/dashboard')
          }
        }}
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