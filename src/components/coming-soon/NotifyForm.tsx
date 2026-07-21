'use client'

import { useState } from 'react'

export default function NotifyForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (email.length > 254) {
      setError('Email address is too long')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Something went wrong')
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-6 text-center">
        <p className="text-lg font-semibold text-green-800 dark:text-green-300">
          ✅ You're on the list!
        </p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          We'll let you know when Fweezy drops his next review.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <label htmlFor="notify-email" className="block text-center text-sm font-medium text-foreground/70 mb-3">
        Get notified when any upcoming review drops
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-describedby={error ? 'notify-error' : undefined}
          className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="h-11 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Notify Me'}
        </button>
      </div>
      {error && (
        <p id="notify-error" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}