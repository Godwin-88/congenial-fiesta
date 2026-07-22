'use client'

import { useEffect, useRef } from 'react'
import { useChat2 } from '@/context/ChatContext'
import ChatHeader from './ChatHeader'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import SuggestedQuestions from './SuggestedQuestions'

export default function ChatWindow({ variant }: { variant: 'bubble' | 'page' }) {
  const { messages, isLoading, navigationCards } = useChat2()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  return (
    <div className="flex flex-col h-full">
      <ChatHeader variant={variant} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && <SuggestedQuestions />}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            cards={navigationCards[msg.id]}
          />
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <ChatMessage
            message={{
              id: '__loading__',
              role: 'assistant',
              content: '',
            }}
            cards={[]}
          />
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3">
        <ChatInput />
      </div>
    </div>
  )
}