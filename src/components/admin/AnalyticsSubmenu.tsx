'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  TAB_LABELS,
  TAB_ICONS,
  ROLE_ALLOWED,
  resolveActiveTab,
  type TabId,
} from '@/lib/analytics/tabs'
import { useAdminNav } from '@/components/admin/AdminNavContext'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

/**
 * Vertical analytics submenu — the 12 analytics sections rendered as a
 * second-level panel directly to the right of the main admin sidebar (desktop).
 * Collapsible to a slim icon rail. On smaller screens it collapses to a
 * horizontally-scrolling strip so the page stays navigable without the sidebar.
 */
export default function AnalyticsSubmenu({ role }: { role: string }) {
  const searchParams = useSearchParams()
  const { submenuCollapsed, toggleSubmenu } = useAdminNav()
  const period = searchParams.get('period') ?? '30d'
  const active = resolveActiveTab(searchParams.get('tab'), role)
  const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.viewer
  const href = (id: TabId) => `/admin/analytics?tab=${id}&period=${period}`

  return (
    <>
      {/* Desktop submenu panel — flush against the right edge of the sidebar */}
      <aside
        className={[
          'hidden lg:flex flex-col shrink-0 self-start sticky top-0 border-r border-border bg-card',
          'transition-[width] duration-200 ease-in-out',
          submenuCollapsed ? 'w-14' : 'w-60',
        ].join(' ')}
      >
        <div className={`flex items-center border-b border-border ${submenuCollapsed ? 'justify-center py-3' : 'justify-between px-3 py-3'}`}>
          {!submenuCollapsed && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Analytics
            </p>
          )}
          <button
            type="button"
            onClick={toggleSubmenu}
            title={submenuCollapsed ? 'Expand analytics' : 'Collapse analytics'}
            aria-label={submenuCollapsed ? 'Expand analytics' : 'Collapse analytics'}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {submenuCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <nav className={`flex-1 overflow-y-auto space-y-0.5 ${submenuCollapsed ? 'p-2' : 'p-2'}`}>
          {allowed.map((id) => {
            const Icon = TAB_ICONS[id]
            const isActive = id === active
            return (
              <Link
                key={id}
                href={href(id)}
                title={submenuCollapsed ? TAB_LABELS[id] : undefined}
                aria-label={TAB_LABELS[id]}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center rounded-lg text-sm transition-colors',
                  submenuCollapsed ? 'justify-center py-2 px-1' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                ].join(' ')}
              >
                <span className={isActive ? 'text-brand-primary' : 'text-muted-foreground'}>
                  <Icon size={16} />
                </span>
                {!submenuCollapsed && TAB_LABELS[id]}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile / tablet — horizontal strip (the sidebar handles nav on small screens) */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
        {allowed.map((id) => {
          const Icon = TAB_ICONS[id]
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href(id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs transition-colors border',
                isActive
                  ? 'bg-brand-primary text-primary-foreground border-brand-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5',
              ].join(' ')}
            >
              <Icon size={13} />
              {TAB_LABELS[id]}
            </Link>
          )
        })}
      </div>
    </>
  )
}