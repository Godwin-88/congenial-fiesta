'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Moon, Sun, ExternalLink } from 'lucide-react'
import { useTheme } from '@ecosy/next-themes'

function titleFromPath(pathname: string): string {
  if (!pathname) return 'Admin'
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0 || (segments[0] === 'admin' && segments.length === 1)) return 'Dashboard'
  if (segments[0] !== 'admin') return 'Admin'
  // /admin/<section>/<id> -> "<Section> · <id>"
  const section = segments[1] ?? 'Admin'
  const pretty = (seg: string) =>
    seg
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
  if (segments.length >= 3) {
    return `${pretty(section)} · ${pretty(segments[2])}`
  }
  return pretty(section)
}

/**
 * Slim sticky topbar shown ONLY on small screens (below `lg`/1024px) inside the
 * admin dashboard. Gives admins page context + theme toggle + "view site" while
 * the sidebar collapses to a drawer. On desktop the fixed sidebar is the shell.
 */
export default function MobileTopbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const title = titleFromPath(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
      <div className="ml-10 min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Sun size={18} className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={18} className="absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View site"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ExternalLink size={18} />
        </Link>
      </div>
    </header>
  )
}