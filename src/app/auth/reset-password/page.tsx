'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/admin/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  const [codeVerified, setCodeVerified] = useState(!!(tokenHash || token))

  useEffect(() => {
    if ((tokenHash || token) && !codeVerified) {
      const verifyCode = async () => {
        setLoading(true)
        try {
          const supabase = createClient()
          // Recovery links generated via the Admin API ("recovery") must be
          // verified with type: 'recovery'; plain Supabase email links use 'email'.
          const verifyType = linkType === 'recovery' ? 'recovery' : 'email'
          const { error: verifyError } = await supabase.auth.verifyOtp(
            tokenHash
              ? { token_hash: tokenHash, type: verifyType }
              : { email, token, type: verifyType }
          )
          if (verifyError) {
            setError(verifyError.message)
          } else {
            setCodeVerified(true)
          }
        } catch {
          setError('Something went wrong. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      verifyCode()
    }
  }, [tokenHash, token, email, codeVerified, linkType])

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
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
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

  if (!codeVerified && !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <div className="scale-150">
              <Logo />
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-4">Reset Password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This link is invalid or has expired. Please request a new password reset link.
          </p>
          <Button onClick={() => router.push('/auth/login')}>
            Back to Sign In
          </Button>
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
