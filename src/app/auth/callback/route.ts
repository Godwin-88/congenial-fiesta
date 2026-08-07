import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        try {
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceRoleKey) {
            const adminClient = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceRoleKey
            )
            const { data: adminUser } = await adminClient
              .from('admin_users')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle()

            if (adminUser) {
              return NextResponse.redirect(`${origin}/admin`)
            }
          }
        } catch {
          // non-admin user, continue to normal redirect
        }
      }
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`)
    }

    const { data: { session: existingSession } } = await supabase.auth.getSession()
    if (existingSession?.user) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
