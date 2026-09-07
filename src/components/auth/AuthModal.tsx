'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUpWithEmail, signInWithEmail, resetPassword, sendOtpCode, verifyOtpCode } from '@/lib/auth/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
}

type AuthMode = 'signin' | 'signup'

export default function AuthModal({ isOpen, onClose, redirectTo }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [otpMode, setOtpMode] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const router = useRouter()

  const handleSignUp = async () => {
    setEmailError(null)
    if (!email.trim() || !password.trim()) {
      setEmailError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters.')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await signUpWithEmail(email, password, redirectTo)
      if (result.error) {
        setEmailError(result.error)
      } else if (result.needsVerification) {
        setVerificationSent(true)
      } else {
        onClose()
        router.push(redirectTo ?? '/dashboard')
      }
    } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = async () => {
    setEmailError(null)
    if (!email.trim() || !password.trim()) {
      setEmailError('Please enter your email and password.')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await signInWithEmail(email, password)
      if (result.error) {
        setEmailError(result.error)
      } else {
        onClose()
        router.push(redirectTo ?? '/dashboard')
      }
      } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setEmailError('Please enter your email.')
      return
    }
    setEmailError(null)
    setIsSubmitting(true)
    try {
      const result = await sendOtpCode(email)
      if (result.error) {
        setEmailError(result.error)
      } else {
        setOtpSent(true)
      }
    } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 8) {
      setEmailError('Please enter the 8-digit code.')
      return
    }
    setEmailError(null)
    setIsSubmitting(true)
    try {
      const result = await verifyOtpCode(email, otpCode)
      if (result.error) {
        setEmailError(result.error)
      } else {
        onClose()
        router.push(redirectTo ?? '/dashboard')
      }
    } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    setEmailError(null)
    if (!email.trim()) {
      setEmailError('Please enter your email.')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await resetPassword(email.trim())
      if (result.error) {
        setEmailError(result.error)
      } else {
        setResetSent(true)
      }
    } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setEmailError(null)
    setVerificationSent(false)
    setShowReset(false)
    setResetSent(false)
    setOtpMode(false)
    setOtpCode('')
    setOtpSent(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription>
            {authMode === 'signup'
              ? 'Join the FweezyTech community to rate devices, leave comments, save comparisons, and more.'
              : 'Sign in to access your comparisons, comments, and ratings.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4">
          {/* Auth Mode Toggle */}
          <Tabs
            value={authMode}
            onValueChange={(v) => {
              setAuthMode(v as AuthMode)
              resetForm()
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>

            {/* ── SIGN UP ──────────────────────────────── */}
            <TabsContent value="signup" className="mt-4 space-y-4">
              {verificationSent ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                  <p className="text-sm text-green-400">
                    Check your email — we sent you a verification link!
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Once verified, you can sign in with your email and password.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSubmitting) handleSignUp()
                      }}
                      className="w-full"
                    />
                    <Input
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSubmitting) handleSignUp()
                      }}
                      className="w-full"
                    />
                    <Button
                      onClick={handleSignUp}
                      disabled={isSubmitting || !email.trim() || !password.trim()}
                      className="w-full"
                    >
                      {isSubmitting ? 'Creating account...' : 'Create Account'}
                    </Button>
                    {emailError && (
                      <p className="text-sm text-red-400">{emailError}</p>
                    )}
                    </div>
                  </>
              )}
            </TabsContent>

            {/* ── SIGN IN ──────────────────────────────── */}
            <TabsContent value="signin" className="mt-4 space-y-4">
              {!showReset ? (
                <>
                  {/* Email & Password Sign In */}
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSubmitting) handleSignIn()
                      }}
                      className="w-full"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSubmitting) handleSignIn()
                      }}
                      className="w-full"
                    />
                    <Button
                      onClick={handleSignIn}
                      disabled={isSubmitting || !email.trim() || !password.trim()}
                      className="w-full"
                    >
                      {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                    {emailError && (
                      <p className="text-sm text-red-400">{emailError}</p>
                    )}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowReset(true)}
                      className="text-sm text-brand-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-popover px-2 text-muted-foreground">or via email</span>
                    </div>
                  </div>

                  {!otpMode ? (
                    <div className="text-center">
                      <button
                        onClick={() => setOtpMode(true)}
                        className="text-sm text-brand-primary hover:underline py-2"
                      >
                        Sign in with a code sent to your email
                      </button>
                    </div>
                  ) : (
                    /* ── OTP CODE SIGN-IN ───────────────────────────── */
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {otpSent
                            ? `Enter the 8-digit code sent to ${email}.`
                            : 'Enter your email to receive an 8-digit sign-in code.'}
                        </p>
                      </div>

                      {!otpSent ? (
                        <>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isSubmitting) handleSendOtp()
                            }}
                            className="w-full"
                          />
                          <Button
                            onClick={handleSendOtp}
                            disabled={isSubmitting || !email.trim()}
                            className="w-full"
                          >
                            {isSubmitting ? 'Sending...' : 'Send Code'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="00000000"
                            required
                            className="w-full text-center text-2xl tracking-[0.2em]"
                          />
                          <Button
                            onClick={handleVerifyOtp}
                            disabled={isSubmitting || otpCode.length < 8}
                            className="w-full"
                          >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                          </Button>
                          <div className="text-center">
                            <button
                              onClick={async () => {
                                setOtpCode('')
                                await handleSendOtp()
                              }}
                              disabled={isSubmitting}
                              className="text-sm text-brand-primary hover:underline disabled:opacity-50"
                            >
                              Resend code
                            </button>
                          </div>
                        </>
                      )}

                      <div className="text-center">
                        <button
                          onClick={() => { setOtpMode(false); setOtpCode(''); setOtpSent(false); setEmailError(null) }}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Back to password sign in
                        </button>
                    </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── INLINE RESET PASSWORD ─────────────────────── */
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-foreground">Reset your password</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter your email and we'll send you a link to set a new password.
                    </p>
                  </div>

                  {resetSent ? (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                      <p className="text-sm text-green-400">
                        Check your email — we sent you a password reset link!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSubmitting) handleResetPassword()
                        }}
                        className="w-full"
                      />
                      <Button
                        onClick={handleResetPassword}
                        disabled={isSubmitting || !email.trim()}
                        className="w-full"
                      >
                        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                      {emailError && (
                        <p className="text-sm text-red-400">{emailError}</p>
                      )}
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      onClick={() => setShowReset(false)}
                      className="text-sm text-brand-primary hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}