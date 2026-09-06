'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Global floating "back to top" button for the public site.
 * Mobile: bottom-left, clear of the fixed bottom nav and the chat FAB.
 * Desktop: bottom-right, stacked above the chat bubble.
 * Not rendered on admin routes (root layout gates it).
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-20 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground/70 shadow-lg transition-all hover:text-foreground lg:bottom-24 lg:left-auto lg:right-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}