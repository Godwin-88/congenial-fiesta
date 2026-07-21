import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/[...slug]|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
