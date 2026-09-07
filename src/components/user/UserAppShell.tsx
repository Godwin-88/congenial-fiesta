'use client'

import UserSidebar from '@/components/user/UserSidebar'

/**
 * The signed-in "app" shell. Rendered by the root layout for every non-admin,
 * non-auth route when the visitor is authenticated — so the public header,
 * footer and mobile bottom nav are never shown once signed in.
 *
 * Desktop: full-height left sidebar rail + scrollable content column.
 * Mobile:  the sidebar renders its own slim fixed top bar (hamburger, brand,
 *          page title, theme) and an off-canvas drawer; the content column is
 *          offset by the 56px top bar (pt-14).
 */
export default function UserAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <UserSidebar />
      <main
        id="main-content"
        className="min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0"
      >
        {children}
      </main>
    </div>
  )
}