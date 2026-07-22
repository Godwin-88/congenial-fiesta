'use client'

import { useState } from 'react'
import { signInWithGoogle, signInWithMagicLink } from '@/lib/auth/actions'
import { Dialog } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
}

export default function AuthModal({ isOpen, onClose, redirectTo }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(redirectTo)
    } catch {
      // redirect will handle navigation
    }
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Join the FweezyTech Community
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to rate devices, leave comments, and get notified of new reviews.
          </p>
        </div>

        <Tabs defaultValue="google" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="google" className="flex-1">
              Google
            </TabsTrigger>
            <TabsTrigger value="magic" className="flex-1">
              Magic Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="mt-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full gap-2"
              variant="outline"
            >
              <User className="h-5 w-5" />
              Continue with Google
            </Button>
          </TabsContent>

          <TabsContent value="magic" className="mt-4 space-y-3">
            {!emailSent ? (
              <>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      handleMagicLink()
                    }
                  }}
                />
                <Button
                  onClick={handleMagicLink}
                  disabled={isSubmitting || !email.trim()}
                  className="w-full"
                >
                  {isSubmitting ? 'Sending...' : 'Send Magic Link'}
                </Button>
                {emailError && (
                  <p className="text-sm text-red-400">{emailError}</p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                <p className="text-sm text-green-400">
                  Check your email — we sent you a link!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No password needed. We don&apos;t sell your data.
        </p>
      </div>
    </Dialog>
  )
}
