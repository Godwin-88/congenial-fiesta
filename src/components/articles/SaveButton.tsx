'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/auth/AuthModal'

interface SaveButtonProps {
  contentType: 'article' | 'device' | 'comparison'
  contentId: string
  metadata?: Record<string, unknown>
  className?: string
}

export default function SaveButton({ contentType, contentId, metadata = {}, className = '' }: SaveButtonProps) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  // Check if already saved
  useEffect(() => {
    if (!user) return
    fetch(`/api/user/saved?contentType=${contentType}&contentId=${contentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data?.length > 0) setIsSaved(true)
      })
      .catch(() => {})
  }, [user, contentType, contentId])

  const handleToggle = useCallback(async () => {
    if (!user) {
      setShowAuth(true)
      return
    }

    setLoading(true)
    try {
      if (isSaved) {
        const res = await fetch(`/api/user/saved?contentType=${contentType}&contentId=${contentId}`, {
          method: 'DELETE',
        })
        if (res.ok) setIsSaved(false)
      } else {
        const res = await fetch('/api/user/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_type: contentType, content_id: contentId, metadata }),
        })
        if (res.ok) setIsSaved(true)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user, isSaved, contentType, contentId, metadata])

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
          isSaved
            ? 'text-brand-primary'
            : 'text-muted-foreground hover:text-foreground'
        } ${className}`}
        aria-label={isSaved ? 'Remove from saved' : 'Save'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isSaved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {isSaved ? 'Saved' : 'Save'}
      </button>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  )
}