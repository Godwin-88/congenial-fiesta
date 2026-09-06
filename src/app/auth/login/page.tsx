'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpWithEmail, resetPassword, sendOtpCode, verifyOtpCode } from '@/lib/auth/actions'
import Link from 'next/link'
import Logo from '@/components/admin/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const justConfirmed = searchParams.get('confirmed') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showReset, setShowReset] = useState(false)
  const [resending, setResending] = useState(false)
  const [otpMode, setOtpMode] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')

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
          setInfo('Account created! We sent a confirmation link to your email. Click it, then sign in with your password.')
          setMode('signin')
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

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setError('')
    setSending(true)
    try {
      const result = await sendOtpCode(email.trim(), next)
      if (result.error) {
        setError(result.error)
      } else {
        setOtpSent(true)
        setOtpMode(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError('Please enter the code from your email.')
      return
    }
    setError('')
    setSending(true)
    try {
      const result = await verifyOtpCode(email.trim(), otpCode.trim())
      if (result.error) {
        setError(result.error)
      } else {
        router.push(next)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleResendOtp = async () => {
    setOtpCode('')
    await handleSendOtp()
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
        {justConfirmed && !info && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            ✓ Your email is confirmed. Sign in with your password to continue.
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

           <TabsContent value="signin" className="mt-0 space-y-4">
             {!otpMode ? (
               <>
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

                 <div className="relative py-2">
                   <div className="absolute inset-0 flex items-center">
                     <span className="w-full border-t border-border" />
                   </div>
                   <div className="relative flex justify-center text-xs">
                     <span className="bg-background px-2 text-muted-foreground">or</span>
                   </div>
                 </div>

                 <div className="text-center">
                   <button
                     onClick={() => { setOtpMode(true); setOtpSent(false); setOtpCode('') }}
                     className="text-sm text-brand-primary hover:underline"
                   >
                     Sign in with a code sent to your email
                   </button>
                   <div className="mt-2">
                     <button
                       onClick={() => setShowReset(!showReset)}
                       className="text-sm text-brand-primary hover:underline"
                     >
                       Forgot password?
                     </button>
                   </div>
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
               </>
             ) : (
               <div className="space-y-4">
                 <div className="text-center">
                   <h3 className="text-sm font-semibold text-foreground">
                     {otpSent ? 'Enter your code' : 'Sign in with OTP'}
                   </h3>
                   <p className="mt-1 text-xs text-muted-foreground">
                     {otpSent
                       ? `We sent an 8-digit code to ${email}.`
                       : 'Enter your email and we’ll send you an 8-digit sign-in code.'}
                   </p>
                 </div>

                 {!otpSent ? (
                   <div className="space-y-3">
                     <Input
                       type="email"
                       value={email}
                       onChange={e => setEmail(e.target.value)}
                       placeholder="you@example.com"
                       required
                       className="w-full"
                     />
                     <Button
                       onClick={handleSendOtp}
                       disabled={sending || !email.trim()}
                       className="w-full"
                     >
                       {sending ? 'Sending…' : 'Send Code'}
                     </Button>
                   </div>
                 ) : (
                   <form
                     onSubmit={async (e) => {
                       e.preventDefault()
                       await handleVerifyOtp()
                     }}
                     className="space-y-3"
                   >
                     <Input
                       type="text"
                       inputMode="numeric"
                       maxLength={8}
                       value={otpCode}
                       onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                       placeholder="00000000"
                       required
                       className="w-full text-center text-2xl tracking-[0.2em]"
                     />
                     <Button
                       type="submit"
                       disabled={sending || otpCode.length < 8}
                       className="w-full"
                     >
                       {sending ? 'Signing in…' : 'Sign In'}
                     </Button>
                   </form>
                 )}

                 <div className="text-center">
                   <button
                     onClick={handleResendOtp}
                     disabled={sending}
                     className="text-sm text-brand-primary hover:underline disabled:opacity-50"
                   >
                     {otpSent ? 'Resend code' : ''}
                   </button>
                 </div>

                 <div className="text-center">
                   <button
                     onClick={() => { setOtpMode(false); setOtpSent(false); setOtpCode('') }}
                     className="text-sm text-muted-foreground hover:text-foreground"
                   >
                     Back to password sign in
                   </button>
                 </div>
               </div>
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
              {info && (
                <button
                  type="button"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true)
                    setError('')
                    try {
                      const { resendConfirmationLink } = await import('@/lib/auth/actions')
                      const result = await resendConfirmationLink(email.trim())
                      if (result.error) {
                        setError(result.error)
                      } else {
                        setError('A fresh confirmation link has been sent to your email.')
                      }
                    } catch {
                      setError('Something went wrong. Please try again.')
                    } finally {
                      setResending(false)
                    }
                  }}
                  className="w-full text-center text-sm text-brand-primary hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend confirmation link'}
                </button>
              )}
            </form>
          </TabsContent>
        </Tabs>

        
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
