'use client'

import { usePathname } from 'next/navigation'

export default function IsAdminRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) {
    return children
  }
  return null
}