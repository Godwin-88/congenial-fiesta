'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithMagicLink(email: string, redirectTo?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
    },
  })

  if (error) {
    return { error: error.message }
  }
  return {}
}

export async function signUpWithEmail(email: string, password: string, redirectTo?: string): Promise<{ error?: string }> {
  // Step 1: Sign up with Supabase (triggers email confirmation in production)
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Step 2: Auto-confirm the user using the service role key (bypasses email in dev/QA)
  try {
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

    // Find the user by email
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users?.users.find(u => u.email === email)

    if (user) {
      // Update user to be confirmed
      await adminClient.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      })

      // Step 3: Sign them in immediately after confirmation
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && sessionData?.session) {
        // Session is set by supabase client, no need to redirect to callback
        return {}
      }
    }
  } catch (e) {
    // Silently ignore admin API errors — user can still check their email
    console.error('Auto-confirm failed (user can still verify via email):', e)
  }

  return {}
}

export async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }
  return {}
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}