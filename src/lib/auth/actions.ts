'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
