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
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${serverUrl}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
    })

  if (error) {
    return { error: error.message }
  }
  return {}
}

export async function signUpWithEmail(email: string, password: string, redirectTo?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${serverUrl}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return {}
  }

  try {
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )

    const userId = data?.user?.id

    if (userId) {
      await adminClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })

      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && sessionData?.session) {
        return {}
      }
    }
  } catch (e) {
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