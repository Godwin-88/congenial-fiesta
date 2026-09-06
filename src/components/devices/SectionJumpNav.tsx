'use client'

import { useEffect, useRef, useState } from 'react'

interface JumpItem {
  id: string
  label: string
}

export interface SectionJumpNavProps {
  items: JumpItem[]
  /**
   * layout of the jump navigation:
   * - 'horizontal' → sticky scrollable pill row (mobile < lg)
   * - 'vertical'   → sticky table-of-contents list (desktop lg+)
   */
  variant?: 'horizontal' | 'vertical'
}

/**
 * Scroll-spy section navigation for the device page.
 * Mobile: a sticky pill row of chips. Desktop: a vertical table of
 * contents with numbered items and an active left-rail indicator.
 * Active section is highlighted as you scroll.
 */
export default function SectionJumpNav({ items, variant = 'horizontal' }: SectionJumpNavProps) {
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

  if (variant === 'vertical') {
    return (
      <nav aria-label="Device sections" className="hidden lg:block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          On this page
        </p>
        <ol className="border-l border-border">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollTo(item.id)}
                aria-current={active === item.id ? 'true' : undefined}
                className={`-ml-px flex w-full items-center gap-2.5 border-l-2 py-2 pl-4 text-left text-sm transition-colors ${
                  active === item.id
                    ? 'border-brand-primary font-semibold text-brand-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <span
                  className={`text-xs tabular-nums ${
                    active === item.id ? 'text-brand-primary' : 'text-muted-foreground/50'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Device sections"
      className="sticky top-16 z-30 -mx-4 mb-6 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6"
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