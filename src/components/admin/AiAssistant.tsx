'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { NavigationCard } from '@/types/chat'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function getCurrentCollection(): { slug?: string; action?: 'list' | 'create' | 'edit' } {
  if (typeof window === 'undefined') return {}

  const path = window.location.pathname
  const match = path.match(/\/admin\/collections\/([^/]+)(?:\/(create|\w+))?/)
  if (!match) return {}

  const slug = match[1]
  const subpath = match[2]

  if (subpath === 'create') return { slug, action: 'create' }
  if (subpath) return { slug, action: 'edit' }
  return { slug, action: 'list' }
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navigationCards, setNavigationCards] = useState<Record<string, NavigationCard[]>>({})
  const [currentCollection, setCurrentCollection] = useState(getCurrentCollection())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Track collection changes via URL
  useEffect(() => {
    const checkCollection = () => setCurrentCollection(getCurrentCollection())
    window.addEventListener('popstate', checkCollection)

    const originalPushState = history.pushState
    history.pushState = function (...args) {
      originalPushState.apply(this, args)
      checkCollection()
    }

    return () => {
      window.removeEventListener('popstate', checkCollection)
      history.pushState = originalPushState
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage = input.trim()
      setInput('')
      setError(null)
      setIsLoading(true)

      const userMsgId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userMessage }])

      const collection = getCurrentCollection()

      try {
        const response = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: userMessage }],
            currentCollection: collection.slug,
            currentAction: collection.action,
          }),
        })

        const cardsHeader = response.headers.get('X-Nav-Cards')

        if (cardsHeader) {
          try {
            const cards: NavigationCard[] = JSON.parse(cardsHeader)
            setNavigationCards((prev) => ({ ...prev, __pending__: cards }))
          } catch {
            // ignore header parse errors
          }
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${response.status})`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let assistantContent = ''
        const assistantId = crypto.randomUUID()

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('0:')) {
              const text = line.slice(2)
              assistantContent += text
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)),
              )
            }
          }
        }

        setNavigationCards((prev) => {
          const cards = prev['__pending__']
          if (!cards) return prev
          const { __pending__, ...rest } = prev
          return { ...rest, [assistantId]: cards }
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        setError(msg)
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, messages],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const clearChat = () => {
    setMessages([])
    setNavigationCards({})
    setError(null)
  }

  const suggestionChips = [
    'How do I publish a new device?',
    'What fields are required for articles?',
    'Help me write an SEO description',
    'How is the Fweezy Score calculated?',
  ]

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isOpen ? '#EF4444' : '#0066FF',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 16px rgba(0,102,255,0.35)',
          zIndex: 9999,
          transition: 'background 0.2s ease, transform 0.2s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        {isOpen ? '+' : '🤖'}
      </button>

      {/* Slide-out panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          width: 380,
          maxHeight: 'calc(100vh - 120px)',
          background: 'var(--theme-elevation-0)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(16px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--theme-elevation-150)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--theme-elevation-800)',
                }}
              >
                Fweezy Assistant
              </div>
              <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                {currentCollection.slug
                  ? `Viewing: ${currentCollection.slug}`
                  : 'CMS Assistant'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={clearChat}
              title="Clear chat"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                padding: '4px 8px',
                borderRadius: 6,
                color: 'var(--theme-elevation-500)',
              }}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minHeight: 200,
            maxHeight: 400,
          }}
        >
          {messages.length === 0 && !isLoading && (
            <div style={{ padding: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--theme-elevation-500)',
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                Hi! I'm your CMS assistant. I can help you manage content, generate drafts, and navigate the admin panel. What would you like to do?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setInput(chip)
                      setTimeout(() => handleSubmit(), 50)
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      background: 'var(--theme-elevation-100)',
                      border: '1px solid var(--theme-elevation-150)',
                      borderRadius: 16,
                      cursor: 'pointer',
                      color: 'var(--theme-elevation-700)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--theme-elevation-150)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--theme-elevation-100)'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background:
                    msg.role === 'user'
                      ? '#0066FF'
                      : 'var(--theme-elevation-100)',
                  color:
                    msg.role === 'user'
                      ? '#ffffff'
                      : 'var(--theme-elevation-800)',
                  borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 12,
                }}
              >
                {msg.content || (msg.role === 'assistant' ? '…' : '')}
              </div>

              {/* Navigation cards for this message */}
              {navigationCards[msg.id] && navigationCards[msg.id].length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  {navigationCards[msg.id].map((card, i) => (
                    <a
                      key={i}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '6px 10px',
                        fontSize: 12,
                        background: 'rgba(0,102,255,0.08)',
                        border: '1px solid rgba(0,102,255,0.2)',
                        borderRadius: 8,
                        textDecoration: 'none',
                        color: 'var(--theme-elevation-700)',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{card.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                        {card.subtitle}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '4px 0' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#0066FF',
                  animation: 'aiPulse 1.2s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#0066FF',
                  animation: 'aiPulse 1.2s ease-in-out infinite 0.2s',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#0066FF',
                  animation: 'aiPulse 1.2s ease-in-out infinite 0.4s',
                }}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--theme-error)',
                background: 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--theme-elevation-150)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about the CMS..."
              rows={1}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: 8,
                background: 'var(--theme-elevation-50)',
                color: 'var(--theme-elevation-800)',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                maxHeight: 80,
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: !input.trim() || isLoading ? 'var(--theme-elevation-100)' : '#0066FF',
                color: !input.trim() || isLoading ? 'var(--theme-elevation-500)' : '#ffffff',
                border: 'none',
                borderRadius: 8,
                cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Keyframes for loading animation */}
      <style>{`
        @keyframes aiPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}