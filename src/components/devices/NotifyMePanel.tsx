'use client'
import { useState } from 'react'
import { Bell, Check } from 'lucide-react'

interface NotifyMePanelProps {
  deviceSlug: string
  deviceName: string
  label?: string
}

export default function NotifyMePanel({ deviceSlug, deviceName, label }: NotifyMePanelProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    setError('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/devices/${deviceSlug}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error ?? 'Something went wrong')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
        <span className="inline-flex items-center gap-2 font-medium">
          <Check size={16} /> You&rsquo;re on the list!
        </span>
        <p className="mt-1 text-green-500/80">
          We&rsquo;ll email you when {deviceName === 'This device' ? 'this device' : deviceName} is available.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bell size={16} className="text-amber-400" />
        {label ?? `Where available — get notified when ${deviceName} drops`}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand-primary"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="h-10 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '…' : 'Notify Me'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}