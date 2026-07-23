'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/auth/AuthModal'

interface SaveComparisonButtonProps {
  deviceSlugs: string[]
}

export default function SaveComparisonButton({ deviceSlugs }: SaveComparisonButtonProps) {
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user) {
      setShowAuth(true)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/community/comparisons/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Comparison: ${deviceSlugs.slice(0, 2).join(' vs ')}`,
          deviceSlugs,
        }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
      >
        <svg
          className="h-4 w-4"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Comparison'}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  )
}