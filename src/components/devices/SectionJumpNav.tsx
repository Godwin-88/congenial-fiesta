'use client'

import { useEffect, useRef, useState } from 'react'

interface JumpItem {
  id: string
  label: string
}

export interface SectionJumpNavProps {
  items: JumpItem[]
}

/**
 * Sticky scroll-spy chip navigation shown above the device content.
 * Lets mobile users jump straight to a section instead of scrubbing
 * through a long review page. Active section is highlighted as you scroll.
 */
export default function SectionJumpNav({ items }: SectionJumpNavProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observerRef.current.observe(el)
    }
    return () => {
      observerRef.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="Device sections"
      className="sticky top-16 z-30 -mx-4 mb-6 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6 lg:-mx-8 lg:top-[72px] lg:px-8"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollTo(item.id)}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            active === item.id
              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
              : 'border-border text-muted-foreground hover:border-brand-primary/50 hover:text-foreground'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}