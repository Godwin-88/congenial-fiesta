import { Suspense } from 'react'
import { getAdminUser } from '@/lib/admin/require-admin'
import AnalyticsSubmenu from '@/components/admin/AnalyticsSubmenu'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await getAdminUser()
  const role = adminUser?.role ?? 'viewer'

  return (
    <div className="flex items-start -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Analytics submenu panel — sits to the right of the admin sidebar (desktop) */}
      <Suspense fallback={<div className="hidden lg:block w-60 shrink-0" />}>
        <AnalyticsSubmenu role={role} />
      </Suspense>

      {/* Panel content */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 min-h-[70vh]">
        {children}
      </div>
    </div>
  )
}