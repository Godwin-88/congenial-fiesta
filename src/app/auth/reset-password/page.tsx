'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/admin/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Single shared client so the recovery session established by verifyOtp is
// still attached when updateUser runs. Creating a fresh client per call would
// lose the session and fail with "Auth session missing!".
let sharedSupabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!sharedSupabase) sharedSupabase = createClient()
  return sharedSupabase
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const tokenHash = searchParams.get('token_hash') ?? ''
  const linkType = searchParams.get('type') ?? 'email'
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [verified, setVerified] = useState(false)

  // ALWAYS verify the token before showing the form. This is what creates the
  // recovery session. The old code pre-set codeVerified = true when a token
  // existed, so verifyOtp never ran and updateUser had no session.
  useEffect(() => {
    if ((tokenHash || token) && !verified) {
      const verifyCode = async () => {
        setLoading(true)
        try {
          // Recovery links generated via the Admin API carry `token` / `token_hash`
          // in the query string. BOTH are the hashed token that GoTrue's
          // `verifyOtp` expects as `token_hash` (link tokens are NOT the 6-digit
          // OTP form `{ email, token }`). Passing it as `token_hash` with
          // `type: 'recovery'` is what actually establishes the session.
          const verifyType = linkType === 'recovery' ? 'recovery' : 'email'
          const { error: verifyError } = await getSupabase().auth.verifyOtp({
            token_hash: tokenHash || token,
            type: verifyType,
          })
          if (verifyError) {
            setError(verifyError.message)
          } else {
            setVerified(true)
          }
        } catch {
          setError('Something went wrong. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      verifyCode()
    }
  }, [tokenHash, token, email, linkType, verified])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      // Same client instance as verifyOtp above — the recovery session is
      // attached here, so updateUser resolves with the session present.
      const { error: updateError } = await getSupabase().auth.updateUser({
        password,
      })
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <div className="scale-150">
              <Logo />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-4">Password Reset</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your password has been updated. You&apos;re now signed in with your new password.
          </p>
          <Button onClick={() => router.push('/')}>
            Continue to FweezyTech
          </Button>
        </div>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <div className="scale-150">
              <Logo />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-4">Reset Password</h1>
          {error ? (
            <p className="text-sm text-red-400 mb-6">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground mb-6">
              This link is invalid or has expired. Please request a new password reset link.
            </p>
          )}
          <div className="space-y-2">
            <Button onClick={() => router.push('/auth/login')}>
              Back to Sign In
            </Button>
            <Button variant="ghost" onClick={() => router.push('/auth/login?forgot=1')}>
              Request a new link
            </Button>
          </div>
        </div>
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

        <h1 className="text-xl font-bold text-foreground text-center mb-2">
          Reset Your Password
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Enter a new password for your account.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full"
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
