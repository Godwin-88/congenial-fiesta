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

/**
 * Vertical analytics submenu — the 12 analytics sections rendered as a
 * second-level panel directly to the right of the main admin sidebar (desktop).
 * On smaller screens it collapses to a horizontally-scrolling strip so the
 * page stays navigable without the sidebar.
 */
export default function AnalyticsSubmenu({ role }: { role: string }) {
  const searchParams = useSearchParams()
  const period = searchParams.get('period') ?? '30d'
  const active = resolveActiveTab(searchParams.get('tab'), role)
  const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.viewer
  const href = (id: TabId) => `/admin/analytics?tab=${id}&period=${period}`

  return (
    <>
      {/* Desktop submenu panel — flush against the right edge of the sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 self-start sticky top-0 flex-col border-r border-border bg-card">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Analytics
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {allowed.map((id) => {
            const Icon = TAB_ICONS[id]
            const isActive = id === active
            return (
              <Link
                key={id}
                href={href(id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                ].join(' ')}
              >
                <span className={isActive ? 'text-brand-primary' : 'text-muted-foreground'}>
                  <Icon size={16} />
                </span>
                {TAB_LABELS[id]}
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