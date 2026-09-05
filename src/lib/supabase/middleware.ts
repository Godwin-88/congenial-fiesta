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

  return response
}
