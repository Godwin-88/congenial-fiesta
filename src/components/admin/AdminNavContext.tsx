'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type AdminNavState = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  submenuCollapsed: boolean
  toggleSubmenu: () => void
}

const AdminNavContext = createContext<AdminNavState | null>(null)

const SIDEBAR_KEY = 'fweezy-admin-sidebar-collapsed'
const SUBMENU_KEY = 'fweezy-admin-submenu-collapsed'

/**
 * Shared collapse state for the admin sidebar and the analytics submenu.
 * Persists to localStorage so the choice survives navigation/reload, and
 * defaults to expanded (no SSR mismatch).
 */
export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [submenuCollapsed, setSubmenuCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) === '1') setSidebarCollapsed(true)
      if (localStorage.getItem(SUBMENU_KEY) === '1') setSubmenuCollapsed(true)
    } catch {
      /* ignore storage errors */
    }
  }, [])

  const persist = (key: string, value: boolean) => {
    try {
      localStorage.setItem(key, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <AdminNavContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar: () => {
          setSidebarCollapsed((v) => {
            persist(SIDEBAR_KEY, !v)
            return !v
          })
        },
        submenuCollapsed,
        toggleSubmenu: () => {
          setSubmenuCollapsed((v) => {
            persist(SUBMENU_KEY, !v)
            return !v
          })
        },
      }}
    >
      {children}
    </AdminNavContext.Provider>
  )
}

export function useAdminNav() {
  const ctx = useContext(AdminNavContext)
  if (!ctx) throw new Error('useAdminNav must be used within AdminNavProvider')
  return ctx
}