import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const token = searchParams.get('token')
  const email = searchParams.get('email') ?? ''

  // ── Signup confirmation (direct link from our own email) ───────────────
  // We send links like /auth/callback?token=…&type=signup&email=… so the
  // verify step happens here (explicit `type`, no GoTrue /verify page, no raw
  // JSON errors). Backward-compatible with token_hash links too.
  if ((token || tokenHash) && type === 'signup') {
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
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash ?? token ?? '',
      type: 'signup',
    })
    if (!error) {
      return NextResponse.redirect(
        `${origin}/auth/login?confirmed=1&next=${encodeURIComponent(next)}`
      )
    }
    return NextResponse.redirect(`${origin}/auth/login?error=verify_failed`)
  }

  // ── Password-recovery flow: admin.generateLink(type:'recovery') ───────────
  // Forward the token_hash to the reset-password page, which verifies it and
  // lets the user set a new password.
  if (tokenHash && (type === 'recovery' || searchParams.get('mode') === 'recovery')) {
    const target = new URL(`/auth/reset-password`, origin)
    target.searchParams.set('token_hash', tokenHash)
    if (token) target.searchParams.set('token', token)
    target.searchParams.set('type', 'recovery')
    if (next) target.searchParams.set('next', next)
    return NextResponse.redirect(target.toString())
  }

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
