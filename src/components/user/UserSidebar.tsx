'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Bookmark, GitCompare, Star,
  MessageSquare, User, LogOut, Menu, X, ChevronDown,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/dashboard' },
    ],
  },
  {
    label: 'My Activity',
    items: [
      { label: 'Saved Items', icon: <Bookmark size={18} />, href: '/saved' },
      { label: 'My Comparisons', icon: <GitCompare size={18} />, href: '/my-comparisons' },
      { label: 'My Ratings', icon: <Star size={18} />, href: '/my-ratings' },
      { label: 'My Comments', icon: <MessageSquare size={18} />, href: '/my-comments' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', icon: <User size={18} />, href: '/profile' },
    ],
  },
]

export default function UserSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => NAV_SECTIONS.reduce((acc, s) => ({ ...acc, [s.label]: true }), {}),
  )

  // Close mobile sidebar on route change
  useState(() => {
    setMobileOpen(false)
  })

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/logo.jpeg" alt="FweezyTech" className="h-8 w-auto" />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">User Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <button
              type="button"
              onClick={() => setExpandedSections((prev) => ({
                ...prev,
                [section.label]: !prev[section.label],
              }))}
              className="flex items-center justify-between w-full px-2 py-1 text-xs
                         text-muted-foreground uppercase tracking-wider hover:text-foreground"
            >
              {section.label}
              <ChevronDown
                size={12}
                className={`transition-transform ${expandedSections[section.label] ? 'rotate-180' : ''}`}
              />
            </button>
            {expandedSections[section.label] && (
              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
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
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
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
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground
                     hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card
                   border border-border text-muted-foreground hover:text-foreground"
        aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border',
          'transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>
    </>
  )
}