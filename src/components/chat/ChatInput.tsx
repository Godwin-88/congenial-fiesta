'use client'

import { useChat2 } from '@/context/ChatContext'

export default function ChatInput() {
  const { input, setInput, handleSubmit, isLoading, rateLimitInfo, error, setShowAuthModal } = useChat2()

  const isDisabled = isLoading || (rateLimitInfo?.rateLimited ?? false)

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isDisabled) {
        handleSubmit()
      }
    }
  }

  return (
    <div className="space-y-2">
      <form
        role="form"
        aria-label="Chat with Fweezy AI"
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim() && !isDisabled) {
            handleSubmit()
          }
        }}
        className="flex gap-2 items-end"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about any device, comparison, or review…"
          disabled={isDisabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 min-h-[40px] max-h-[100px]"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isDisabled}
          aria-label="Send message"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-primary/90 transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>

      {rateLimitInfo && (
        <div className="text-xs text-muted-foreground text-center">
          {rateLimitInfo.rateLimited ? (
            <span className="text-destructive">{rateLimitInfo.error}</span>
          ) : rateLimitInfo.isGuest && rateLimitInfo.remaining < 5 ? (
            <span className="text-amber-400">
              ⚠️ {rateLimitInfo.remaining} messages left as guest —{' '}
              <button
                type="button"
                className="underline hover:text-brand-primary"
                onClick={() => setShowAuthModal(true)}
              >
                Sign in for more
              </button>
            </span>
          ) : null}
        </div>
      )}

      {error && !rateLimitInfo?.rateLimited && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  )
}