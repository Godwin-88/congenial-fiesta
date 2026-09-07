import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Supabase SSR auth cookies follow the pattern `sb-{project-ref}-auth-token`
 * (optionally split across `.0`, `.1` suffixes). If none are present there is
 * no session to refresh, so we can skip every auth round-trip entirely — this
 * is the hot path for anonymous traffic on public pages.
 */
function hasSessionCookies(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (!hasSessionCookies(request)) {
    // Anonymous traffic has no session to refresh. The homepage redirect is
    // handled here too (config redirects cannot see the auth state), so keep
    // the public `/` → `/videos` behavior.
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/videos', request.url))
    }
    return response
  }

  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return response
  }

  const expiresAt = session.expires_at
  if (expiresAt && expiresAt - Date.now() < 60 * 60 * 24 * 5) {
    try {
      await supabase.auth.refreshSession()
    } catch {
      // silently ignore refresh errors
    }
  }

  // Signal to the root layout (via proxy.ts) that the visitor is signed in so
  // it can render the signed-in "app" shell (left sidebar) instead of the
  // public header/footer.
  response.headers.set('x-user-authenticated', '1')

  // Signed-in users land on their dashboard, not the public homepage.
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
