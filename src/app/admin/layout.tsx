import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin/require-admin'
import Sidebar from '@/components/admin/Sidebar'
import { AdminProvider } from '@/context/AdminContext'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await getAdminUser()

  if (!adminUser) {
    redirect('/auth/login?next=/admin')
  }

  return (
    <AdminProvider adminUser={adminUser}>
      <div className="flex h-screen bg-[#0F172A]">
        <Sidebar adminUser={adminUser} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </AdminProvider>
  )
}