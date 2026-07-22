'use client'

import { useChat2 } from '@/context/ChatContext'

const SUGGESTED_QUESTIONS = [
  "What's the best flagship phone under KES 100,000?",
  "Compare Samsung Galaxy S25 Ultra vs iPhone 16 Pro Max",
  "What has Fweezy reviewed recently?",
  "Best budget 5G phone in Kenya?",
  "What's the Fweezy Score for the Pixel 9 Pro?",
  "Show me upcoming reviews",
]

export default function SuggestedQuestions() {
  const { setInput } = useChat2()

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">Suggested questions</p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setInput(q)
              // Focus the textarea after setting input
              const textarea = document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement
              textarea?.focus()
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-brand-primary/40 text-muted-foreground hover:bg-brand-primary/10 hover:text-foreground transition-colors whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}