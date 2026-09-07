'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Chat fills the viewport minus whatever chrome surrounds it:
 * • Public (signed out): under the 64px sticky header.
 * • App (signed in): the root layout's UserAppShell wraps `/chat` — there is
 *   no header (the sidebar is the chrome), so chat should fill the whole
 *   content column (`h-full`); on mobile the shell's content column already
 *   offsets the 56px top bar, so `h-full` stays correct there too.
 *   The auth state takes a tick to hydrate, so wait for mount before
 *   switching classes (avoids a hydration mismatch on the `class` attr).
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div
      className={
        mounted && user ? 'h-full overflow-hidden' : 'h-[calc(100vh-64px)] overflow-hidden'
      }
    >
      {children}
    </div>
  )
}
