'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@ecosy/next-themes'
import {
  LayoutDashboard,
  Smartphone,
  Clapperboard,
  Newspaper,
  Star,
  BookOpen,
  Bookmark,
  GitCompare,
  MessageSquare,
  User,
  Mail,
  LogOut,
  Menu,
  Sun,
  Moon,
  ExternalLink,
  MessageCircle,
  ChevronDown,
  Compass,
  Library,
  Home,
  Users,
  Settings,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  /** Optional query param used to disambiguate `/articles` category links. */
  category?: string
}

interface NavSection {
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

/**
 * The signed-in user's whole navigation. The public header's menus (Devices,
 * Videos, News, Reviews, Buying Guides, Contact Us) are integrated
 * here so a signed-in user never needs the public header — everything lives in
 * this left rail, tailored around their own content (My Hub / Community).
 */
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Discover',
    icon: <Compass size={16} />,
    items: [
      { label: 'Devices', icon: <Smartphone size={18} />, href: '/devices' },
      { label: 'Videos', icon: <Clapperboard size={18} />, href: '/videos' },
    ],
  },
  {
    label: 'Read',
    icon: <Library size={16} />,
    items: [
      { label: 'News', icon: <Newspaper size={18} />, href: '/articles?category=news', category: 'news' },
      { label: 'Reviews', icon: <Star size={18} />, href: '/articles?category=review', category: 'review' },
      { label: 'Buying Guides', icon: <BookOpen size={18} />, href: '/articles?category=buying-guide', category: 'buying-guide' },
    ],
  },
  {
    label: 'My Hub',
    icon: <Home size={16} />,
    items: [
      { label: 'Saved Items', icon: <Bookmark size={18} />, href: '/saved' },
      { label: 'My Comparisons', icon: <GitCompare size={18} />, href: '/my-comparisons' },
    ],
  },
  {
    label: 'Community',
    icon: <Users size={16} />,
    items: [
      { label: 'My Ratings', icon: <Star size={18} />, href: '/my-ratings' },
      { label: 'My Comments', icon: <MessageSquare size={18} />, href: '/my-comments' },
    ],
  },
  {
    label: 'Account',
    icon: <Settings size={16} />,
    items: [
      { label: 'Profile', icon: <User size={18} />, href: '/profile' },
      { label: 'Contact Us', icon: <Mail size={18} />, href: '/advertise' },
    ],
  },
]

/**
 * Returns the label of the nav section that contains the item matching the current
 * route — used to auto-open the accordion section the user is currently in.
 */
function activeSectionFor(pathname: string, searchParams: URLSearchParams): string | null {
  for (const section of NAV_SECTIONS) {
    const found = section.items.some((item) => {
      if (item.category) {
        return pathname === '/articles' && searchParams.get('category') === item.category
      }
      if (item.href === '/dashboard' || item.href === '/compare') {
        return pathname === item.href
      }
      return pathname.startsWith(item.href)
    })
    if (found) return section.label
  }
  return null
}

function prettySegment(seg: string): string {
  return seg
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

/** Page title shown in the mobile top bar so users keep their bearings. */
function titleFromPath(pathname: string, searchParams: URLSearchParams): string {
  if (!pathname) return 'Dashboard'
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/saved') return 'Saved Items'
  if (pathname === '/my-comparisons') return 'My Comparisons'
  if (pathname === '/my-ratings') return 'My Ratings'
  if (pathname === '/my-comments') return 'My Comments'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/compare') return 'Compare'
  if (pathname === '/chat') return 'Chat'
  if (pathname === '/search') return 'Search'
  if (pathname === '/advertise') return 'Contact Us'
  if (pathname === '/devices') return 'Devices'
  if (pathname.startsWith('/devices/')) return 'Device'
  if (pathname === '/videos') return 'Videos'
  if (pathname.startsWith('/videos/')) return 'Video'
  if (pathname === '/articles') {
    const category = searchParams.get('category')
    if (category === 'news') return 'News'
    if (category === 'review') return 'Reviews'
    if (category === 'buying-guide') return 'Buying Guides'
    return 'Articles'
  }
  if (pathname.startsWith('/articles/')) return 'Article'
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) return prettySegment(segments[segments.length - 1])
  return 'Dashboard'
}


export default function UserSidebar() {
  return (
    <Suspense fallback={null}>
      <UserSidebarInner />
    </Suspense>
  )
}

function UserSidebarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Only one major menu is expanded at a time — clicking another menu hides
  // the previous one. Starts open on the section containing the current page.
  const [openSection, setOpenSection] = useState<string | null>(
    () => activeSectionFor(pathname, searchParams),
  )

  // Wait until we're mounted (hydration done) before reading the theme value —
  // `theme` is 'dark' on the server but undefined on the first client render,
  // so any JS branch on it (Sun vs Moon markup) would cause a hydration error.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close the mobile drawer on any route change — tapping a nav item navigates
  // while the drawer would otherwise stay open over the destination page.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Follow the current page: when the route moves into another section, open it
  // (and — since only one section may be open — close the previous one).
  useEffect(() => {
    setOpenSection((prev) => activeSectionFor(pathname, searchParams) ?? prev)
  }, [pathname, searchParams])

  const closeMobile = () => setMobileOpen(false)

  const isActive = (item: NavItem) => {
    if (item.category) {
      return pathname === '/articles' && searchParams.get('category') === item.category
    }
    if (item.href === '/dashboard' || item.href === '/compare') {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const title = titleFromPath(pathname, searchParams)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2">
          <img src="/images/logo.jpeg" alt="FweezyTech" className="h-8 w-auto" />
        </Link>
        <p className="hidden sm:block text-xs text-muted-foreground">My FweezyTech</p>
        <button
          type="button"
          onClick={closeMobile}
          className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close menu"
        >
          <Menu size={18} className="rotate-90" />
        </button>
      </div>

      {/* Navigation — a standalone first-class Dashboard link for all signed-in users,
          followed by the major menus (always visible); their items unfold on click,
          one section open at a time (clicking another menu hides the previous one). */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Dashboard — never part of a group; first menu a user sees when logged in */}
        <div className="pb-1">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
            className={[
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
              pathname === '/dashboard'
                ? 'bg-brand-primary/10 text-brand-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            ].join(' ')}
          >
            <span className={pathname === '/dashboard' ? 'text-brand-primary' : 'text-muted-foreground'}>
              <LayoutDashboard size={18} />
            </span>
            Dashboard
          </Link>
        </div>

        {NAV_SECTIONS.map((section) => {
          const isOpen = openSection === section.label
          const hasActive = section.items.some(isActive)
          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.label)}
                aria-expanded={isOpen}
                className={[
                  'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  hasActive ? 'text-brand-primary' : 'text-muted-foreground',
                  'hover:text-foreground hover:bg-accent',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={hasActive ? 'text-brand-primary' : ''}>{section.icon}</span>
                  {section.label}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobile}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-brand-primary/10 text-brand-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        ].join(' ')}
                      >
                        <span className={active ? 'text-brand-primary' : 'text-muted-foreground'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border space-y-0.5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center
                          text-primary-foreground text-sm font-bold shrink-0">
            {getInitials(user?.email ?? 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground font-medium truncate">
              {user?.email?.split('@')[0] ?? 'User'}
            </p>
            <span className="inline-block text-xs text-muted-foreground truncate max-w-[120px]">
              {user?.email ?? ''}
            </span>
          </div>
        </div>

        <Link
          href="/chat"
          onClick={closeMobile}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground
                     hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <MessageCircle size={16} />
          Chat with Fweezy
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground
                     hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <Link
          href="/videos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground
                     hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <ExternalLink size={16} />
          View site
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground
                     hover:text-red-500 hover:bg-accent rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Slim fixed top bar — shown ONLY on small screens (< lg). With the public
          header hidden in the user app, this bar provides the hamburger, brand,
          current page title and quick tools; the sidebar below it collapses to
          an off-canvas drawer. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 pl-1">
            <img src="/images/logo.jpeg" alt="FweezyTech" className="h-7 w-auto shrink-0" />
          </Link>
          <span className="ml-2 min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Sun size={18} className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon size={18} className="absolute left-1/2 top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Link
            href="/videos"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View site"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink size={18} />
          </Link>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: off-canvas drawer below lg, static full-height rail on lg+ */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background border-r border-border shadow-xl',
          'transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto lg:h-full lg:w-64 lg:max-w-none lg:shadow-none',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
