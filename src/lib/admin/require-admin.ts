'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AdminUser } from '@/types/cms'

/**
 * Require admin authentication for API routes.
 * Must be called as the FIRST operation in any admin API route.
 * Returns the admin user record if authorized, or throws a redirect/error.
 */
export async function requireAdminAuth(): Promise<AdminUser> {
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Check admin_users table using service role
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!adminUser) {
    throw new Error('Forbidden')
  }

  return adminUser as AdminUser
}

/**
 * Get the admin user for server component pages.
 * Returns null if not authenticated or not an admin user.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return adminUser as AdminUser | null
}

/**
 * Create a Supabase admin client (service role) for write operations.
 */
export function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
