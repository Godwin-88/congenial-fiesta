import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserSidebar from '@/components/user/UserSidebar'

export const metadata = {
  title: 'My Dashboard | FweezyTech',
}

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/saved')
  }

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  )
}