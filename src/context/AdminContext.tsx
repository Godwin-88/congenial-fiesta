'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { AdminUser } from '@/types/cms'

interface AdminContextType {
  user: AdminUser | null
  role: string
  isAdmin: boolean
  isEditor: boolean
  isViewer: boolean
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  role: 'viewer',
  isAdmin: false,
  isEditor: false,
  isViewer: true,
})

export function AdminProvider({
  adminUser,
  children,
}: {
  adminUser: AdminUser
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AdminUser>(adminUser)
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const isEditor = role === 'admin' || role === 'editor'
  const isViewer = true

  useEffect(() => {
    setUser(adminUser)
  }, [adminUser])

  return (
    <AdminContext.Provider value={{ user, role, isAdmin, isEditor, isViewer }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
