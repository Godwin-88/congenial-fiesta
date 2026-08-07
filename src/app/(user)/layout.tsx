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
    redirect('/auth/login?next=/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 overflow-y-auto bg-background pt-16 lg:pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}