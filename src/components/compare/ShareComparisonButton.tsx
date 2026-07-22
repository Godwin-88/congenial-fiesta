'use client'

import { useState } from 'react'

interface ShareComparisonButtonProps {
  url?: string
}

export default function ShareComparisonButton({ url }: ShareComparisonButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const shareUrl = url ?? window.location.href
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      window.prompt('Copy this link:', shareUrl)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 4h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3m-3 0h-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3m-3 0L13 9m-6-3l6 3"
        />
      </svg>
      {copied ? 'Link copied!' : 'Share'}
    </button>
  )
}
