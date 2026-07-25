'use client'

import { usePathname } from 'next/navigation'

export default function AdminRouteGuard({
  children,
  admin,
  public_,
}: {
  children: React.ReactNode
  admin: React.ReactNode
  public_: React.ReactNode
}) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) {
    return admin
  }
  return public_
}