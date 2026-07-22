'use client'

import ReactMarkdown from 'react-markdown'
import NavigationCard from './NavigationCard'
import type { NavigationCard as NavCard } from '@/types/chat'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({
  message,
  cards,
}: {
  message: Message
  cards?: NavCard[]
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-white">F</span>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
        {isUser ? (
          <div className="bg-brand-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div className="bg-[#1F2937] text-white rounded-2xl rounded-tl-sm px-4 py-2.5">
            {message.content ? (
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <strong className="text-brand-primary">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-brand-primary underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mt-1 space-y-1">{children}</ul>
                  ),
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex gap-1 py-1">
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            {cards && cards.length > 0 && (
              <div className="mt-3 space-y-2">
                {cards.map((card, i) => (
                  <NavigationCard key={i} card={card} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}