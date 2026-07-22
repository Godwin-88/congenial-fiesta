'use client'

import { useChat2 } from '@/context/ChatContext'
import ChatWindow from '@/components/chat/ChatWindow'
import AuthModal from '@/components/auth/AuthModal'

const HELP_ITEMS = [
  { icon: '📱', text: 'Device recommendations by budget or use case' },
  { icon: '⚖️', text: 'Phone comparisons (or use the full compare tool)' },
  { icon: '⭐', text: 'Fweezy Score explanations' },
  { icon: '📺', text: 'Finding videos and articles' },
  { icon: '🗓️', text: 'Upcoming review schedule' },
  { icon: '📍', text: 'Navigating the website' },
]

const SIDEBAR_QUESTIONS = [
  "What's the best flagship phone under KES 100,000?",
  "Compare Samsung Galaxy S25 Ultra vs iPhone 16 Pro Max",
  "What's the Fweezy Score for the Pixel 9 Pro?",
  "Best budget 5G phone in Kenya?",
  "Show me upcoming reviews",
]

export default function ChatPageClient() {
  const { rateLimitInfo, setInput, showAuthModal, setShowAuthModal } = useChat2()

  return (
    <div className="flex h-full">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-border p-5 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center">
            <span className="text-lg font-bold text-white">F</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Ask Fweezy AI</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Your AI guide to FweezyTech. Ask anything about devices, reviews, comparisons, and Fweezy's content.
        </p>
        <div className="border-t border-border pt-4 mb-4">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">What I can help with</h3>
          <ul className="space-y-2">
            {HELP_ITEMS.map((item) => (
              <li key={item.text} className="flex items-start gap-2 text-sm text-foreground">
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rate limit info */}
        {rateLimitInfo && (
          <div className="border-t border-border pt-4 mb-4">
            <div className="text-xs text-muted-foreground">
              {rateLimitInfo.isGuest ? (
                <span>
                  Guest: {rateLimitInfo.remaining}/10 messages per hour —{' '}
                  <button
                    type="button"
                    className="underline hover:text-brand-primary"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in
                  </button>
                </span>
              ) : (
                <span>Signed in: {rateLimitInfo.remaining}/40 messages per hour</span>
              )}
            </div>
          </div>
        )}

        {/* Popular questions */}
        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Popular Questions</h3>
          <ul className="space-y-2">
            {SIDEBAR_QUESTIONS.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => {
                    setInput(q)
                    const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement
                    textarea?.focus()
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1">
        <ChatWindow variant="page" />
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectTo="/chat"
      />
    </div>
  )
}
