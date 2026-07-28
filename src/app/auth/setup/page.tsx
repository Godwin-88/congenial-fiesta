'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/admin/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminSetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message?: string; error?: string } | null>(null)

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/seed-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName.trim() || 'Admin User',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ message: data.message || 'Admin user created successfully!' })
      } else {
        setResult({ error: data.error || 'Setup failed' })
      }
    } catch {
      setResult({ error: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
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
          Admin Setup
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Create the first admin user for FweezyTech CMS.
        </p>

        {result?.error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {result.error}
          </div>
        )}

        {result?.message && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            {result.message}
            <br />
            <Link href="/auth/admin-login" className="text-brand-primary hover:underline mt-2 inline-block">
              Go to Admin Login →
            </Link>
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@fweezytech.com"
            required
            className="w-full"
          />
          <Input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Display Name"
            className="w-full"
          />
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating…' : 'Create Admin User'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an admin?{' '}
          <Link href="/auth/admin-login" className="text-brand-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
