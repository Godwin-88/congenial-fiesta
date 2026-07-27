'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/admin/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const res = await fetch('/api/admin/auth/me')
        if (res.ok) {
          router.push(next)
          return
        }
      }
      setLoading(false)
    }
    checkSession()
  }, [router, next])

  const handleGoogleSignIn = async () => {
    setError('')
    setSending(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (signInError) {
        setError(signInError.message)
        setSending(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Failed to sign in with Google')
      setSending(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setError('')
    setSending(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (signInError) {
        setError(signInError.message)
      } else {
        setMagicLinkSent(true)
      }
    } catch {
      setError('Failed to send magic link')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="scale-150">
            <Logo />
          </div>
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-8 font-['Space_Grotesk']">
          Sign in to FweezyTech CMS
        </h1>

        {magicLinkSent ? (
          <div className="bg-[#1F2937] rounded-lg border border-green-500/30 p-6 text-center">
            <div className="text-4xl mb-3">📧</div>
            <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
            <p className="text-sm text-gray-400">
              A magic link has been sent to <strong className="text-white">{email}</strong>.
              Click the link in the email to sign in.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={sending}
              className="w-full flex items-center justify-center gap-3 px-4 py-3
                         bg-white text-gray-900 rounded-lg hover:bg-gray-100
                         transition-colors font-medium text-sm disabled:opacity-40 mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#374151]" />
              <span className="text-xs text-gray-500">or</span>
              <div className="flex-1 h-px bg-[#374151]" />
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#1F2937] text-white rounded-lg px-4 py-3 text-sm
                           border border-[#374151] focus:border-[#0066FF] focus:outline-none
                           placeholder-gray-600"
              />
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={sending || !email.trim()}
                className="w-full py-3 px-4 rounded-lg bg-[#0066FF] text-white
                           hover:bg-blue-500 transition-colors text-sm font-medium
                           disabled:opacity-40"
              >
                {sending ? 'Sending…' : 'Send Magic Link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}