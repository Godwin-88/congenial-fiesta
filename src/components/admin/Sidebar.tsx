'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from './Logo'
import type { AdminUser } from '@/types/cms'
import {
  LayoutDashboard, FileText, Smartphone, Tag, Video,
  Clock, Image, Handshake, Package, Trophy, Award,
  FileJson, Users, Settings, LogOut, Menu, X,
  ChevronDown,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  roles?: ('admin' | 'editor' | 'viewer')[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/admin' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Articles', icon: <FileText size={18} />, href: '/admin/articles' },
      { label: 'Devices', icon: <Smartphone size={18} />, href: '/admin/devices' },
      { label: 'Brands', icon: <Tag size={18} />, href: '/admin/brands' },
      { label: 'Videos', icon: <Video size={18} />, href: '/admin/videos' },
      { label: 'Coming Soon', icon: <Clock size={18} />, href: '/admin/coming-soon' },
      { label: 'Media Library', icon: <Image size={18} />, href: '/admin/media' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Sponsors', icon: <Handshake size={18} />, href: '/admin/sponsors', roles: ['admin', 'editor'] },
      { label: 'Packages', icon: <Package size={18} />, href: '/admin/packages', roles: ['admin', 'editor'] },
      { label: 'Milestones', icon: <Trophy size={18} />, href: '/admin/milestones', roles: ['admin', 'editor'] },
      { label: 'Awards', icon: <Award size={18} />, href: '/admin/awards', roles: ['admin', 'editor'] },
      { label: 'Media Kit', icon: <FileJson size={18} />, href: '/admin/media-kit', roles: ['admin'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', icon: <Users size={18} />, href: '/admin/users', roles: ['admin'] },
      { label: 'Settings', icon: <Settings size={18} />, href: '/admin/settings', roles: ['admin'] },
      { label: 'Analytics', icon: <LayoutDashboard size={18} />, href: '/admin/analytics' },
    ],
  },
]

type SidebarProps = {
  adminUser: AdminUser
}

export default function Sidebar({ adminUser }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const canShow = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(adminUser.role)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const roleBadgeColor = {
    admin: 'bg-red-500/20 text-red-400',
    editor: 'bg-blue-500/20 text-blue-400',
    viewer: 'bg-gray-500/20 text-gray-400',
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/admin">
          <Logo />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(canShow)
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({
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
              <div className="mt-1 space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
            </div>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center
                          text-primary-foreground text-sm font-bold shrink-0">
            {getInitials(adminUser.display_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground font-medium truncate">
              {adminUser.display_name}
            </p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${roleBadgeColor[adminUser.role]}`}>
              {adminUser.role}
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