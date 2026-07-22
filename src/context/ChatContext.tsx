'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { generateSessionId } from '@/lib/chat/session-id'
import type { NavigationCard, RateLimitInfo } from '@/types/chat'

const SESSION_STORAGE_KEY = 'fweezytech:chat-session-id'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChatContextType = {
  messages: ChatMessage[]
  input: string
  setInput: (v: string) => void
  handleSubmit: (e?: React.FormEvent) => void
  isLoading: boolean
  error: string | null
  navigationCards: Record<string, NavigationCard[]>
  rateLimitInfo: RateLimitInfo | null
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  clearChat: () => void
  sessionId: string
  showAuthModal: boolean
  setShowAuthModal: (v: boolean) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navigationCards, setNavigationCards] = useState<Record<string, NavigationCard[]>>({})
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      setSessionId(stored)
    } else {
      const newId = generateSessionId()
      localStorage.setItem(SESSION_STORAGE_KEY, newId)
      setSessionId(newId)
    }
  }, [])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)
    setIsLoading(true)
    setRateLimitInfo(null)

    const userMsgId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          sessionId,
        }),
      })

      const remaining = response.headers.get('X-Rate-Limit-Remaining')
      const isGuest = response.headers.get('X-Is-Guest')
      const cardsHeader = response.headers.get('X-Nav-Cards')

      if (remaining !== null) {
        setRateLimitInfo({
          remaining: parseInt(remaining),
          isGuest: isGuest === 'true',
        })
      }

      if (cardsHeader) {
        try {
          const cards: NavigationCard[] = JSON.parse(cardsHeader)
          setNavigationCards(prev => ({ ...prev, __pending__: cards }))
        } catch {
          // ignore
        }
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data.rateLimited) {
          setRateLimitInfo({
            remaining: 0,
            isGuest: data.isGuest,
            rateLimited: true,
            error: data.error,
          })
          setError(data.error)
          setIsLoading(false)
          return
        }
        throw new Error(data.error || `Request failed (${response.status})`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantId = crypto.randomUUID()

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            const text = line.slice(2)
            assistantContent += text
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            )
          }
        }
      }

      setNavigationCards(prev => {
        const cards = prev['__pending__']
        if (!cards) return prev
        const { __pending__, ...rest } = prev
        return { ...rest, [assistantId]: cards }
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setError(msg)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, sessionId])

  const clearChat = useCallback(() => {
    setMessages([])
    setNavigationCards({})
    setRateLimitInfo(null)
    setError(null)
    const newId = generateSessionId()
    localStorage.setItem(SESSION_STORAGE_KEY, newId)
    setSessionId(newId)
  }, [])

  return (
    <ChatContext.Provider value={{
      messages,
      input,
      setInput,
      handleSubmit,
      isLoading,
      error,
      navigationCards,
      rateLimitInfo,
      isOpen,
      setIsOpen,
      clearChat,
      sessionId,
      showAuthModal,
      setShowAuthModal,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat2(): ChatContextType {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat2 must be used within ChatProvider')
  return ctx
}