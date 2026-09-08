'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from './Logo'
import type { AdminUser } from '@/types/cms'
import { useAdminNav } from '@/components/admin/AdminNavContext'
import {
  LayoutDashboard, FileText, Smartphone, Tag, Video,
  Clock, Image as ImageIcon, Handshake, Package, Trophy, Award,
  FileJson, Users, Settings, LogOut, Menu, X,
  ChevronDown, Layers, Briefcase, Shield,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  roles?: ('admin' | 'editor' | 'viewer' | 'owner')[]
}

interface NavSection {
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Content',
    icon: <Layers size={16} />,
    items: [
      { label: 'Articles', icon: <FileText size={18} />, href: '/admin/articles' },
      { label: 'Devices', icon: <Smartphone size={18} />, href: '/admin/devices' },
      { label: 'Brands', icon: <Tag size={18} />, href: '/admin/brands' },
      { label: 'Videos', icon: <Video size={18} />, href: '/admin/videos' },
      { label: 'Coming Soon', icon: <Clock size={18} />, href: '/admin/coming-soon' },
      { label: 'Media Library', icon: <ImageIcon size={18} />, href: '/admin/media' },
    ],
  },
  {
    label: 'Business',
    icon: <Briefcase size={16} />,
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
    icon: <Shield size={16} />,
    items: [
      { label: 'Users', icon: <Users size={18} />, href: '/admin/users', roles: ['admin'] },
      { label: 'Settings', icon: <Settings size={18} />, href: '/admin/settings', roles: ['admin'] },
      { label: 'Analytics', icon: <LayoutDashboard size={18} />, href: '/admin/analytics' },
    ],
  },
]

/**
 * Returns the label of the nav section that contains the item matching the current
 * route — used to auto-open the accordion section the admin is currently in.
 */
function activeSectionFor(
  sections: NavSection[],
  pathname: string,
  canShow: (item: NavItem) => boolean,
  isActive: (href: string) => boolean,
): string | null {
  for (const section of sections) {
    const found = section.items.some(
      (item) => canShow(item) && isActive(item.href),
    )
    if (found) return section.label
  }
  return null
}

type SidebarProps = {
  adminUser: AdminUser
}

export default function Sidebar({ adminUser }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { sidebarCollapsed, toggleSidebar } = useAdminNav()

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
    // Owner is a superset of admin — owners see every admin-visible item.
    if (adminUser.role === 'owner') return item.roles.includes('admin')
    return item.roles.includes(adminUser.role)
  }

  // Only one major menu is expanded at a time — clicking another menu hides
  // the previous one. Starts open on the section containing the current page..
  const [openSection, setOpenSection] = useState<string | null>(
    () => activeSectionFor(NAV_SECTIONS, pathname, canShow, isActive),
  )

  // Follow the current page: when the route moves into another section, open it
  // (and — since only one section may be open — close the previous one).
  useEffect(() => {
    setOpenSection((prev) => activeSectionFor(NAV_SECTIONS, pathname, canShow, isActive) ?? prev)
  }, [pathname, adminUser.role])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const roleBadgeColor = {
    owner: 'bg-brand-primary/20 text-brand-primary',
    admin: 'bg-red-500/20 text-red-400',
    editor: 'bg-blue-500/20 text-blue-400',
    viewer: 'bg-foreground/10 text-foreground/70',
  }

  const userRoles: Array<'admin' | 'editor' | 'viewer' | 'owner'> = ['owner', 'admin', 'editor', 'viewer']

  const sidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-border ${collapsed ? 'p-3 flex justify-center' : 'p-4'}`}>
        {collapsed ? (
          <Link href="/admin" aria-label="Dashboard" title="Dashboard">
            <span className="block w-8 h-8 rounded-lg overflow-hidden">
              <img src="/images/logo.jpeg" alt="FweezyTech" className="object-cover w-full h-full" />
            </span>
          </Link>
        ) : (
          <Link href="/admin">
            <Logo />
          </Link>
        )}
      </div>

      {/* Navigation — a standalone first-class Dashboard link for all signed-in
          admins, followed by the major menus (always visible); their items unfold
          on click, one section open at a time. */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2 space-y-1' : 'p-3 space-y-1'}`}>
        {/* Dashboard — never part of a group; first menu an admin sees */}
        <div className="pb-1">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === '/admin' ? 'page' : undefined}
            title={collapsed ? 'Dashboard' : undefined}
            className={[
              'flex items-center rounded-lg text-sm transition-colors',
              collapsed ? 'justify-center py-2 px-1' : 'gap-3 px-3 py-2',
              pathname === '/admin'
                ? 'bg-brand-primary/10 text-brand-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            ].join(' ')}
          >
            <span className={pathname === '/admin' ? 'text-brand-primary' : 'text-muted-foreground'}>
              <LayoutDashboard size={18} />
            </span>
            {!collapsed && 'Dashboard'}
          </Link>
        </div>

        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(canShow)
          if (visibleItems.length === 0) return null
          const isOpen = openSection === section.label
          const hasActive = visibleItems.some((item) => isActive(item.href))
          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    // A rail icon click expands the sidebar and opens the section
                    setOpenSection(section.label)
                    toggleSidebar()
                  } else {
                    setOpenSection(isOpen ? null : section.label)
                  }
                }}
                aria-expanded={isOpen}
                title={collapsed ? section.label : undefined}
                className={[
                  'flex w-full items-center rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  collapsed ? 'justify-center py-2 px-1' : 'justify-between gap-2 px-2 py-2',
                  hasActive ? 'text-brand-primary' : 'text-muted-foreground',
                  'hover:text-foreground hover:bg-accent',
                ].join(' ')}
              >
                <span className={`flex items-center ${collapsed ? '' : 'gap-2'} ${hasActive ? 'text-brand-primary' : ''}`}>
                  {section.icon}
                  {!collapsed && section.label}
                </span>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {!collapsed && isOpen && (
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
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
      <div className={`border-t border-border ${collapsed ? 'p-2 space-y-1' : 'p-4'}`}>
        {collapsed ? (
          <>
            <div className="flex justify-center">
              <span className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center
                              text-primary-foreground text-sm font-bold">
                {getInitials(adminUser.display_name)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="flex w-full justify-center py-2 rounded-lg text-muted-foreground
                         hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
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

      {/* Mobile drawer — always expanded content, hamburger-toggled */}
      <aside
        className={[
          'fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border',
          'transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent(false)}
      </aside>

      {/* Desktop sidebar — collapsible rail */}
      <aside
        className={[
          'hidden lg:flex flex-col h-full w-64 bg-card border-r border-border shrink-0',
          'transition-[width] duration-200 ease-in-out',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
        ].join(' ')}
      >
        {sidebarContent(sidebarCollapsed)}
        {/* Collapse / expand toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex items-center justify-center gap-2 px-3 py-2 border-t border-border
                     text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!sidebarCollapsed && (
            <span className="text-xs font-medium">Collapse</span>
          )}
        </button>
      </aside>
    </>
  )
}