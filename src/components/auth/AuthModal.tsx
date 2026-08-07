'use client'

import { useState } from 'react'
import { signInWithMagicLink, signUpWithEmail, signInWithEmail } from '@/lib/auth/actions'
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
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const handleMagicLink = async () => {
    setEmailError(null)
    setIsSubmitting(true)
    try {
      const result = await signInWithMagicLink(email, redirectTo)
      if (result.error) {
        setEmailError(result.error)
      } else {
        setEmailSent(true)
      }
    } catch {
      setEmailError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
    setEmailSent(false)
    setEmailError(null)
    setVerificationSent(false)
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
                  onClick={() => {
                    resetForm()
                    onClose()
                    window.location.href = '/auth/login'
                  }}
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

              {!emailSent ? (
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitting) handleMagicLink()
                    }}
                    className="w-full"
                  />
                  <Button
                    onClick={handleMagicLink}
                    disabled={isSubmitting || !email.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Magic Link'}
                  </Button>
                  {emailError && (
                    <p className="text-sm text-red-400">{emailError}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                  <p className="text-sm text-green-400">
                    Check your email — we sent you a link!
                  </p>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                No password needed for magic link. We don't sell your data.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}