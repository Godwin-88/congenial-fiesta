'use client'
import { useState } from 'react'
import { Link2, Send, MessageCircle } from 'lucide-react'

interface ShareRowProps {
  title: string
  /** Absolute URL of the device page, computed server-side (hydration-safe). */
  absoluteUrl: string
}

export default function ShareRow({ title, absoluteUrl }: ShareRowProps) {
  const [copied, setCopied] = useState(false)
  const encoded = encodeURIComponent(absoluteUrl)
  const text = encodeURIComponent(title)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Share</span>
      <button
        onClick={copy}
        title="Copy link"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
      >
        <Link2 size={14} />
        {copied ? 'Copied!' : 'Link'}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
      >
        <Send size={14} /> Post
      </a>
      <a
        href={`https://wa.me/?text=${text}%20${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
      >
        <MessageCircle size={14} /> WhatsApp
      </a>
    </div>
  )
}