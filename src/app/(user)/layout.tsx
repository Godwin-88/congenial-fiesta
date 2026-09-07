import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'My Dashboard | FweezyTech',
}

/**
 * Auth guard for the signed-in user app. The actual shell (left sidebar +
 * scrollable content column) is rendered once by the root layout via
 * <UserAppShell> when the visitor is authenticated — so it wraps not just
 * these six routes but every public route (devices, articles, videos, …)
 * too, giving signed-in users one consistent app around all site content.
 *
 * This layout only guards auth;the shell above already hides the public
 * header/footer for signed-in users.
 *
 * NOTE:the content column padding/width lives in UserAppShell — keep that
 * in sync when changing page margins.
 *
 * This guard mirrors the admin pattern (getAdminUser):`setAll` is a no-op
 * because Next.js forbids cookie writes from Server Components (layouts);the
 * middleware (src/proxy.ts → src/lib/supabase/middleware.ts) already handles
 * session refresh for every request, so no writes are needed here.
 */
export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/dashboard')
  }

  return <>{children}</>
}
