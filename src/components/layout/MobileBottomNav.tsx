'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Smartphone, Clapperboard, Scale, Menu, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '@ecosy/next-themes'
import SearchBar from '@/components/search/SearchBar'

const moreLinks = [
  { href: '/articles?category=news', label: 'News' },
  { href: '/articles?category=review', label: 'Reviews' },
  { href: '/articles?category=buying-guide', label: 'Buying Guides' },
  { href: '/advertise', label: 'Contact Us' },
]

const primary = [
  { href: '/', label: 'Home', icon: House, match: (p: string) => p === '/' },
  { href: '/devices', label: 'Devices', icon: Smartphone, match: (p: string) => p.startsWith('/devices') },
  { href: '/compare', label: 'Compare', icon: Scale, match: (p: string) => p === '/compare' },
  { href: '/videos', label: 'Videos', icon: Clapperboard, match: (p: string) => p.startsWith('/videos') },
]

/**
 * Mobile-first fixed bottom navigation (public site only).
 * Keeps the primary destinations one thumb-tap away, replacing the
 * hamburger-only pattern on phones. Hidden on lg+ where the header
 * nav is used. The trailing "Menu" button slides up News/Reviews/
 * Buying Guides/Contact plus search and the theme toggle.
 */
export default function MobileBottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Close the slide-up menu on any route change.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <nav
      aria-label="Primary (mobile)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
    >
      {menuOpen && (
        <div className="border-b border-border bg-card shadow-2xl">
          <div className="mx-auto max-w-lg space-y-4 px-4 pb-5 pt-4">
            <SearchBar placeholder="Search FweezyTech..." autoFocus className="w-full" />
            <nav className="grid grid-cols-2 gap-2" aria-label="More links">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-brand-primary/40 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-brand-primary/40"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {primary.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-brand-primary' : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              {label}
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            menuOpen ? 'text-brand-primary' : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          Menu
        </button>
      </div>
    </nav>
  )
}