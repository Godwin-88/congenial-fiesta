import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function updateSession(request: NextRequest) {
  const supabase = await createClient()

  const response = NextResponse.next({
    request,
  })

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
