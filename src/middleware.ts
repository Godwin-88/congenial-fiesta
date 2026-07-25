import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")
  const isPayloadApi = pathname.startsWith("/api/")

  // Set x-pathname so root layout can detect the route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Skip Supabase session refresh for Payload admin & API routes
  if (isAdminRoute || isPayloadApi) {
    return response
  }

  // Refresh Supabase session for public routes
  const { updateSession } = await import("@/lib/supabase/middleware")
  const supabaseResponse = await updateSession(request)

  // Merge cookies from supabase response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie)
  })

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
