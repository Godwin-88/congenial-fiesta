'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpWithEmail, resetPassword } from '@/lib/auth/actions'
import Link from 'next/link'
import Logo from '@/components/admin/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        router.push(next)
        return
      }
      setLoading(false)
    }
    checkSession()
  }, [router, next])

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSending(true)
    try {
      const supabase = createClient()
      if (mode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password, next)
        if (result.error) {
          setError(result.error)
        } else if (result.needsVerification) {
          setInfo('Account created! Please check your email to verify your account.')
        } else {
          router.refresh()
          router.push(next)
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) {
          setError(signInError.message)
        } else {
          router.push(next)
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="scale-150">
            <Logo />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-2 font-heading">
          {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {mode === 'signup'
            ? 'Join the FweezyTech community to rate devices, leave comments, save comparisons, and more.'
            : 'Sign in to access your comparisons, comments, and ratings.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            {info}
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-0 space-y-4">
            <form onSubmit={handleEmailPassword} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full"
              />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full"
              />
               <Button
                 type="submit"
                 disabled={sending}
                 className="w-full"
               >
                 {sending ? 'Signing in…' : 'Sign In'}
               </Button>
             </form>

             <div className="text-center">
               <button
                 onClick={() => setShowReset(!showReset)}
                 className="text-sm text-brand-primary hover:underline"
               >
                 Forgot password?
               </button>
             </div>

             {showReset && (
               <form
                 onSubmit={async (e) => {
                   e.preventDefault()
                   setError('')
                   setSending(true)
                   try {
                     const result = await resetPassword(email.trim())
                     if (result.error) {
                       setError(result.error)
                     } else {
                       setError('If that email exists, a reset link has been sent.')
                       setShowReset(false)
                     }
                   } catch {
                     setError('Something went wrong. Please try again.')
                   } finally {
                     setSending(false)
                   }
                 }}
                 className="space-y-3"
               >
                 <p className="text-xs text-muted-foreground">
                   Enter your email to receive a password reset link.
                 </p>
                 <Button
                   type="submit"
                   disabled={sending || !email.trim()}
                   variant="outline"
                   className="w-full"
                 >
                   {sending ? 'Sending…' : 'Send Reset Link'}
                 </Button>
               </form>
             )}
          </TabsContent>

          <TabsContent value="signup" className="mt-0 space-y-4">
            <form onSubmit={handleEmailPassword} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full"
              />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                required
                minLength={6}
                className="w-full"
              />
              <Button
                type="submit"
                disabled={sending}
                className="w-full"
              >
                {sending ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Admin access? <Link href="/auth/admin-login" className="text-brand-primary hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
