'use client'

import { useChat2 } from '@/context/ChatContext'

export default function ChatHeader({ variant }: { variant: 'bubble' | 'page' }) {
  const { clearChat, setIsOpen } = useChat2()

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center">
          <span className="text-sm font-bold text-white">F</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Fweezy AI</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Online</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            if (confirm('Start a new chat? This will clear the current conversation.')) {
              clearChat()
            }
          }}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {variant === 'bubble' && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Minimise chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}